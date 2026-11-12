"""Run lifecycle orchestrator: stages, cancellation, parallel evaluation, diagnostics, persistence."""
from __future__ import annotations

import logging
import time
import uuid
from datetime import UTC, datetime
from typing import Any

import numpy as np

from app.config import RunConfig, get_code_version
from app.data.cleaning import Obs, normalize
from app.db import execute, fetch_all, fetch_one, get_connection
from app.diagnostics import (
    assess_diagnostics_status,
    compute_parameter_profiles,
    compute_residuals_and_acf,
)
from app.evaluation.metrics import (
    BlockEvaluation,
    aggregate_model_metrics,
    compute_block_metrics,
    evaluate_selection_rules,
)
from app.evaluation.protocol import generate_evaluation_blocks
from app.models.baselines import baseline_7day_mean, baseline_same_weekday
from app.models.fit import OptimizationFailed, fit_m1, fit_m2
from app.models.forecast import forecast_from_fit
from app.uncertainty.bootstrap import run_parametric_bootstrap

logger = logging.getLogger("epilens.runner")

_last_progress_update: float = 0.0


class RunPipelineCancelled(Exception):
    """Raised when cancellation is requested by user."""


def check_cancellation(run_id: str) -> None:
    """Read cancel_requested from DB and abort if set."""
    row = fetch_one("SELECT cancel_requested FROM runs WHERE id = %(id)s", {"id": run_id})
    if row and row.get("cancel_requested"):
        raise RunPipelineCancelled("Cancellation requested by user")


def update_progress(
    run_id: str,
    stage: str,
    status: str,
    done: int | None = None,
    total: int | None = None,
    job_id: str | None = None,
    force: bool = False,
) -> None:
    """Update runs table progress throttled to at most once per second."""
    global _last_progress_update
    now = time.time()
    if not force and (now - _last_progress_update < 1.0) and stage != "COMPLETED":
        return

    _last_progress_update = now
    execute(
        """
        UPDATE runs
        SET stage = %(stage)s,
            status = %(status)s,
            progress_done = %(done)s,
            progress_total = %(total)s,
            started_at = COALESCE(started_at, now())
        WHERE id = %(id)s
        """,
        {
            "id": run_id,
            "stage": stage,
            "status": status,
            "done": done,
            "total": total,
        },
    )
    if job_id:
        execute(
            "UPDATE jobs SET heartbeat_at = now(), updated_at = now() WHERE id = %(jid)s",
            {"jid": job_id},
        )


def _map_error_message(exc: Exception) -> tuple[str, str]:
    """Map exception to a technical reference and a sanitized, actionable message."""
    error_ref = f"ERR-{uuid.uuid4().hex[:8].upper()}"
    if isinstance(exc, OptimizationFailed):
        msg = (
            "The optimiser could not find a valid fit. "
            "Try widening the β bounds, lowering the infectious duration, or changing the seed."
        )
    elif "population_provenance_missing" in str(exc):
        msg = "Empirical fitting is blocked until population provenance is provided."
    elif isinstance(exc, ValueError):
        msg = f"Invalid analysis configuration: {exc}"
    else:
        msg = f"Unexpected computational error. Quote reference {error_ref} to support."

    return error_ref, msg


def execute_run(run_id: str, job_id: str | None = None) -> None:
    """Execute complete analysis pipeline for a Run."""
    logger.info("Starting analysis run execution: %s", run_id)
    try:
        # 1. VALIDATING stage
        update_progress(run_id, stage="validating", status="VALIDATING", force=True, job_id=job_id)
        check_cancellation(run_id)

        run_row = fetch_one("SELECT * FROM runs WHERE id = %(id)s", {"id": run_id})
        if not run_row:
            raise ValueError(f"Run {run_id} not found in database")

        dataset_id = run_row["dataset_id"]
        dataset_row = fetch_one("SELECT * FROM datasets WHERE id = %(id)s", {"id": dataset_id})
        if not dataset_row:
            raise ValueError(f"Dataset {dataset_id} not found")

        if dataset_row["status"] != "READY":
            raise ValueError(f"Dataset status is {dataset_row['status']}, must be READY")

        # Validate population provenance
        pop_val = dataset_row.get("population_value")
        pop_url = dataset_row.get("population_source_url")
        pop_year = dataset_row.get("population_reference_year") or 2020
        pop_geo = dataset_row.get("population_geography")

        if not pop_val or not pop_url or not pop_geo:
            raise ValueError("population_provenance_missing")

        # Parse and validate RunConfig
        raw_config = run_row["config"]
        if isinstance(raw_config, str):
            import json
            raw_config = json.loads(raw_config)

        # Inject dataset provenance if missing from draft
        if "population" not in raw_config or not raw_config["population"].get("value"):
            raw_config["population"] = {
                "value": int(pop_val),
                "sourceUrl": pop_url,
                "referenceYear": int(pop_year),
                "geography": pop_geo,
            }

        config = RunConfig(**raw_config)
        N = config.population.value
        gamma = 1.0 / float(config.infectiousDurationDays)
        rho = float(config.reportingFraction)
        f_s = float(config.susceptibleFraction)
        s_initial = f_s * N
        r_initial = N - s_initial

        # Load observations for dataset inside coverage
        obs_rows = fetch_all(
            """
            SELECT to_char(date, 'YYYY-MM-DD') AS date,
                   new_confirmed_raw,
                   new_confirmed_analysis,
                   quality_flag
            FROM observations
            WHERE dataset_id = %(ds_id)s
            ORDER BY date ASC
            """,
            {"ds_id": dataset_id},
        )
        if not obs_rows:
            raise ValueError(f"No observations found for dataset {dataset_id}")

        all_dates = [r["date"] for r in obs_rows]
        start_date = config.dateRange.start
        end_date = config.dateRange.end

        if start_date < all_dates[0] or end_date > all_dates[-1]:
            raise ValueError(
                f"Selected range {start_date} to {end_date} exceeds dataset coverage ({all_dates[0]} to {all_dates[-1]})"
            )

        # Filter observations to selected range
        sel_obs = [r for r in obs_rows if start_date <= r["date"] <= end_date]
        sel_dates = [r["date"] for r in sel_obs]
        y_observed = np.array([float(r["new_confirmed_analysis"] or 0) for r in sel_obs])

        mode = config.mode
        uncertainty_on = (config.uncertainty == "BOOTSTRAP")

        # Forecast rows to bulk-insert
        forecast_records_to_insert: list[dict[str, Any]] = []

        if mode == "FIT":
            # Total tasks = 1 (fit) + (200 if uncertainty else 0) + 1 (diagnostics)
            total_tasks = 1 + (config.advanced.bootstrapReplicates if uncertainty_on else 0) + 1
            tasks_done = 0

            # FITTING stage
            update_progress(
                run_id, stage="fitting", status="FITTING",
                done=tasks_done, total=total_tasks, force=True, job_id=job_id,
            )
            check_cancellation(run_id)

            if config.modelType == "M1":
                fit_data = fit_m1(
                    y_observed=y_observed,
                    N=N,
                    susceptible_fraction=f_s,
                    gamma=gamma,
                    rho=rho,
                    beta_bounds=(config.advanced.betaBounds[0], config.advanced.betaBounds[1]),
                    i0_bounds=(config.advanced.initialInfectiousBounds[0], config.advanced.initialInfectiousBounds[1]),
                    dispersion_bounds=(config.advanced.dispersionBounds[0], config.advanced.dispersionBounds[1]),
                    n_starts=config.advanced.nStarts,
                    seed=config.advanced.seed,
                    rtol=config.advanced.rtol,
                    atol=config.advanced.atol,
                )
            else:
                fit_data = fit_m2(
                    y_observed=y_observed,
                    dates=sel_dates,
                    N=N,
                    susceptible_fraction=f_s,
                    gamma=gamma,
                    rho=rho,
                    beta_bounds=(config.advanced.betaBounds[0], config.advanced.betaBounds[1]),
                    i0_bounds=(config.advanced.initialInfectiousBounds[0], config.advanced.initialInfectiousBounds[1]),
                    dispersion_bounds=(config.advanced.dispersionBounds[0], config.advanced.dispersionBounds[1]),
                    cp_min_segment_days=config.advanced.cpMinSegmentDays,
                    cp_step_days=config.advanced.cpStepDays,
                    cp_search_starts=config.advanced.cpSearchStarts,
                    n_starts=config.advanced.nStarts,
                    seed=config.advanced.seed,
                    rtol=config.advanced.rtol,
                    atol=config.advanced.atol,
                )

            tasks_done += 1
            update_progress(
                run_id, stage="fitting", status="FITTING",
                done=tasks_done, total=total_tasks, force=True, job_id=job_id,
            )
            check_cancellation(run_id)

            # ESTIMATING_UNCERTAINTY stage
            bootstrap_summary = None
            if uncertainty_on:
                update_progress(
                    run_id, stage="estimating_uncertainty", status="ESTIMATING_UNCERTAINTY",
                    done=tasks_done, total=total_tasks, force=True, job_id=job_id,
                )
                b_res = run_parametric_bootstrap(
                    fit=fit_data,
                    N=N,
                    susceptible_fraction=f_s,
                    gamma=gamma,
                    rho=rho,
                    n_replicates=config.advanced.bootstrapReplicates,
                    bootstrap_starts=config.advanced.bootstrapStarts,
                    seed=config.advanced.seed,
                    forecast_horizon=7,
                )
                bootstrap_summary = {
                    "requested": b_res.requested,
                    "succeeded": b_res.succeeded,
                    "failed": b_res.failed,
                    "reliable": b_res.reliable,
                    "message": b_res.message,
                    "draws": b_res.draws[:50],  # persist top 50 draws in payload for scenario propagation
                    "failures": b_res.failures[:10],
                }
                fit_lower = b_res.fit_lower
                fit_upper = b_res.fit_upper
                tasks_done += config.advanced.bootstrapReplicates
            else:
                fit_lower = None
                fit_upper = None

            check_cancellation(run_id)

            # DIAGNOSTICS
            update_progress(
                run_id, stage="exporting", status="EXPORTING",
                done=tasks_done, total=total_tasks, force=True, job_id=job_id,
            )
            k_val = fit_data.parameters.get("dispersion", 50.0)
            res_items, acf_items, acf_lim = compute_residuals_and_acf(
                y_observed, fit_data.sir_result.expected_cases, k_val,
            )
            profiles = compute_parameter_profiles(
                fit=fit_data,
                y_observed=y_observed,
                N=N,
                susceptible_fraction=f_s,
                gamma=gamma,
                rho=rho,
                beta_bounds=(config.advanced.betaBounds[0], config.advanced.betaBounds[1]),
                i0_bounds=(config.advanced.initialInfectiousBounds[0], config.advanced.initialInfectiousBounds[1]),
                dispersion_bounds=(config.advanced.dispersionBounds[0], config.advanced.dispersionBounds[1]),
                n_points=15,
            )
            diag_status, diag_warnings = assess_diagnostics_status(
                fit_data.convergence,
                fit_data.boundary_hits,
                acf_items,
                acf_lim,
                bootstrap_reliable=bootstrap_summary["reliable"] if bootstrap_summary else None,
            )

            # Build series array
            series_arr = []
            for d_idx, d_str in enumerate(sel_dates):
                series_arr.append({
                    "date": d_str,
                    "observed": float(y_observed[d_idx]),
                    "expected": float(fit_data.sir_result.expected_cases[d_idx]),
                    "lower": float(fit_lower[d_idx]) if fit_lower is not None else None,
                    "upper": float(fit_upper[d_idx]) if fit_upper is not None else None,
                    "S": float(fit_data.sir_result.S[d_idx]),
                    "I": float(fit_data.sir_result.I[d_idx]),
                    "R": float(fit_data.sir_result.R[d_idx]),
                    "C": float(fit_data.sir_result.C[d_idx]),
                    "beta": float(fit_data.sir_result.beta[d_idx]),
                    "rEff": float(fit_data.sir_result.r_eff[d_idx]),
                })

            final_state = {
                "date": sel_dates[-1],
                "S": float(fit_data.sir_result.S[-1]),
                "I": float(fit_data.sir_result.I[-1]),
                "R": float(fit_data.sir_result.R[-1]),
                "C": float(fit_data.sir_result.C[-1]),
                "beta": float(fit_data.parameters.get("beta2") or fit_data.parameters.get("beta", 0.0)),
            }

            selected_sir_model = config.modelType
            evaluation_summary = None

        else:
            # Mode == EVALUATE
            blocks, protocol_version = generate_evaluation_blocks(start_date, end_date)
            # Total tasks = 13 blocks * 4 models (52) + 1 (final fit) + (200 if uncertainty else 0) + 1 (export)
            total_tasks = (len(blocks) * 4) + 1 + (config.advanced.bootstrapReplicates if uncertainty_on else 0) + 1
            tasks_done = 0

            update_progress(
                run_id, stage="evaluating", status="EVALUATING",
                done=tasks_done, total=total_tasks, force=True, job_id=job_id,
            )

            evaluated_blocks: list[BlockEvaluation] = []
            point_errors: dict[str, list[tuple[float, float]]] = {}
            all_model_names = ["M1", "M2", "baseline_mean", "baseline_weekday"]

            # Retrospective note
            retrospective_note = (
                "Validation is retrospective on a revised archive. Normalization is strictly "
                "isolated to each training prefix to prevent backwards information leakage."
            )

            # Dictionary mapping date -> normalized analysis count for actual targets
            full_date_to_actual = {r["date"]: float(r["new_confirmed_analysis"] or 0) for r in sel_obs}

            last_m1_params = None
            last_m2_params = None

            for b in blocks:
                check_cancellation(run_id)

                # Slice raw prefix <= origin
                prefix_raw = [
                    Obs(
                        date=r["date"],
                        new_confirmed_raw=r["new_confirmed_raw"],
                        quality_flag=r["quality_flag"],
                    )
                    for r in obs_rows
                    if r["date"] <= b.origin
                ]
                # Normalize prefix independently
                norm_res = normalize(prefix_raw)
                prefix_dates = [o.date for o in norm_res.observations]
                prefix_y = np.array([float(o.new_confirmed_analysis or 0) for o in norm_res.observations])

                # Actual targets
                target_actuals = [full_date_to_actual.get(td, 0.0) for td in b.target_dates]

                block_maes: dict[str, float | None] = {}
                block_rmses: dict[str, float | None] = {}
                block_totals: dict[str, float | None] = {}

                # 1. Fit M1
                try:
                    m1_fit = fit_m1(
                        y_observed=prefix_y,
                        N=N,
                        susceptible_fraction=f_s,
                        gamma=gamma,
                        rho=rho,
                        beta_bounds=(config.advanced.betaBounds[0], config.advanced.betaBounds[1]),
                        i0_bounds=(config.advanced.initialInfectiousBounds[0], config.advanced.initialInfectiousBounds[1]),
                        dispersion_bounds=(config.advanced.dispersionBounds[0], config.advanced.dispersionBounds[1]),
                        n_starts=config.advanced.nStarts,
                        seed=config.advanced.seed,
                        task_id=f"m1_{b.origin}",
                        warm_start_params=last_m1_params,
                    )
                    last_m1_params = m1_fit.parameters
                    fc_m1 = forecast_from_fit(m1_fit, N=N, horizon=7).tolist()

                    mae_m1, rmse_m1, tot_m1 = compute_block_metrics(target_actuals, fc_m1)
                    block_maes["M1"] = mae_m1
                    block_rmses["M1"] = rmse_m1
                    block_totals["M1"] = tot_m1

                    split_key = f"M1_{b.split}"
                    point_errors.setdefault(split_key, []).extend(zip(target_actuals, fc_m1, strict=True))

                    # Predictive intervals if uncertainty ON
                    if uncertainty_on:
                        b_res_origin = run_parametric_bootstrap(
                            fit=m1_fit, N=N, susceptible_fraction=f_s, gamma=gamma, rho=rho,
                            n_replicates=50, bootstrap_starts=1, seed=config.advanced.seed, forecast_horizon=7,
                        )
                        m1_lower = b_res_origin.forecast_lower
                        m1_upper = b_res_origin.forecast_upper
                    else:
                        m1_lower = None
                        m1_upper = None

                    for h_idx, td in enumerate(b.target_dates):
                        forecast_records_to_insert.append({
                            "model": "M1",
                            "origin_date": b.origin,
                            "target_date": td,
                            "split": b.split,
                            "estimate": float(fc_m1[h_idx]),
                            "lower": float(m1_lower[h_idx]) if m1_lower is not None else None,
                            "upper": float(m1_upper[h_idx]) if m1_upper is not None else None,
                            "interval_unavailable_reason": None if m1_lower is not None else "Uncertainty estimation was off",
                            "actual": float(target_actuals[h_idx]),
                        })
                except Exception as exc:  # noqa: BLE001
                    logger.warning("M1 origin %s failed: %s", b.origin, exc)
                    block_maes["M1"] = None
                    block_rmses["M1"] = None
                    block_totals["M1"] = None

                tasks_done += 1
                update_progress(
                    run_id, stage="evaluating", status="EVALUATING",
                    done=tasks_done, total=total_tasks, job_id=job_id,
                )

                # 2. Fit M2
                try:
                    m2_fit = fit_m2(
                        y_observed=prefix_y,
                        dates=prefix_dates,
                        N=N,
                        susceptible_fraction=f_s,
                        gamma=gamma,
                        rho=rho,
                        beta_bounds=(config.advanced.betaBounds[0], config.advanced.betaBounds[1]),
                        i0_bounds=(config.advanced.initialInfectiousBounds[0], config.advanced.initialInfectiousBounds[1]),
                        dispersion_bounds=(config.advanced.dispersionBounds[0], config.advanced.dispersionBounds[1]),
                        cp_min_segment_days=config.advanced.cpMinSegmentDays,
                        cp_step_days=config.advanced.cpStepDays,
                        cp_search_starts=config.advanced.cpSearchStarts,
                        n_starts=config.advanced.nStarts,
                        seed=config.advanced.seed,
                        task_id=f"m2_{b.origin}",
                        warm_start_params=last_m2_params,
                    )
                    last_m2_params = m2_fit.parameters
                    fc_m2 = forecast_from_fit(m2_fit, N=N, horizon=7).tolist()

                    mae_m2, rmse_m2, tot_m2 = compute_block_metrics(target_actuals, fc_m2)
                    block_maes["M2"] = mae_m2
                    block_rmses["M2"] = rmse_m2
                    block_totals["M2"] = tot_m2

                    split_key = f"M2_{b.split}"
                    point_errors.setdefault(split_key, []).extend(zip(target_actuals, fc_m2, strict=True))

                    if uncertainty_on:
                        b_res_origin = run_parametric_bootstrap(
                            fit=m2_fit, N=N, susceptible_fraction=f_s, gamma=gamma, rho=rho,
                            n_replicates=50, bootstrap_starts=1, seed=config.advanced.seed, forecast_horizon=7,
                        )
                        m2_lower = b_res_origin.forecast_lower
                        m2_upper = b_res_origin.forecast_upper
                    else:
                        m2_lower = None
                        m2_upper = None

                    for h_idx, td in enumerate(b.target_dates):
                        forecast_records_to_insert.append({
                            "model": "M2",
                            "origin_date": b.origin,
                            "target_date": td,
                            "split": b.split,
                            "estimate": float(fc_m2[h_idx]),
                            "lower": float(m2_lower[h_idx]) if m2_lower is not None else None,
                            "upper": float(m2_upper[h_idx]) if m2_upper is not None else None,
                            "interval_unavailable_reason": None if m2_lower is not None else "Uncertainty estimation was off",
                            "actual": float(target_actuals[h_idx]),
                        })
                except Exception as exc:  # noqa: BLE001
                    logger.warning("M2 origin %s failed: %s", b.origin, exc)
                    block_maes["M2"] = None
                    block_rmses["M2"] = None
                    block_totals["M2"] = None

                tasks_done += 1
                update_progress(
                    run_id, stage="evaluating", status="EVALUATING",
                    done=tasks_done, total=total_tasks, job_id=job_id,
                )

                # 3. Baseline B1
                fc_b1 = baseline_7day_mean(prefix_y, horizon=7).tolist()
                mae_b1, rmse_b1, tot_b1 = compute_block_metrics(target_actuals, fc_b1)
                block_maes["baseline_mean"] = mae_b1
                block_rmses["baseline_mean"] = rmse_b1
                block_totals["baseline_mean"] = tot_b1
                point_errors.setdefault(f"baseline_mean_{b.split}", []).extend(zip(target_actuals, fc_b1, strict=True))

                for h_idx, td in enumerate(b.target_dates):
                    forecast_records_to_insert.append({
                        "model": "baseline_mean",
                        "origin_date": b.origin,
                        "target_date": td,
                        "split": b.split,
                        "estimate": float(fc_b1[h_idx]),
                        "lower": None,
                        "upper": None,
                        "interval_unavailable_reason": "Deterministic point baseline",
                        "actual": float(target_actuals[h_idx]),
                    })

                tasks_done += 1
                update_progress(
                    run_id, stage="evaluating", status="EVALUATING",
                    done=tasks_done, total=total_tasks, job_id=job_id,
                )

                # 4. Baseline B2
                fc_b2 = baseline_same_weekday(prefix_y, horizon=7).tolist()
                mae_b2, rmse_b2, tot_b2 = compute_block_metrics(target_actuals, fc_b2)
                block_maes["baseline_weekday"] = mae_b2
                block_rmses["baseline_weekday"] = rmse_b2
                block_totals["baseline_weekday"] = tot_b2
                point_errors.setdefault(f"baseline_weekday_{b.split}", []).extend(zip(target_actuals, fc_b2, strict=True))

                for h_idx, td in enumerate(b.target_dates):
                    forecast_records_to_insert.append({
                        "model": "baseline_weekday",
                        "origin_date": b.origin,
                        "target_date": td,
                        "split": b.split,
                        "estimate": float(fc_b2[h_idx]),
                        "lower": None,
                        "upper": None,
                        "interval_unavailable_reason": "Deterministic point baseline",
                        "actual": float(target_actuals[h_idx]),
                    })

                tasks_done += 1
                update_progress(
                    run_id, stage="evaluating", status="EVALUATING",
                    done=tasks_done, total=total_tasks, job_id=job_id,
                )

                evaluated_blocks.append(
                    BlockEvaluation(
                        index=b.index,
                        origin=b.origin,
                        split=b.split,
                        targetStart=b.target_start,
                        targetEnd=b.target_end,
                        mae=block_maes,
                        rmse=block_rmses,
                        totalError=block_totals,
                    )
                )

            # Aggregate comparisons
            model_labels = {
                "M1": "Constant transmission SIR",
                "M2": "One change point SIR",
                "baseline_mean": "7-day trailing mean baseline",
                "baseline_weekday": "Same-weekday baseline",
            }
            comparison_rows = [
                aggregate_model_metrics(m, model_labels[m], evaluated_blocks, all_model_names, point_errors)
                for m in all_model_names
            ]
            comparison_map = {r["model"]: r for r in comparison_rows}

            # Execute selection rules
            selection_summary = evaluate_selection_rules(comparison_map, evaluated_blocks)
            selected_sir_model = selection_summary["selectedSir"]

            # FITTING stage: final full-period fit of the selected SIR model
            update_progress(
                run_id, stage="fitting", status="FITTING",
                done=tasks_done, total=total_tasks, force=True, job_id=job_id,
            )
            check_cancellation(run_id)

            if selected_sir_model == "M1":
                fit_data = fit_m1(
                    y_observed=y_observed,
                    N=N,
                    susceptible_fraction=f_s,
                    gamma=gamma,
                    rho=rho,
                    beta_bounds=(config.advanced.betaBounds[0], config.advanced.betaBounds[1]),
                    i0_bounds=(config.advanced.initialInfectiousBounds[0], config.advanced.initialInfectiousBounds[1]),
                    dispersion_bounds=(config.advanced.dispersionBounds[0], config.advanced.dispersionBounds[1]),
                    n_starts=config.advanced.nStarts,
                    seed=config.advanced.seed,
                    rtol=config.advanced.rtol,
                    atol=config.advanced.atol,
                    warm_start_params=last_m1_params,
                )
            else:
                fit_data = fit_m2(
                    y_observed=y_observed,
                    dates=sel_dates,
                    N=N,
                    susceptible_fraction=f_s,
                    gamma=gamma,
                    rho=rho,
                    beta_bounds=(config.advanced.betaBounds[0], config.advanced.betaBounds[1]),
                    i0_bounds=(config.advanced.initialInfectiousBounds[0], config.advanced.initialInfectiousBounds[1]),
                    dispersion_bounds=(config.advanced.dispersionBounds[0], config.advanced.dispersionBounds[1]),
                    cp_min_segment_days=config.advanced.cpMinSegmentDays,
                    cp_step_days=config.advanced.cpStepDays,
                    cp_search_starts=config.advanced.cpSearchStarts,
                    n_starts=config.advanced.nStarts,
                    seed=config.advanced.seed,
                    rtol=config.advanced.rtol,
                    atol=config.advanced.atol,
                    warm_start_params=last_m2_params,
                )

            tasks_done += 1
            check_cancellation(run_id)

            # ESTIMATING_UNCERTAINTY on full-period fit
            bootstrap_summary = None
            if uncertainty_on:
                update_progress(
                    run_id, stage="estimating_uncertainty", status="ESTIMATING_UNCERTAINTY",
                    done=tasks_done, total=total_tasks, force=True, job_id=job_id,
                )
                b_res = run_parametric_bootstrap(
                    fit=fit_data,
                    N=N,
                    susceptible_fraction=f_s,
                    gamma=gamma,
                    rho=rho,
                    n_replicates=config.advanced.bootstrapReplicates,
                    bootstrap_starts=config.advanced.bootstrapStarts,
                    seed=config.advanced.seed,
                    forecast_horizon=7,
                )
                bootstrap_summary = {
                    "requested": b_res.requested,
                    "succeeded": b_res.succeeded,
                    "failed": b_res.failed,
                    "reliable": b_res.reliable,
                    "message": b_res.message,
                    "draws": b_res.draws[:50],
                    "failures": b_res.failures[:10],
                }
                fit_lower = b_res.fit_lower
                fit_upper = b_res.fit_upper
                tasks_done += config.advanced.bootstrapReplicates
            else:
                fit_lower = None
                fit_upper = None

            check_cancellation(run_id)

            # DIAGNOSTICS on full-period fit
            update_progress(
                run_id, stage="exporting", status="EXPORTING",
                done=tasks_done, total=total_tasks, force=True, job_id=job_id,
            )
            k_val = fit_data.parameters.get("dispersion", 50.0)
            res_items, acf_items, acf_lim = compute_residuals_and_acf(
                y_observed, fit_data.sir_result.expected_cases, k_val,
            )
            profiles = compute_parameter_profiles(
                fit=fit_data,
                y_observed=y_observed,
                N=N,
                susceptible_fraction=f_s,
                gamma=gamma,
                rho=rho,
                beta_bounds=(config.advanced.betaBounds[0], config.advanced.betaBounds[1]),
                i0_bounds=(config.advanced.initialInfectiousBounds[0], config.advanced.initialInfectiousBounds[1]),
                dispersion_bounds=(config.advanced.dispersionBounds[0], config.advanced.dispersionBounds[1]),
                n_points=15,
            )
            diag_status, diag_warnings = assess_diagnostics_status(
                fit_data.convergence,
                fit_data.boundary_hits,
                acf_items,
                acf_lim,
                bootstrap_reliable=bootstrap_summary["reliable"] if bootstrap_summary else None,
            )

            # Build series array
            series_arr = []
            for d_idx, d_str in enumerate(sel_dates):
                series_arr.append({
                    "date": d_str,
                    "observed": float(y_observed[d_idx]),
                    "expected": float(fit_data.sir_result.expected_cases[d_idx]),
                    "lower": float(fit_lower[d_idx]) if fit_lower is not None else None,
                    "upper": float(fit_upper[d_idx]) if fit_upper is not None else None,
                    "S": float(fit_data.sir_result.S[d_idx]),
                    "I": float(fit_data.sir_result.I[d_idx]),
                    "R": float(fit_data.sir_result.R[d_idx]),
                    "C": float(fit_data.sir_result.C[d_idx]),
                    "beta": float(fit_data.sir_result.beta[d_idx]),
                    "rEff": float(fit_data.sir_result.r_eff[d_idx]),
                })

            final_state = {
                "date": sel_dates[-1],
                "S": float(fit_data.sir_result.S[-1]),
                "I": float(fit_data.sir_result.I[-1]),
                "R": float(fit_data.sir_result.R[-1]),
                "C": float(fit_data.sir_result.C[-1]),
                "beta": float(fit_data.parameters.get("beta2") or fit_data.parameters.get("beta", 0.0)),
            }

            blocks_serializable = [
                {
                    "index": b.index,
                    "origin": b.origin,
                    "split": b.split,
                    "targetStart": b.targetStart,
                    "targetEnd": b.targetEnd,
                    "mae": b.mae,
                    "rmse": b.rmse,
                    "totalError": b.totalError,
                }
                for b in evaluated_blocks
            ]

            evaluation_summary = {
                "origins": [b.origin for b in evaluated_blocks],
                "blocks": blocks_serializable,
                "comparison": comparison_rows,
                "selection": selection_summary,
                "incomplete": any(r["status"] != "ok" for r in comparison_rows),
                "incompleteReasons": [
                    f"{r['model']}: {r['reason']}" for r in comparison_rows if r["reason"]
                ],
                "retrospectiveNote": retrospective_note,
            }

        # Build full payload
        import json
        payload = {
            "schemaVersion": 1,
            "run": {
                "id": run_id,
                "mode": mode,
                "modelType": config.modelType,
                "selectedSirModel": selected_sir_model,
                "completedAt": datetime.now(UTC).isoformat(),
                "codeVersion": get_code_version(),
                "seed": config.advanced.seed,
                "protocolVersion": protocol_version if mode == "EVALUATE" else None,
            },
            "assumptions": {
                "infectiousDurationDays": config.infectiousDurationDays,
                "gamma": float(gamma),
                "reportingFraction": float(rho),
                "susceptibleFraction": float(f_s),
                "population": {
                    "value": config.population.value,
                    "sourceUrl": config.population.sourceUrl,
                    "referenceYear": config.population.referenceYear,
                    "geography": config.population.geography,
                },
                "sInitial": float(s_initial),
                "rInitial": float(r_initial),
                "note": "Reporting fraction and susceptibility are assumptions, not estimates.",
            },
            "parameters": fit_data.parameters,
            "changePoint": fit_data.change_point,
            "series": series_arr,
            "finalState": final_state,
            "diagnostics": {
                "residuals": res_items,
                "acf": acf_items,
                "acfLimit": acf_lim,
                "profiles": profiles,
                "warnings": diag_warnings,
                "status": diag_status,
            },
            "convergence": fit_data.convergence,
            "boundaryHits": fit_data.boundary_hits,
            "bootstrap": bootstrap_summary,
            "evaluation": evaluation_summary,
        }

        # PERSISTENCE: Single atomic transaction
        check_cancellation(run_id)
        with get_connection() as conn:
            with conn.cursor() as cur:
                # 1. Insert fit_results
                cur.execute(
                    """
                    INSERT INTO fit_results (
                        run_id, parameters, parameter_intervals, assumptions,
                        convergence, boundary_hits, change_point, payload, created_at
                    ) VALUES (
                        %(run_id)s, %(params)s::jsonb, %(intervals)s::jsonb, %(assumptions)s::jsonb,
                        %(conv)s::jsonb, %(bounds)s::jsonb, %(cp)s::jsonb, %(payload)s::jsonb, now()
                    )
                    ON CONFLICT (run_id) DO UPDATE SET
                        parameters = EXCLUDED.parameters,
                        parameter_intervals = EXCLUDED.parameter_intervals,
                        assumptions = EXCLUDED.assumptions,
                        convergence = EXCLUDED.convergence,
                        boundary_hits = EXCLUDED.boundary_hits,
                        change_point = EXCLUDED.change_point,
                        payload = EXCLUDED.payload
                    """,
                    {
                        "run_id": run_id,
                        "params": json.dumps(fit_data.parameters),
                        "intervals": json.dumps(bootstrap_summary) if bootstrap_summary else None,
                        "assumptions": json.dumps(payload["assumptions"]),
                        "conv": json.dumps(fit_data.convergence),
                        "bounds": json.dumps(fit_data.boundary_hits),
                        "cp": json.dumps(fit_data.change_point) if fit_data.change_point else None,
                        "payload": json.dumps(payload),
                    },
                )

                # 2. Bulk insert forecast_rows if any
                if forecast_records_to_insert:
                    cur.execute("DELETE FROM forecast_rows WHERE run_id = %(run_id)s", {"run_id": run_id})
                    insert_query = """
                        INSERT INTO forecast_rows (
                            run_id, model, origin_date, target_date, split,
                            estimate, lower, upper, interval_unavailable_reason, actual
                        ) VALUES (
                            %(run_id)s, %(model)s, %(origin_date)s::date, %(target_date)s::date, %(split)s,
                            %(estimate)s, %(lower)s, %(upper)s, %(reason)s, %(actual)s
                        )
                    """
                    for f_rec in forecast_records_to_insert:
                        cur.execute(
                            insert_query,
                            {
                                "run_id": run_id,
                                "model": f_rec["model"],
                                "origin_date": f_rec["origin_date"],
                                "target_date": f_rec["target_date"],
                                "split": f_rec["split"],
                                "estimate": f_rec["estimate"],
                                "lower": f_rec["lower"],
                                "upper": f_rec["upper"],
                                "reason": f_rec["interval_unavailable_reason"],
                                "actual": f_rec["actual"],
                            },
                        )

                # 3. Update runs table
                cur.execute(
                    """
                    UPDATE runs
                    SET status = 'COMPLETED',
                        stage = 'completed',
                        progress_done = progress_total,
                        has_fit = true,
                        evaluated = %(evaluated)s,
                        completed_at = now()
                    WHERE id = %(id)s
                    """,
                    {
                        "id": run_id,
                        "evaluated": (mode == "EVALUATE"),
                    },
                )

                # 4. Update jobs table if job_id provided
                if job_id:
                    cur.execute(
                        "UPDATE jobs SET status = 'DONE', updated_at = now() WHERE id = %(jid)s",
                        {"jid": job_id},
                    )

            conn.commit()

        logger.info("Analysis run %s completed successfully", run_id)

    except RunPipelineCancelled:
        logger.info("Run %s cancelled by cooperative cancellation", run_id)
        execute(
            """
            UPDATE runs
            SET status = 'CANCELLED',
                stage = 'cancelled',
                completed_at = now()
            WHERE id = %(id)s
            """,
            {"id": run_id},
        )
        if job_id:
            execute(
                "UPDATE jobs SET status = 'CANCELLED', updated_at = now() WHERE id = %(jid)s",
                {"jid": job_id},
            )

    except Exception as exc:
        logger.exception("Run %s failed with exception", run_id)
        err_ref, err_msg = _map_error_message(exc)
        execute(
            """
            UPDATE runs
            SET status = 'FAILED',
                stage = 'failed',
                error_reference = %(ref)s,
                error_message = %(msg)s,
                completed_at = now()
            WHERE id = %(id)s
            """,
            {"id": run_id, "ref": err_ref, "msg": err_msg},
        )
        if job_id:
            execute(
                """
                UPDATE jobs
                SET status = 'FAILED',
                    last_error = %(msg)s,
                    updated_at = now()
                WHERE id = %(jid)s
                """,
                {"jid": job_id, "msg": f"{err_ref}: {err_msg}"},
            )
