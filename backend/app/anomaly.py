"""Layer 2: AI anomaly detection on the seasonal production pattern.

An Isolation Forest learns what *honest* monthly reports look like for a given
location. Training data is synthetic: we simulate many honest plants from the
PVGIS expected profile (random overall efficiency + realistic month-to-month
noise from PVGIS's year-to-year standard deviation). Months of a new claim that
the model isolates easily are flagged.

This catches what a pure physical limit misses, e.g. fabricated "too smooth"
data (same number every month) or production shifted between seasons.
"""

from functools import lru_cache

import numpy as np
from sklearn.ensemble import IsolationForest

from app.pvgis import ExpectedProduction

N_SYNTHETIC_PLANTS = 400
EFFICIENCY_RANGE = (0.80, 1.00)  # honest plants produce 80-100% of the best case
FLAG_QUANTILE = 0.005  # a month is anomalous if it scores below 99.5% of honest months
RANDOM_STATE = 42  # deterministic results for the same location


def _noise_scale(expected: ExpectedProduction) -> np.ndarray:
    exp = np.asarray(expected.monthly_kwh)
    return np.maximum(np.asarray(expected.monthly_sd_kwh), 0.05 * exp)


def _features(reported: np.ndarray, expected: ExpectedProduction) -> np.ndarray:
    exp = np.asarray(expected.monthly_kwh)
    scale = _noise_scale(expected)
    overall = reported.sum() / exp.sum() if exp.sum() > 0 else 1.0
    # Deviation from the expected seasonal *shape*, independent of plant efficiency
    shape = reported / (overall * exp) - 1 if overall > 0 else np.zeros(12)
    # Deviation in units of normal year-to-year variability
    z = np.clip((reported - exp) / scale, -6, 6) / 3
    month = np.arange(12)
    return np.column_stack([np.sin(2 * np.pi * month / 12), np.cos(2 * np.pi * month / 12), shape, z])


@lru_cache(maxsize=64)
def _model(expected: ExpectedProduction) -> tuple[IsolationForest, float]:
    rng = np.random.default_rng(RANDOM_STATE)
    exp = np.asarray(expected.monthly_kwh)
    scale = _noise_scale(expected)
    samples = []
    for _ in range(N_SYNTHETIC_PLANTS):
        efficiency = rng.uniform(*EFFICIENCY_RANGE)
        honest = efficiency * exp + rng.normal(0, 1, 12) * scale * efficiency
        samples.append(_features(np.clip(honest, 0, None), expected))
    X = np.vstack(samples)
    model = IsolationForest(n_estimators=300, random_state=RANDOM_STATE).fit(X)
    threshold = float(np.quantile(model.score_samples(X), FLAG_QUANTILE))
    return model, threshold


def detect_anomalous_months(
    reported_monthly_kwh: list[float], expected: ExpectedProduction
) -> tuple[list[int], list[float]]:
    """Return (flagged months 1-12, per-month anomaly score 0-1 where higher = more suspicious)."""
    model, threshold = _model(expected)
    scores = model.score_samples(_features(np.asarray(reported_monthly_kwh, dtype=float), expected))
    flagged = [i + 1 for i, s in enumerate(scores) if s < threshold]
    # Map raw scores (~ -0.4 normal ... -0.8 very anomalous) to 0-1 for the UI
    normalized = np.clip((-scores - 0.4) / 0.4, 0, 1)
    return flagged, [round(float(x), 3) for x in normalized]


def ai_risk(n_flagged_months: int) -> float:
    """One odd month is a warning (medium risk); two or more is a strong signal."""
    if n_flagged_months == 0:
        return 0.0
    return min(1.0, 0.10 + 0.15 * n_flagged_months)