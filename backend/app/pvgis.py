"""Client for the EU JRC PVGIS API (PVcalc tool).

Given a location and installed capacity, returns the expected monthly
production of a grid-connected PV plant. We request optimal panel angles,
which gives the best-case (upper-bound) output for that location - exactly
what we need to check whether a reported production is physically possible.

Docs: https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis/getting-started-pvgis/api-non-interactive-service_en
"""

from dataclasses import dataclass
from functools import lru_cache

import httpx

PVGIS_URL = "https://re.jrc.ec.europa.eu/api/v5_3/PVcalc"
DEFAULT_SYSTEM_LOSS_PCT = 14.0  # PVGIS default


class PVGISError(Exception):
    """Raised when PVGIS is unreachable or returns an unexpected payload."""


@dataclass(frozen=True)
class ExpectedProduction:
    monthly_kwh: tuple[float, ...]  # Jan..Dec, average expected output
    monthly_sd_kwh: tuple[float, ...]  # Jan..Dec, year-to-year standard deviation
    annual_kwh: float


def parse_pvcalc_response(data: dict) -> ExpectedProduction:
    """Extract monthly and annual output from a PVcalc JSON response."""
    try:
        monthly = sorted(data["outputs"]["monthly"]["fixed"], key=lambda m: m["month"])
        totals = data["outputs"]["totals"]["fixed"]
        if len(monthly) != 12:
            raise PVGISError(f"Expected 12 months from PVGIS, got {len(monthly)}")
        return ExpectedProduction(
            monthly_kwh=tuple(float(m["E_m"]) for m in monthly),
            monthly_sd_kwh=tuple(float(m.get("SD_m", 0.0)) for m in monthly),
            annual_kwh=float(totals["E_y"]),
        )
    except (KeyError, TypeError, ValueError) as exc:
        raise PVGISError(f"Unexpected PVGIS response format: {exc}") from exc


@lru_cache(maxsize=256)
def _fetch(lat: float, lon: float, capacity_kwp: float, loss_pct: float) -> ExpectedProduction:
    params = {
        "lat": lat,
        "lon": lon,
        "peakpower": capacity_kwp,  # kW
        "loss": loss_pct,  # %
        "optimalangles": 1,  # best-case tilt and azimuth -> physical upper bound
        "outputformat": "json",
    }
    try:
        response = httpx.get(PVGIS_URL, params=params, timeout=30.0)
    except httpx.HTTPError as exc:
        raise PVGISError(f"PVGIS request failed: {exc}") from exc

    if response.status_code != 200:
        # PVGIS returns a JSON body with a "message" field on bad input (e.g. sea location)
        try:
            message = response.json().get("message", response.text)
        except ValueError:
            message = response.text
        raise PVGISError(f"PVGIS returned {response.status_code}: {message}")

    return parse_pvcalc_response(response.json())


def get_expected_production(
    lat: float, lon: float, capacity_kwp: float, loss_pct: float = DEFAULT_SYSTEM_LOSS_PCT
) -> ExpectedProduction:
    """Expected production for a plant. Results are cached per rounded location."""
    # Round so tiny coordinate differences reuse the cached PVGIS result.
    return _fetch(round(lat, 3), round(lon, 3), round(capacity_kwp, 2), loss_pct)