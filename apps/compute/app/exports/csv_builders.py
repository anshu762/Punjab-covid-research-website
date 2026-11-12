"""CSV export builders with strict spreadsheet formula neutralization."""
from __future__ import annotations

import csv
import io
from typing import Any

from app.db import fetch_all

FORMULA_PREFIXES = ("=", "+", "-", "@", "\t", "\r")


def neutralize(val: Any) -> Any:
    """Neutralize spreadsheet formulas in text cells by prepending single quote."""
    if isinstance(val, str) and val.startswith(FORMULA_PREFIXES):
        return f"'{val}"
    return val


def build_cleaned_dataset_csv(dataset_id: str) -> str:
    """Export normalized time-series observations for a dataset."""
    rows = fetch_all(
        """
        SELECT date, confirmed, deceased, recovered, tested
        FROM observations
        WHERE dataset_id = %(ds)s
        ORDER BY date ASC
        """,
        {"ds": dataset_id},
    )

    output = io.StringIO()
    writer = csv.writer(output, lineterminator="\n")
    writer.writerow(["date", "confirmed", "deceased", "recovered", "tested"])

    for r in rows:
        d_str = r["date"].strftime("%Y-%m-%d") if hasattr(r["date"], "strftime") else str(r["date"])
        writer.writerow([
            neutralize(d_str),
            r["confirmed"],
            r.get("deceased"),
            r.get("recovered"),
            r.get("tested"),
        ])

    return output.getvalue()


def build_correction_log_csv(dataset_id: str) -> str:
    """Export data cleaning anomaly and correction log."""
    rows = fetch_all(
        """
        SELECT date, original, corrected, rule_applied, anomaly_flag
        FROM anomaly_logs
        WHERE dataset_id = %(ds)s
        ORDER BY date ASC
        """,
        {"ds": dataset_id},
    )

    output = io.StringIO()
    writer = csv.writer(output, lineterminator="\n")
    writer.writerow(["date", "original", "corrected", "rule_applied", "anomaly_flag"])

    for r in rows:
        d_str = r["date"].strftime("%Y-%m-%d") if hasattr(r["date"], "strftime") else str(r["date"])
        writer.writerow([
            neutralize(d_str),
            r.get("original"),
            r.get("corrected"),
            neutralize(r.get("rule_applied", "")),
            r.get("anomaly_flag", False),
        ])

    return output.getvalue()


def build_fitted_states_csv(payload: dict[str, Any]) -> str:
    """Export fitted series latent states [S, I, R, C, beta, rEff] and incidence."""
    series = payload.get("series", [])

    output = io.StringIO()
    writer = csv.writer(output, lineterminator="\n")
    writer.writerow([
        "date",
        "observed_cases",
        "expected_cases",
        "lower_95",
        "upper_95",
        "S_persons",
        "I_persons",
        "R_persons",
        "C_persons",
        "beta_per_day",
        "r_eff",
    ])

    for pt in series:
        writer.writerow([
            neutralize(str(pt.get("date", ""))),
            pt.get("observed"),
            f"{pt.get('expected', 0.0):.2f}" if pt.get("expected") is not None else "",
            f"{pt.get('lower', 0.0):.2f}" if pt.get("lower") is not None else "",
            f"{pt.get('upper', 0.0):.2f}" if pt.get("upper") is not None else "",
            f"{pt.get('S', 0.0):.1f}" if pt.get("S") is not None else "",
            f"{pt.get('I', 0.0):.1f}" if pt.get("I") is not None else "",
            f"{pt.get('R', 0.0):.1f}" if pt.get("R") is not None else "",
            f"{pt.get('C', 0.0):.1f}" if pt.get("C") is not None else "",
            f"{pt.get('beta', 0.0):.4f}" if pt.get("beta") is not None else "",
            f"{pt.get('rEff', 0.0):.4f}" if pt.get("rEff") is not None else "",
        ])

    return output.getvalue()


def build_forecasts_csv(run_id: str) -> str:
    """Export rolling 7-day held-out forecast evaluation rows."""
    rows = fetch_all(
        """
        SELECT model, origin_date, target_date, split, estimate, lower, upper, actual, interval_unavailable_reason
        FROM forecast_rows
        WHERE run_id = %(rid)s
        ORDER BY origin_date ASC, target_date ASC, model ASC
        """,
        {"rid": run_id},
    )

    output = io.StringIO()
    writer = csv.writer(output, lineterminator="\n")
    writer.writerow([
        "origin_date",
        "target_date",
        "model",
        "split",
        "estimate",
        "lower_95",
        "upper_95",
        "actual",
        "error",
        "interval_status",
    ])

    for r in rows:
        o_date = r["origin_date"].strftime("%Y-%m-%d") if hasattr(r["origin_date"], "strftime") else str(r["origin_date"])
        t_date = r["target_date"].strftime("%Y-%m-%d") if hasattr(r["target_date"], "strftime") else str(r["target_date"])
        est = float(r["estimate"])
        act = float(r["actual"])
        err = est - act
        status = r.get("interval_unavailable_reason") or "available"

        writer.writerow([
            neutralize(o_date),
            neutralize(t_date),
            neutralize(str(r["model"])),
            neutralize(str(r["split"])),
            f"{est:.2f}",
            f"{r['lower']:.2f}" if r.get("lower") is not None else "",
            f"{r['upper']:.2f}" if r.get("upper") is not None else "",
            f"{act:.2f}",
            f"{err:.2f}",
            neutralize(status),
        ])

    return output.getvalue()


def build_metrics_csv(payload: dict[str, Any]) -> str:
    """Export comparison metrics and blocks summary."""
    evaluation = payload.get("evaluation")
    if not evaluation:
        return "model,status,note\nSIR,Fit-only,Forecast evaluation was not run\n"

    comparison = evaluation.get("comparison", [])
    output = io.StringIO()
    writer = csv.writer(output, lineterminator="\n")
    writer.writerow([
        "model",
        "label",
        "development_mae",
        "final_mae",
        "final_rmse",
        "mean_abs_total_error",
        "blocks_won",
        "status",
        "reason",
    ])

    for row in comparison:
        writer.writerow([
            neutralize(str(row.get("model", ""))),
            neutralize(str(row.get("label", ""))),
            f"{row['developmentMae']:.2f}" if row.get("developmentMae") is not None else "",
            f"{row['finalMae']:.2f}" if row.get("finalMae") is not None else "",
            f"{row['finalRmse']:.2f}" if row.get("finalRmse") is not None else "",
            f"{row['meanAbsTotalError']:.2f}" if row.get("meanAbsTotalError") is not None else "",
            row.get("blocksWon", 0),
            neutralize(str(row.get("status", "ok"))),
            neutralize(str(row.get("reason") or "")),
        ])

    return output.getvalue()


def build_scenario_csv(scenario_row: dict[str, Any]) -> str:
    """Export daily scenario outputs."""
    daily = scenario_row.get("daily_outputs") or scenario_row.get("dailyOutputs") or []
    if isinstance(daily, str):
        import json
        daily = json.loads(daily)

    output = io.StringIO()
    writer = csv.writer(output, lineterminator="\n")
    writer.writerow([
        "date",
        "baseline_expected_cases",
        "scenario_expected_cases",
        "cases_diff",
        "cases_lower_95",
        "cases_upper_95",
        "baseline_infections",
        "scenario_infections",
        "infections_diff",
        "infections_lower_95",
        "infections_upper_95",
    ])

    for d in daily:
        c_int = d.get("casesInterval") or {}
        i_int = d.get("infectionsInterval") or {}

        writer.writerow([
            neutralize(str(d.get("date", ""))),
            f"{d.get('baselineExpectedCases', 0.0):.2f}",
            f"{d.get('scenarioExpectedCases', 0.0):.2f}",
            f"{d.get('scenarioExpectedCases', 0.0) - d.get('baselineExpectedCases', 0.0):.2f}",
            f"{c_int['lower']:.2f}" if "lower" in c_int else "",
            f"{c_int['upper']:.2f}" if "upper" in c_int else "",
            f"{d.get('baselineInfections', 0.0):.1f}",
            f"{d.get('scenarioInfections', 0.0):.1f}",
            f"{d.get('scenarioInfections', 0.0) - d.get('baselineInfections', 0.0):.1f}",
            f"{i_int['lower']:.1f}" if "lower" in i_int else "",
            f"{i_int['upper']:.1f}" if "upper" in i_int else "",
        ])

    return output.getvalue()
