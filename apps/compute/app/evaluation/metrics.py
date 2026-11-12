"""Scoring metrics, model aggregation, and frozen selection rules."""
import math
from dataclasses import dataclass
from typing import Any


@dataclass
class BlockEvaluation:
    index: int
    origin: str
    split: str  # "development" | "final"
    targetStart: str
    targetEnd: str
    mae: dict[str, float | None]  # {"M1": ..., "M2": ..., "baseline_mean": ..., "baseline_weekday": ...}
    rmse: dict[str, float | None]
    totalError: dict[str, float | None]  # signed total error: sum(pred) - sum(actual)


def compute_block_metrics(
    actual: list[float],
    forecast: list[float],
) -> tuple[float, float, float]:
    """Compute (MAE, RMSE, signed_total_error) for a 7-day block."""
    if len(actual) != len(forecast) or len(actual) == 0:
        raise ValueError("Actual and forecast must have the same non-zero length")

    abs_errors = [abs(f - a) for a, f in zip(actual, forecast, strict=True)]
    sq_errors = [(f - a) ** 2 for a, f in zip(actual, forecast, strict=True)]
    mae = sum(abs_errors) / len(actual)
    rmse = math.sqrt(sum(sq_errors) / len(actual))
    total_error = sum(forecast) - sum(actual)

    return mae, rmse, total_error


def aggregate_model_metrics(
    model_name: str,
    label: str,
    blocks: list[BlockEvaluation],
    all_models: list[str],
    point_errors: dict[str, list[tuple[float, float]]],  # model -> list of (actual, pred) per split
) -> dict[str, Any]:
    """Compute pooled development MAE, final MAE, final RMSE, and block wins for a model."""
    dev_blocks = [b for b in blocks if b.split == "development"]
    final_blocks = [b for b in blocks if b.split == "final"]

    # Check if model has valid forecasts in all blocks
    valid_blocks = [b for b in blocks if b.mae.get(model_name) is not None]
    if len(valid_blocks) < len(blocks):
        return {
            "model": model_name,
            "label": label,
            "developmentMae": None,
            "finalMae": None,
            "finalRmse": None,
            "meanAbsTotalError": None,
            "blocksWon": 0,
            "blocksWonDev": 0,
            "blocksWonFinal": 0,
            "status": "failed",
            "reason": f"Model failed in {len(blocks) - len(valid_blocks)} blocks",
        }

    # Pooled dev points MAE
    dev_pairs = point_errors.get(f"{model_name}_dev", [])
    if dev_pairs:
        dev_mae = sum(abs(f - a) for a, f in dev_pairs) / len(dev_pairs)
    else:
        # Fall back to mean of block MAEs
        dev_mae = sum(b.mae[model_name] for b in dev_blocks) / len(dev_blocks)  # type: ignore[arg-type]

    # Pooled final points MAE and RMSE
    final_pairs = point_errors.get(f"{model_name}_final", [])
    if final_pairs:
        final_mae = sum(abs(f - a) for a, f in final_pairs) / len(final_pairs)
        final_rmse = math.sqrt(sum((f - a) ** 2 for a, f in final_pairs) / len(final_pairs))
    else:
        final_mae = sum(b.mae[model_name] for b in final_blocks) / len(final_blocks)  # type: ignore[arg-type]
        final_rmse = math.sqrt(sum((b.rmse[model_name] or 0.0) ** 2 for b in final_blocks) / len(final_blocks))

    # Mean absolute seven-day total error in final blocks
    mean_abs_total_error = sum(abs(b.totalError[model_name] or 0.0) for b in final_blocks) / len(final_blocks)

    # Blocks won: lowest block MAE among all available models
    blocks_won_dev = 0
    blocks_won_final = 0

    for b in blocks:
        valid_maes = {m: b.mae[m] for m in all_models if b.mae.get(m) is not None}
        if not valid_maes:
            continue
        min_mae = min(valid_maes.values())  # type: ignore[type-var]
        my_mae = b.mae.get(model_name)
        if my_mae is not None and abs(my_mae - min_mae) < 1e-9:
            if b.split == "development":
                blocks_won_dev += 1
            else:
                blocks_won_final += 1

    total_won = blocks_won_dev + blocks_won_final

    return {
        "model": model_name,
        "label": label,
        "developmentMae": float(dev_mae),
        "finalMae": float(final_mae),
        "finalRmse": float(final_rmse),
        "meanAbsTotalError": float(mean_abs_total_error),
        "blocksWon": total_won,
        "blocksWonDev": blocks_won_dev,
        "blocksWonFinal": blocks_won_final,
        "status": "ok",
        "reason": None,
    }


def evaluate_selection_rules(
    model_summaries: dict[str, dict[str, Any]],
    blocks: list[BlockEvaluation],
) -> dict[str, Any]:
    """Execute frozen project selection rules.

    1. SIR model choice: M2 requires >= 10% dev MAE improvement AND >= ceil(2/3 * n_dev) block wins vs M1.
    2. Baseline choice: lower development MAE between B1 and B2.
    3. Final verdict: improvement >= 10% vs baseline in final MAE AND >= 3 of 4 final block wins.
    """
    m1 = model_summaries.get("M1")
    m2 = model_summaries.get("M2")
    b1 = model_summaries.get("baseline_mean")
    b2 = model_summaries.get("baseline_weekday")

    dev_blocks = [b for b in blocks if b.split == "development"]
    final_blocks = [b for b in blocks if b.split == "final"]
    n_dev = len(dev_blocks)
    dev_threshold = math.ceil((2.0 / 3.0) * n_dev)  # 6 for 9 dev blocks

    # --- Step 1: SIR Model Selection ---
    if m2 is None or m2["status"] != "ok" or m2["developmentMae"] is None:
        selected_sir = "M1"
        selected_sir_reason = "M2 model evaluation failed or was unavailable"
    elif m1 is None or m1["status"] != "ok" or m1["developmentMae"] is None:
        selected_sir = "M2"
        selected_sir_reason = "M1 model evaluation failed or was unavailable"
    else:
        m1_dev_mae = m1["developmentMae"]
        m2_dev_mae = m2["developmentMae"]

        # Count development blocks where M2 beat M1
        m2_head_to_head_wins = 0
        for b in dev_blocks:
            m1_b_mae = b.mae.get("M1")
            m2_b_mae = b.mae.get("M2")
            if m1_b_mae is not None and m2_b_mae is not None and (m2_b_mae < m1_b_mae - 1e-9):
                m2_head_to_head_wins += 1

        rel_dev_improvement = (m1_dev_mae - m2_dev_mae) / m1_dev_mae if m1_dev_mae > 0 else 0.0

        if rel_dev_improvement >= 0.10 and m2_head_to_head_wins >= dev_threshold:
            selected_sir = "M2"
            selected_sir_reason = (
                f"M2 improved development MAE by {rel_dev_improvement*100:.1f}% (>= 10%) "
                f"and won {m2_head_to_head_wins} of {n_dev} development blocks (>= {dev_threshold})"
            )
        else:
            selected_sir = "M1"
            selected_sir_reason = (
                f"M2 did not meet selection criteria: dev MAE improvement was {rel_dev_improvement*100:.1f}% "
                f"(required >= 10%) with {m2_head_to_head_wins}/{n_dev} development block wins (required >= {dev_threshold})"
            )

    # --- Step 2: Baseline Selection ---
    b1_dev = b1["developmentMae"] if b1 and b1["status"] == "ok" else float("inf")
    b2_dev = b2["developmentMae"] if b2 and b2["status"] == "ok" else float("inf")

    if b1_dev <= b2_dev:
        selected_baseline = "baseline_mean"
    else:
        selected_baseline = "baseline_weekday"

    # --- Step 3: Final Verdict ---
    base_summary = model_summaries.get(selected_baseline)
    sir_summary = model_summaries.get(selected_sir)

    if (
        base_summary is None
        or sir_summary is None
        or base_summary["status"] != "ok"
        or sir_summary["status"] != "ok"
        or base_summary["finalMae"] is None
        or sir_summary["finalMae"] is None
    ):
        improvement = None
        improvement_reason = "Final evaluation incomplete for selected models"
        verdict = "INCOMPLETE"
        verdict_text = "Improvement not demonstrated"
    elif base_summary["finalMae"] == 0:
        improvement = None
        improvement_reason = "Undefined: baseline final MAE is zero"
        verdict = "NOT_DEMONSTRATED"
        verdict_text = "Improvement not demonstrated"
    else:
        base_final_mae = base_summary["finalMae"]
        sir_final_mae = sir_summary["finalMae"]
        improvement = (base_final_mae - sir_final_mae) / base_final_mae
        improvement_reason = None

        # Count final blocks where selected SIR beat selected baseline
        sir_final_wins = 0
        for b in final_blocks:
            base_b_mae = b.mae.get(selected_baseline)
            sir_b_mae = b.mae.get(selected_sir)
            if base_b_mae is not None and sir_b_mae is not None and (sir_b_mae < base_b_mae - 1e-9):
                sir_final_wins += 1

        # Project rule: improvement >= 10% AND >= 3 of 4 final blocks
        if improvement >= 0.10 and sir_final_wins >= 3:
            verdict = "SUPPORTED"
            verdict_text = "Improvement supported (project rule)"
        else:
            verdict = "NOT_DEMONSTRATED"
            verdict_text = "Improvement not demonstrated"

    return {
        "selectedSir": selected_sir,
        "selectedSirReason": selected_sir_reason,
        "selectedBaseline": selected_baseline,
        "improvement": float(improvement) if improvement is not None else None,
        "improvementReason": improvement_reason,
        "verdict": verdict,
        "verdictText": verdict_text,
        "rulesNote": "These are project rules, not significance tests.",
    }
