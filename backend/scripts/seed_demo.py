"""Create and verify the demo projects through the API.

Honest projects are generated from the real PVGIS profile of their location
(slightly below the best case, with small month-to-month variation), so they
look realistic. The other projects are manipulated in different ways to show
what each verification layer catches.

Usage (from the backend folder):
    python scripts/seed_demo.py --owner 0xYourWallet
    python scripts/seed_demo.py --owner 0xYourWallet --base-url http://localhost:8000
"""

import argparse
import random

import httpx

DEFAULT_BASE_URL = "https://carboncredit-guardian.onrender.com"

# name, latitude, longitude, capacity (kWp), scenario
PROJECTS = [
    ("Malatya Solar Park", 38.35, 38.31, 1000, "honest"),
    ("Konya Karapinar Solar", 37.71, 33.55, 2000, "honest"),
    ("Antalya Sun Farm", 36.90, 30.70, 1500, "winter_inflated"),
    ("Izmir Coastal PV", 38.42, 27.14, 800, "overall_inflated"),
    ("Ankara Copy-Paste PV", 39.93, 32.86, 1200, "flat_fabricated"),
]

SCENARIO_NOTES = {
    "honest": "realistic data, should pass",
    "winter_inflated": "winter months doubled, physical layer should catch it",
    "overall_inflated": "every month +35%, annual physical limit should catch it",
    "flat_fabricated": "same value every month, AI layer should catch the missing seasonality",
}


def make_monthly(expected: list[float], scenario: str, rng: random.Random) -> list[float]:
    honest = [round(e * 0.92 * rng.uniform(0.96, 1.04)) for e in expected]
    if scenario == "honest":
        return honest
    if scenario == "winter_inflated":
        return [v * 2.2 if month in (1, 2, 11, 12) else v for month, v in enumerate(honest, start=1)]
    if scenario == "overall_inflated":
        return [round(e * 1.35) for e in expected]
    if scenario == "flat_fabricated":
        return [round(sum(honest) / 12)] * 12
    raise ValueError(scenario)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--owner", required=True, help="Wallet address that will receive minted credits")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL)
    args = parser.parse_args()

    rng = random.Random(2026)  # same demo data every run
    with httpx.Client(base_url=args.base_url, timeout=120) as client:
        client.get("/health").raise_for_status()  # wakes up Render's free instance
        for name, lat, lon, capacity, scenario in PROJECTS:
            expected = client.get(
                "/pvgis/expected", params={"lat": lat, "lon": lon, "capacity_kwp": capacity}
            )
            expected.raise_for_status()
            monthly = make_monthly(expected.json()["monthly_kwh"], scenario, rng)

            created = client.post(
                "/projects",
                json={
                    "name": name,
                    "latitude": lat,
                    "longitude": lon,
                    "capacity_kwp": capacity,
                    "owner_address": args.owner,
                    "monthly_kwh": monthly,
                },
            )
            created.raise_for_status()
            project_id = created.json()["id"]

            verified = client.post(f"/projects/{project_id}/verify")
            verified.raise_for_status()
            body = verified.json()
            v = body["verification"]
            print(f"#{project_id} {name} ({SCENARIO_NOTES[scenario]})")
            print(
                f"    status={body['status']}  risk={v['risk_score_bp'] / 100:.1f}%  "
                f"credits={v['credit_amount']}  physical={v['physical_anomaly_months']}  ai={v['ai_anomaly_months']}"
            )
            for reason in body["reasons"]:
                print(f"    - {reason}")


if __name__ == "__main__":
    main()