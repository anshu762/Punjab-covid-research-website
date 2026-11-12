"""Unit tests for scoring metrics and frozen model selection rules."""
import pytest

from app.evaluation.metrics import (
    BlockEvaluation,
    compute_block_metrics,
    evaluate_selection_rules,
)


def test_block_metrics_calculation():
    actual = [100.0, 110.0, 120.0, 130.0, 140.0, 150.0, 160.0]
    forecast = [110.0, 110.0, 110.0, 140.0, 140.0, 160.0, 150.0]

    mae, rmse, total_error = compute_block_metrics(actual, forecast)
    # Differences: +10, 0, -10, +10, 0, +10, -10
    # Abs diffs: 10, 0, 10, 10, 0, 10, 10 -> sum = 50 -> 50 / 7 = 7.142857
    assert mae == pytest.approx(50.0 / 7.0, rel=1e-5)
    # Sq diffs: 100, 0, 100, 100, 0, 100, 100 -> sum = 500 -> sqrt(500/7)
    assert rmse == pytest.approx((500.0 / 7.0) ** 0.5, rel=1e-5)
    # Total error: (110*3 + 140*2 + 160 + 150) - (100+110+120+130+140+150+160) = 920 - 910 = +10.0
    assert total_error == pytest.approx(10.0)


def _make_dummy_blocks(m1_dev_mae: float, m2_dev_mae: float, m2_wins: int, base_final_mae: float, sir_final_mae: float, sir_final_wins: int):
    blocks = []
    # 9 dev blocks
    for i in range(1, 10):
        # assign block MAEs to control who wins
        if i <= m2_wins:
            b_m1, b_m2 = 20.0, 15.0  # M2 wins
        else:
            b_m1, b_m2 = 15.0, 20.0  # M1 wins
        blocks.append(
            BlockEvaluation(
                index=i,
                origin=f"2020-08-{i:02d}",
                split="development",
                targetStart="",
                targetEnd="",
                mae={"M1": b_m1, "M2": b_m2, "baseline_mean": 25.0, "baseline_weekday": 30.0},
                rmse={"M1": b_m1, "M2": b_m2, "baseline_mean": 25.0, "baseline_weekday": 30.0},
                totalError={"M1": 0.0, "M2": 0.0, "baseline_mean": 0.0, "baseline_weekday": 0.0},
            )
        )
    # 4 final blocks
    for i in range(10, 14):
        k = i - 9
        if k <= sir_final_wins:
            b_base, b_sir = 25.0, 18.0  # SIR wins
        else:
            b_base, b_sir = 18.0, 25.0  # Baseline wins
        blocks.append(
            BlockEvaluation(
                index=i,
                origin=f"2020-11-{i:02d}",
                split="final",
                targetStart="",
                targetEnd="",
                mae={"M1": b_sir, "M2": b_sir, "baseline_mean": b_base, "baseline_weekday": 30.0},
                rmse={"M1": b_sir, "M2": b_sir, "baseline_mean": b_base, "baseline_weekday": 30.0},
                totalError={"M1": 0.0, "M2": 0.0, "baseline_mean": 0.0, "baseline_weekday": 0.0},
            )
        )
    return blocks


def test_selection_rule_m2_chosen_only_if_10pct_and_6_of_9_wins():
    # Case 1: Exactly 10% improvement and 6 wins -> M2 selected
    blocks = _make_dummy_blocks(
        m1_dev_mae=100.0,
        m2_dev_mae=90.0,
        m2_wins=6,
        base_final_mae=100.0,
        sir_final_mae=80.0,
        sir_final_wins=3,
    )
    models = {
        "M1": {"model": "M1", "developmentMae": 100.0, "finalMae": 80.0, "status": "ok"},
        "M2": {"model": "M2", "developmentMae": 90.0, "finalMae": 80.0, "status": "ok"},
        "baseline_mean": {"model": "baseline_mean", "developmentMae": 110.0, "finalMae": 100.0, "status": "ok"},
        "baseline_weekday": {"model": "baseline_weekday", "developmentMae": 120.0, "finalMae": 110.0, "status": "ok"},
    }

    result = evaluate_selection_rules(models, blocks)
    assert result["selectedSir"] == "M2"

    # Case 2: 12% improvement but only 5 wins -> M1 selected
    blocks_5wins = _make_dummy_blocks(100.0, 88.0, 5, 100.0, 80.0, 3)
    models_5wins = {
        "M1": {"model": "M1", "developmentMae": 100.0, "finalMae": 80.0, "status": "ok"},
        "M2": {"model": "M2", "developmentMae": 88.0, "finalMae": 80.0, "status": "ok"},
        "baseline_mean": {"model": "baseline_mean", "developmentMae": 110.0, "finalMae": 100.0, "status": "ok"},
        "baseline_weekday": {"model": "baseline_weekday", "developmentMae": 120.0, "finalMae": 110.0, "status": "ok"},
    }
    result_5wins = evaluate_selection_rules(models_5wins, blocks_5wins)
    assert result_5wins["selectedSir"] == "M1"


def test_final_verdict_rules():
    # Improvement >= 10% and 3 of 4 final blocks -> SUPPORTED
    blocks = _make_dummy_blocks(100.0, 105.0, 2, base_final_mae=100.0, sir_final_mae=89.0, sir_final_wins=3)
    models = {
        "M1": {"model": "M1", "developmentMae": 100.0, "finalMae": 89.0, "status": "ok"},
        "M2": {"model": "M2", "developmentMae": 105.0, "finalMae": 95.0, "status": "ok"},
        "baseline_mean": {"model": "baseline_mean", "developmentMae": 110.0, "finalMae": 100.0, "status": "ok"},
        "baseline_weekday": {"model": "baseline_weekday", "developmentMae": 120.0, "finalMae": 120.0, "status": "ok"},
    }
    res = evaluate_selection_rules(models, blocks)
    assert res["improvement"] == pytest.approx(0.11)
    assert res["verdict"] == "SUPPORTED"
    assert res["verdictText"] == "Improvement supported (project rule)"

    # Improvement < 10% -> NOT_DEMONSTRATED
    models["M1"]["finalMae"] = 92.0  # 8% improvement
    res_low = evaluate_selection_rules(models, blocks)
    assert res_low["verdict"] == "NOT_DEMONSTRATED"
    assert res_low["verdictText"] == "Improvement not demonstrated"

    # Zero baseline MAE -> None improvement
    models["baseline_mean"]["finalMae"] = 0.0
    res_zero = evaluate_selection_rules(models, blocks)
    assert res_zero["improvement"] is None
    assert "baseline final MAE is zero" in res_zero["improvementReason"]
