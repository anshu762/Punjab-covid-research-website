"""Unit tests for B1 (7-day mean) and B2 (same weekday) baselines."""
import numpy as np
import pytest

from app.models.baselines import baseline_7day_mean, baseline_same_weekday


def test_hand_computed_toy_series():
    """Verify B1 and B2 on a 21-day toy series: daily values 1..21."""
    toy_data = np.arange(1, 22, dtype=float)  # days 1 to 21

    # Last 7 days: 15, 16, 17, 18, 19, 20, 21
    # Mean = (15+16+17+18+19+20+21)/7 = 126/7 = 18.0
    b1_forecast = baseline_7day_mean(toy_data, horizon=7)
    assert len(b1_forecast) == 7
    np.testing.assert_array_equal(b1_forecast, np.full(7, 18.0))

    # B2: repeating preceding week's daily pattern [15, 16, 17, 18, 19, 20, 21]
    b2_forecast = baseline_same_weekday(toy_data, horizon=7)
    assert len(b2_forecast) == 7
    np.testing.assert_array_equal(b2_forecast, np.array([15.0, 16.0, 17.0, 18.0, 19.0, 20.0, 21.0]))


def test_insufficient_history():
    with pytest.raises(ValueError, match="At least 7 days"):
        baseline_7day_mean(np.array([1.0, 2.0, 3.0]))
    with pytest.raises(ValueError, match="At least 7 days"):
        baseline_same_weekday(np.array([1.0, 2.0, 3.0]))
