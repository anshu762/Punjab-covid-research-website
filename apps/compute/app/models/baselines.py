"""Evaluation baselines: 7-day trailing mean (B1) and same-weekday persistence (B2)."""
import numpy as np


def baseline_7day_mean(y_train: np.ndarray, horizon: int = 7) -> np.ndarray:
    """Baseline 1 (B1): Mean of the last 7 analysis observations up to the origin.

    Repeated for all horizon forecast days.
    """
    if len(y_train) < 7:
        raise ValueError(f"At least 7 days of history required for 7-day mean baseline, got {len(y_train)}")
    last_7 = y_train[-7:]
    mean_val = float(np.mean(last_7))
    return np.full(horizon, mean_val, dtype=float)


def baseline_same_weekday(y_train: np.ndarray, horizon: int = 7) -> np.ndarray:
    """Baseline 2 (B2): Preceding week's daily pattern.

    Forecast for origin+h (h=1..7) = observation at origin+h-7.
    """
    if len(y_train) < 7:
        raise ValueError(f"At least 7 days of history required for same-weekday baseline, got {len(y_train)}")
    pattern = y_train[-7:].astype(float)
    if horizon == 7:
        return pattern.copy()
    # If horizon differs from 7, repeat pattern cyclically
    repeats = int(np.ceil(horizon / 7))
    tiled = np.tile(pattern, repeats)
    return tiled[:horizon]
