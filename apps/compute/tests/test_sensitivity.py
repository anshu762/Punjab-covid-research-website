"""Tests for 27-combination sensitivity matrix and reversal detection."""
from app.sensitivity import D_VALUES, FS_VALUES, RHO_VALUES, evaluate_27_combinations


def test_sensitivity_dimensions():
    """3x3x3 matrix must produce exactly 27 combinations."""
    assert len(D_VALUES) == 3
    assert len(RHO_VALUES) == 3
    assert len(FS_VALUES) == 3
    assert len(D_VALUES) * len(RHO_VALUES) * len(FS_VALUES) == 27


def test_sensitivity_execution_on_synthetic_fixture(monkeypatch):
    """Verify 27-combination evaluation logic and reversal flags."""
    # Fast mock for run_single_combination to verify matrix structure and reversal flags
    import app.sensitivity as sens

    call_count = 0

    def mock_run_single(series_obs, D, rho, fs, pop_count, eval_origins):
        nonlocal call_count
        call_count += 1
        # Intentionally return M1 winner for high reporting fraction to test reversal flag
        if rho >= 0.50:
            return 110.0, 130.0, 160.0, "M1"
        return 150.0, 95.0, 160.0, "M2"

    monkeypatch.setattr(sens, "run_single_combination", mock_run_single)

    parent_payload = {
        "series": [{"date": f"2020-07-{d:02d}", "observed": 100} for d in range(1, 30)],
        "assumptions": {"population": {"count": 30000000}},
        "evaluation": {
            "selection": {
                "selectedSir": "M2",
                "verdict": "SUPPORTED",
            }
        },
    }

    result = evaluate_27_combinations(parent_payload)
    assert call_count == 27

    combos = result["combos"]
    assert len(combos) == 27

    summary = result["summary"]
    assert summary["totalCombos"] == 27
    assert summary["m2Wins"] + summary["m1Wins"] == 27

    # Since rho=0.50 (9 combos out of 27) returned M1, we expect reversals
    reversals = [c for c in combos if c["isReversal"]]
    assert len(reversals) > 0
    assert summary["reversalsCount"] == len(reversals)

    # Check that reversalReason is populated for each reversal
    for r in reversals:
        assert r["reversalReason"] is not None
        assert "Winner reversed" in r["reversalReason"] or "Verdict reversed" in r["reversalReason"]

    # Check stability statement
    assert "M2 retains forecast superiority" in summary["stabilityStatement"]
    assert "reduced optimizer multi-starts" in summary["reducedSettingsNote"]
