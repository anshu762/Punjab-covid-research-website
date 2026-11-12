"""27-Combination Sensitivity Analysis Protocol and Reversal Detector."""
from __future__ import annotations

import logging
from collections.abc import Callable
from typing import Any

from app.evaluation.metrics import evaluate_selection_rules
from app.evaluation.protocol import generate_evaluation_blocks
from app.models.baselines import baseline_7day_mean, baseline_same_weekday
from app.models.fit import fit_m1, fit_m2
from app.models.forecast import forecast_from_fit

logger = logging.getLogger("epilens.sensitivity")

D_VALUES = [5, 7, 10]
RHO_VALUES = [0.10, 0.20, 0.50]
FS_VALUES = [0.85, 0.95, 0.99]


def run_single_combination(
    series_obs: list[int],
    D: int,
    rho: float,
    fs: float,
    pop_count: int,
    eval_origins: list[int],
) -> tuple[float | None, float | None, float | None, str]:
    """Fit M1 and M2 on training slices and evaluate final MAE across origins."""
    gamma = 1.0 / float(D)

    # We evaluate rolling 7-day forecasts on the final 4 origins (or all origins if fewer)
    # to maintain high compute throughput with 6 multi-starts
    test_origins = eval_origins[-4:] if len(eval_origins) >= 4 else eval_origins

    m1_errors: list[float] = []
    m2_errors: list[float] = []
    base_errors: list[float] = []

    for orig_idx in test_origins:
        train_y = series_obs[:orig_idx]
        test_y = series_obs[orig_idx : orig_idx + 7]
        if len(test_y) < 7:
            continue

        # Baselines
        b_mean = baseline_7day_mean(train_y, horizon=7)
        b_err = [abs(e - a) for e, a in zip(b_mean, test_y)]
        base_errors.extend(b_err)

        # Fit M1 with n_starts=6
        try:
            m1_fit = fit_m1(
                y=train_y,
                N=pop_count,
                gamma=gamma,
                rho=rho,
                susceptible_fraction=fs,
                n_starts=6,
                seed=42,
            )
            m1_fc = forecast_from_fit(m1_fit, days=7)
            m1_err = [abs(e - a) for e, a in zip(m1_fc.expected_cases, test_y)]
            m1_errors.extend(m1_err)
        except Exception:  # noqa: BLE001
            pass

        # Fit M2 with n_starts=6 and cp_search_starts=2
        try:
            m2_fit = fit_m2(
                y=train_y,
                N=pop_count,
                gamma=gamma,
                rho=rho,
                susceptible_fraction=fs,
                n_starts=6,
                cp_search_starts=2,
                seed=42,
            )
            m2_fc = forecast_from_fit(m2_fit, days=7)
            m2_err = [abs(e - a) for e, a in zip(m2_fc.expected_cases, test_y)]
            m2_errors.extend(m2_err)
        except Exception:  # noqa: BLE001
            pass

    m1_mae = float(sum(m1_errors) / len(m1_errors)) if m1_errors else None
    m2_mae = float(sum(m2_errors) / len(m2_errors)) if m2_errors else None
    base_mae = float(sum(base_errors) / len(base_errors)) if base_errors else None

    # Pick winning model
    if m2_mae is not None and (m1_mae is None or m2_mae <= m1_mae):
        winner = "M2"
    else:
        winner = "M1"

    return m1_mae, m2_mae, base_mae, winner


def evaluate_27_combinations(
    parent_payload: dict[str, Any],
    progress_callback: Callable[[int, int], None] | None = None,
) -> dict[str, Any]:
    """Execute complete 27-combination sensitivity matrix."""
    series = parent_payload.get("series", [])
    series_obs = [int(pt["observed"]) for pt in series if pt.get("observed") is not None]

    pop_count = int(
        parent_payload.get("assumptions", {})
        .get("population", {})
        .get("value", parent_payload.get("assumptions", {}).get("population", {}).get("count", 30000000))
    )

    parent_eval = parent_payload.get("evaluation") or {}
    parent_selection = parent_eval.get("selection") or {}
    parent_winner = parent_selection.get("selectedSir", "M2")
    parent_verdict = parent_selection.get("verdict", "SUPPORTED")

    # Generate origins: every 7 days from day 60 up to len(series_obs) - 7
    eval_origins: list[int] = []
    T = len(series_obs)
    for orig in range(60, T - 6, 7):
        eval_origins.append(orig)
    if not eval_origins:
        eval_origins = [max(14, T - 7)]

    combos: list[dict[str, Any]] = []
    combo_idx = 0
    m2_wins = 0
    m1_wins = 0
    reversals_count = 0
    verdict_reversals_count = 0

    for D in D_VALUES:
        for rho in RHO_VALUES:
            for fs in FS_VALUES:
                combo_idx += 1
                if progress_callback:
                    progress_callback(combo_idx, 27)

                m1_mae, m2_mae, base_mae, winner = run_single_combination(
                    series_obs=series_obs,
                    D=D,
                    rho=rho,
                    fs=fs,
                    pop_count=pop_count,
                    eval_origins=eval_origins,
                )

                if winner == "M2":
                    m2_wins += 1
                else:
                    m1_wins += 1

                # Calculate improvement vs baseline
                win_mae = m2_mae if winner == "M2" else m1_mae
                improvement_pct = None
                verdict = "NOT_DEMONSTRATED"
                if win_mae is not None and base_mae is not None and base_mae > 0:
                    improvement_pct = ((base_mae - win_mae) / base_mae) * 100.0
                    if improvement_pct >= 15.0:
                        verdict = "SUPPORTED"

                # Check for ranking/verdict reversal vs parent run
                is_model_reversal = winner != parent_winner
                is_verdict_reversal = verdict != parent_verdict
                is_reversal = is_model_reversal or is_verdict_reversal

                reversal_reason = None
                if is_model_reversal and is_verdict_reversal:
                    reversal_reason = f"Winner reversed to {winner} and verdict dropped to {verdict}"
                elif is_model_reversal:
                    reversal_reason = f"Winner reversed from {parent_winner} to {winner}"
                elif is_verdict_reversal:
                    reversal_reason = f"Verdict reversed from {parent_verdict} to {verdict}"

                if is_reversal:
                    reversals_count += 1
                if is_verdict_reversal:
                    verdict_reversals_count += 1

                combos.append({
                    "comboIndex": combo_idx,
                    "infectiousDurationDays": D,
                    "reportingFraction": rho,
                    "susceptibleFraction": fs,
                    "m1FinalMae": m1_mae,
                    "m2FinalMae": m2_mae,
                    "winningModel": winner,
                    "bestBaselineMae": base_mae,
                    "improvementPct": improvement_pct,
                    "verdict": verdict,
                    "isReversal": is_reversal,
                    "reversalReason": reversal_reason,
                })

    parent_win_count = m2_wins if parent_winner == "M2" else m1_wins
    stability_pct = round((parent_win_count / 27.0) * 100.0, 1)

    statement = (
        f"{parent_winner} retains forecast superiority in {parent_win_count} of 27 sensitivity configurations "
        f"({stability_pct}%). Detected {reversals_count} ranking/verdict reversals."
    )

    summary = {
        "totalCombos": 27,
        "m2Wins": m2_wins,
        "m1Wins": m1_wins,
        "reversalsCount": reversals_count,
        "verdictReversalsCount": verdict_reversals_count,
        "stabilityPct": stability_pct,
        "stabilityStatement": statement,
        "reducedSettingsNote": "Computed with reduced optimizer multi-starts (6 starts vs 20) for bounded execution time.",
    }

    return {
        "combos": combos,
        "summary": summary,
    }
