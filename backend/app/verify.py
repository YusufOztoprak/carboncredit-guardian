"""Physical plausibility check for a solar project's reported production.

Layer 1 of verification (layer 2, the anomaly model, is added on top later):
- Annual check: reported total vs. PVGIS best-case expected total.
- Monthly check: each month vs. expected + tolerance, where the tolerance
  comes from PVGIS's year-to-year standard deviation for that month.

Risk is expressed in basis points (0-10000) - the same scale the smart
contract stores - so it can be passed to mint() without conversion.
"""

from dataclasses import dataclass, field

from app.pvgis import ExpectedProduction

# Reported annual output may exceed the best-case PVGIS estimate by at most
# this much (an unusually sunny year). Above it the claim is not physically plausible.
ANNUAL_TOLERANCE = 0.10
# A month is suspicious if it exceeds expected + tolerance, where tolerance is
# N year-to-year standard deviations, but never less than a fixed share of the
# expected value (summer SD can be tiny, which would flag normal sunny months).
MONTHLY_SD_MULTIPLIER = 2.0
MONTHLY_MIN_TOLERANCE = 0.10
# Projects at or above this risk are flagged instead of minted.
RISK_THRESHOLD_BP = 3000


@dataclass
class VerificationResult:
    expected_monthly_kwh: list[float]
    expected_kwh_total: float
    reported_kwh_total: float
    physical_ratio: float  # reported / expected
    exceeding_months: list[int]  # 1-12
    monthly_upper_kwh: list[float]  # per-month physical upper bound (Jan..Dec)
    annual_limit_kwh: float  # expected total * (1 + ANNUAL_TOLERANCE)
    risk_score_bp: int
    passed: bool
    verified_kwh: float  # conservative amount eligible for credits
    avoided_tco2: float
    credit_amount: int  # whole tonnes -> token units
    reasons: list[str] = field(default_factory=list)


def _clamp(x: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, x))


def verify_claim(
    reported_monthly_kwh: list[float],
    expected: ExpectedProduction,
    grid_emission_factor_t_per_mwh: float,
) -> VerificationResult:
    reported_total = float(sum(reported_monthly_kwh))
    expected_total = expected.annual_kwh
    ratio = reported_total / expected_total if expected_total > 0 else float("inf")

    monthly_upper = [
        exp + max(MONTHLY_SD_MULTIPLIER * sd, MONTHLY_MIN_TOLERANCE * exp)
        for exp, sd in zip(expected.monthly_kwh, expected.monthly_sd_kwh)
    ]
    exceeding = [
        month
        for month, (rep, upper) in enumerate(zip(reported_monthly_kwh, monthly_upper), start=1)
        if rep > upper
    ]

    # Annual component: 0 risk up to the expected total, full risk at +20%.
    annual_risk = _clamp((ratio - 1.0) / 0.20)
    # Monthly component: share of months that are physically implausible.
    monthly_risk = len(exceeding) / 12
    risk = 0.6 * annual_risk + 0.4 * monthly_risk
    # Any implausible month is a serious signal on its own.
    if exceeding:
        risk = max(risk, 0.35)
    risk_bp = int(round(_clamp(risk) * 10000))

    reasons = []
    if ratio > 1 + ANNUAL_TOLERANCE:
        reasons.append(
            f"Reported annual output is {ratio:.0%} of the physical best case "
            f"(limit {1 + ANNUAL_TOLERANCE:.0%})."
        )
    if exceeding:
        reasons.append(f"Months above the physical range: {exceeding}.")

    passed = ratio <= 1 + ANNUAL_TOLERANCE and risk_bp < RISK_THRESHOLD_BP

    # Credits are issued conservatively: never for more than the physical best case.
    verified_kwh = min(reported_total, expected_total) if passed else 0.0
    avoided_tco2 = verified_kwh / 1000 * grid_emission_factor_t_per_mwh

    return VerificationResult(
        expected_monthly_kwh=list(expected.monthly_kwh),
        expected_kwh_total=expected_total,
        reported_kwh_total=reported_total,
        physical_ratio=round(ratio, 4),
        exceeding_months=exceeding,
        monthly_upper_kwh=[round(u, 2) for u in monthly_upper],
        annual_limit_kwh=round(expected_total * (1 + ANNUAL_TOLERANCE), 2),
        risk_score_bp=risk_bp,
        passed=passed,
        verified_kwh=verified_kwh,
        avoided_tco2=round(avoided_tco2, 3),
        credit_amount=int(avoided_tco2),
        reasons=reasons,
    )