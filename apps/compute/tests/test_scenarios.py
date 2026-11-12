"""Tests for hypothetical forward scenario computation engine."""
import numpy as np
import pytest

from app.scenarios.engine import (
    contains_forbidden_words,
    format_scenario_sentence,
    run_scenario_simulation,
)


@pytest.fixture
def sample_parent_payload():
    """Realistic parent fit payload fixture."""
    return {
        "finalState": {
            "date": "2020-11-30",
            "S": 27000000.0,
            "I": 50000.0,
            "R": 2950000.0,
            "C": 3000000.0,
            "beta": 0.25,
        },
        "assumptions": {
            "gamma": 0.142857,  # D = 7
            "reportingFraction": 0.20,
            "susceptibleFraction": 0.90,
            "population": {
                "count": 30000000,
                "label": "Punjab 2020 Projections",
            },
        },
        "bootstrap": {
            "requested": 20,
            "succeeded": 15,
            "failed": 5,
            "reliable": True,
            "draws": [
                {
                    "ok": True,
                    "finalState": {
                        "date": "2020-11-30",
                        "S": 27000000.0 + i * 1000.0,
                        "I": 50000.0 + i * 500.0,
                        "R": 2950000.0 - i * 1500.0,
                        "C": 3000000.0,
                        "beta": 0.24 + i * 0.002,
                    },
                    "finalBeta": 0.24 + i * 0.002,
                }
                for i in range(15)
            ],
        },
    }


def test_scenario_zero_percent_equals_baseline(sample_parent_payload):
    """0% delta should produce identical outputs for baseline and scenario."""
    res = run_scenario_simulation(sample_parent_payload, percent_change=0, horizon_days=28)
    daily = res["dailyOutputs"]
    assert len(daily) == 28

    for d in daily:
        assert np.isclose(d["baselineExpectedCases"], d["scenarioExpectedCases"], rtol=1e-5)
        assert np.isclose(d["baselineInfections"], d["scenarioInfections"], rtol=1e-5)
        assert np.isclose(d["baselineCumCases"], d["scenarioCumCases"], rtol=1e-5)
        assert np.isclose(d["baselineCumInfections"], d["scenarioCumInfections"], rtol=1e-5)

    summary = res["summary"]
    assert np.isclose(summary["baselineBeta"], summary["scenarioBeta"], rtol=1e-5)
    assert np.isclose(summary["expectedCasesDiff"], 0.0, atol=1e-3)
    assert np.isclose(summary["expectedCasesPctDiff"], 0.0, atol=1e-3)


def test_scenario_negative_transmission_reduces_infections(sample_parent_payload):
    """-50% change must strictly reduce cumulative infections vs baseline."""
    res = run_scenario_simulation(sample_parent_payload, percent_change=-50, horizon_days=28)
    summary = res["summary"]

    assert summary["scenarioBeta"] < summary["baselineBeta"]
    assert summary["scenarioExpectedCases"] < summary["baselineExpectedCases"]
    assert summary["scenarioInfections"] < summary["baselineInfections"]
    assert summary["expectedCasesDiff"] < 0
    assert summary["expectedCasesPctDiff"] < 0
    assert summary["infectionsDiff"] < 0
    assert summary["infectionsPctDiff"] < 0


def test_scenario_start_date_is_day_after_fitted_end(sample_parent_payload):
    """Start date must be exactly the day immediately after parent fitted date."""
    res = run_scenario_simulation(sample_parent_payload, percent_change=-20, horizon_days=14)
    assert res["summary"]["startDate"] == "2020-12-01"
    assert res["dailyOutputs"][0]["date"] == "2020-12-01"
    assert res["dailyOutputs"][-1]["date"] == "2020-12-14"


def test_scenario_bounds_enforced(sample_parent_payload):
    """Bounds on percentChange (-50..50, step 5) and horizonDays (7..60) must be checked."""
    # percentChange bounds
    with pytest.raises(ValueError, match="percent_change"):
        run_scenario_simulation(sample_parent_payload, percent_change=-55, horizon_days=28)

    with pytest.raises(ValueError, match="percent_change"):
        run_scenario_simulation(sample_parent_payload, percent_change=55, horizon_days=28)

    with pytest.raises(ValueError, match="multiple of 5"):
        run_scenario_simulation(sample_parent_payload, percent_change=-18, horizon_days=28)

    # horizonDays bounds
    with pytest.raises(ValueError, match="horizon_days"):
        run_scenario_simulation(sample_parent_payload, percent_change=0, horizon_days=6)

    with pytest.raises(ValueError, match="horizon_days"):
        run_scenario_simulation(sample_parent_payload, percent_change=0, horizon_days=61)


def test_scenario_paired_bootstrap_intervals(sample_parent_payload):
    """Paired bootstrap creates valid intervals with lower <= upper."""
    res = run_scenario_simulation(sample_parent_payload, percent_change=-20, horizon_days=28)
    summary = res["summary"]

    assert "casesInterval" in summary
    assert summary["casesInterval"]["lower"] <= summary["casesInterval"]["upper"]
    assert "infectionsInterval" in summary
    assert summary["infectionsInterval"]["lower"] <= summary["infectionsInterval"]["upper"]

    first_day = res["dailyOutputs"][0]
    assert "casesInterval" in first_day
    assert first_day["casesInterval"]["lower"] <= first_day["casesInterval"]["upper"]


def test_scenario_undefined_when_baseline_zero():
    """When baseline count is zero, percentage diff must be None / undefined."""
    sentence = format_scenario_sentence(
        start_date="2020-12-01",
        horizon_days=28,
        percent_change=-20,
        baseline_beta=0.15,
        scenario_beta=0.12,
        baseline_expected_cases=0.0,
        scenario_expected_cases=0.0,
        expected_cases_diff=0.0,
        expected_cases_pct_diff=None,
        baseline_infections=0.0,
        scenario_infections=0.0,
        infections_diff=0.0,
        infections_pct_diff=None,
    )
    assert "Undefined (baseline is zero)" in sentence


def test_forbidden_words_detection():
    """Forbidden vocabulary must be blocked."""
    assert contains_forbidden_words("Analysis proves 500 lives saved")
    assert contains_forbidden_words("Policy impact demonstrated")
    assert contains_forbidden_words("Cases prevented by intervention")
    assert not contains_forbidden_words("Hypothetical simulation under the fitted model")

    # Valid sentence should pass without raising
    sentence = format_scenario_sentence(
        start_date="2020-12-01",
        horizon_days=28,
        percent_change=-20,
        baseline_beta=0.15,
        scenario_beta=0.12,
        baseline_expected_cases=100.0,
        scenario_expected_cases=80.0,
        expected_cases_diff=-20.0,
        expected_cases_pct_diff=-20.0,
        baseline_infections=500.0,
        scenario_infections=400.0,
        infections_diff=-100.0,
        infections_pct_diff=-20.0,
    )
    assert not contains_forbidden_words(sentence)
