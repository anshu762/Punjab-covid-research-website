"""Scenario simulation engine.

Simulates forward hypothetical scenarios with paired bootstrap draws,
strict parameter locking, and deterministic plain-language reporting without
forbidden causal/policy-impact claims.
"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

import numpy as np

from app.models.sir import simulate_forward

FORBIDDEN_WORDS = [
    "lives saved",
    "life saved",
    "lives lost",
    "proven",
    "policy impact",
    "cases prevented",
    "case prevented",
    "guaranteed",
]


def contains_forbidden_words(text: str) -> bool:
    lower = text.lower()
    return any(w in lower for w in FORBIDDEN_WORDS)


def format_scenario_sentence(
    start_date: str,
    horizon_days: int,
    percent_change: int,
    baseline_beta: float,
    scenario_beta: float,
    baseline_expected_cases: float,
    scenario_expected_cases: float,
    expected_cases_diff: float,
    expected_cases_pct_diff: float | None,
    baseline_infections: float,
    scenario_infections: float,
    infections_diff: float,
    infections_pct_diff: float | None,
) -> str:
    """Format deterministic scenario sentence strictly per PRD §4."""
    # Format start_date e.g. "01 Dec 2020"
    dt = datetime.strptime(start_date, "%Y-%m-%d")
    formatted_start = dt.strftime("%d %b %Y")

    sign_str = f"+{percent_change}%" if percent_change > 0 else f"{percent_change}%"
    b0_str = f"{baseline_beta:.4f}"
    b1_str = f"{scenario_beta:.4f}"

    a_cases = f"{round(scenario_expected_cases):,}"
    b_cases = f"{round(baseline_expected_cases):,}"
    c_infect = f"{round(scenario_infections):,}"
    d_infect = f"{round(baseline_infections):,}"

    diff_cases_str = (
        f"+{round(expected_cases_diff):,}"
        if expected_cases_diff > 0
        else f"{round(expected_cases_diff):,}"
    )
    if expected_cases_pct_diff is not None:
        pct_sign = "+" if expected_cases_pct_diff > 0 else ""
        pct_cases_str = f"{pct_sign}{expected_cases_pct_diff:.1f}%"
    else:
        pct_cases_str = "Undefined (baseline is zero)"

    diff_infect_str = (
        f"+{round(infections_diff):,}"
        if infections_diff > 0
        else f"{round(infections_diff):,}"
    )
    if infections_pct_diff is not None:
        pct_sign = "+" if infections_pct_diff > 0 else ""
        pct_infect_str = f"{pct_sign}{infections_pct_diff:.1f}%"
    else:
        pct_infect_str = "Undefined (baseline is zero)"

    sentence = (
        f"Hypothetical simulation under the fitted model: from {formatted_start} for {horizon_days} days, "
        f"changing transmission by {sign_str} (β {b0_str} → {b1_str} per day) gives {a_cases} expected reported cases "
        f"versus {b_cases} at the baseline ({diff_cases_str}, {pct_cases_str}); "
        f"cumulative model infections {c_infect} versus {d_infect} ({diff_infect_str}, {pct_infect_str})."
    )

    if contains_forbidden_words(sentence):
        raise ValueError("Scenario sentence violates policy impact wording guidelines.")

    return sentence


def run_scenario_simulation(
    parent_payload: dict[str, Any],
    percent_change: int,
    horizon_days: int,
) -> dict[str, Any]:
    """Execute forward scenario simulation against parent fit payload."""
    if not (-50 <= percent_change <= 50):
        raise ValueError(f"percent_change must be in [-50, 50], got {percent_change}")
    if percent_change % 5 != 0:
        raise ValueError(f"percent_change must be a multiple of 5, got {percent_change}")
    if not (7 <= horizon_days <= 60):
        raise ValueError(f"horizon_days must be in [7, 60], got {horizon_days}")

    final_state = parent_payload["finalState"]
    assumptions = parent_payload["assumptions"]
    last_date_str = final_state["date"]

    # Start date = day immediately after the fitted period's last date
    last_dt = datetime.strptime(last_date_str, "%Y-%m-%d")
    start_dt = last_dt + timedelta(days=1)
    start_date_str = start_dt.strftime("%Y-%m-%d")

    s0 = float(final_state["S"])
    i0 = float(final_state["I"])
    r0 = float(final_state["R"])
    c0 = float(final_state.get("C", 0.0))
    start_state = {"S": s0, "I": i0, "R": r0, "C": c0}

    pop_count = int(
        assumptions["population"].get("value", assumptions["population"].get("count", 30000000))
    )
    gamma = float(assumptions["gamma"])
    rho = float(assumptions["reportingFraction"])

    # Baseline beta: for M2 this is final beta (beta2); for M1 it is beta
    baseline_beta = float(final_state["beta"])
    scenario_beta = float(baseline_beta * (1.0 + percent_change / 100.0))

    # Integrate baseline and scenario from IDENTICAL starting conditions
    base_res = simulate_forward(
        state=start_state,
        beta=baseline_beta,
        days=horizon_days,
        gamma=gamma,
        rho=rho,
        N=pop_count,
    )
    scen_res = simulate_forward(
        state=start_state,
        beta=scenario_beta,
        days=horizon_days,
        gamma=gamma,
        rho=rho,
        N=pop_count,
    )

    # Check for paired bootstrap draws
    bootstrap_info = parent_payload.get("bootstrap")
    valid_draws = []
    if bootstrap_info and bootstrap_info.get("draws"):
        for draw in bootstrap_info["draws"]:
            if draw.get("ok") and draw.get("finalState"):
                valid_draws.append(draw)

    # Daily outputs computation
    daily_outputs: list[dict[str, Any]] = []
    base_cases = base_res.expected_cases
    scen_cases = scen_res.expected_cases

    # Delta C per day (model infections)
    base_infections = np.diff(base_res.C)
    scen_infections = np.diff(scen_res.C)

    base_cum_cases = np.cumsum(base_cases)
    scen_cum_cases = np.cumsum(scen_cases)

    base_cum_infections = base_res.C[1:] - c0
    scen_cum_infections = scen_res.C[1:] - c0

    # Paired bootstrap calculations if >= 10 successful draws
    has_bootstrap = len(valid_draws) >= 10
    boot_daily_cases: list[np.ndarray] = []
    boot_daily_infections: list[np.ndarray] = []
    boot_cum_cases: list[float] = []
    boot_cum_infections: list[float] = []
    boot_pct_cases: list[float] = []
    boot_pct_infections: list[float] = []

    if has_bootstrap:
        for draw in valid_draws:
            d_state = draw["finalState"]
            d_s0 = float(d_state["S"])
            d_i0 = float(d_state["I"])
            d_r0 = float(d_state["R"])
            d_c0 = float(d_state.get("C", 0.0))
            d_start = {"S": d_s0, "I": d_i0, "R": d_r0, "C": d_c0}

            d_base_beta = float(draw.get("finalBeta", d_state.get("beta", baseline_beta)))
            d_scen_beta = float(d_base_beta * (1.0 + percent_change / 100.0))

            d_base = simulate_forward(
                state=d_start,
                beta=d_base_beta,
                days=horizon_days,
                gamma=gamma,
                rho=rho,
                N=pop_count,
            )
            d_scen = simulate_forward(
                state=d_start,
                beta=d_scen_beta,
                days=horizon_days,
                gamma=gamma,
                rho=rho,
                N=pop_count,
            )

            boot_daily_cases.append(d_scen.expected_cases)
            d_scen_inf = np.diff(d_scen.C)
            boot_daily_infections.append(d_scen_inf)

            d_b_tot_c = float(np.sum(d_base.expected_cases))
            d_s_tot_c = float(np.sum(d_scen.expected_cases))
            boot_cum_cases.append(d_s_tot_c)
            if d_b_tot_c > 0:
                boot_pct_cases.append(((d_s_tot_c - d_b_tot_c) / d_b_tot_c) * 100.0)

            d_b_tot_i = float(d_base.C[-1] - d_c0)
            d_s_tot_i = float(d_scen.C[-1] - d_c0)
            boot_cum_infections.append(d_s_tot_i)
            if d_b_tot_i > 0:
                boot_pct_infections.append(((d_s_tot_i - d_b_tot_i) / d_b_tot_i) * 100.0)

    for d in range(horizon_days):
        day_date = (start_dt + timedelta(days=d)).strftime("%Y-%m-%d")
        daily_record: dict[str, Any] = {
            "date": day_date,
            "baselineExpectedCases": float(base_cases[d]),
            "scenarioExpectedCases": float(scen_cases[d]),
            "baselineInfections": float(base_infections[d]),
            "scenarioInfections": float(scen_infections[d]),
            "baselineCumCases": float(base_cum_cases[d]),
            "scenarioCumCases": float(scen_cum_cases[d]),
            "baselineCumInfections": float(base_cum_infections[d]),
            "scenarioCumInfections": float(scen_cum_infections[d]),
        }

        if has_bootstrap and boot_daily_cases:
            cases_stack = np.array([b[d] for b in boot_daily_cases])
            c_low, c_high = np.percentile(cases_stack, [2.5, 97.5])
            daily_record["casesInterval"] = {
                "lower": float(c_low),
                "upper": float(c_high),
            }

            inf_stack = np.array([b[d] for b in boot_daily_infections])
            i_low, i_high = np.percentile(inf_stack, [2.5, 97.5])
            daily_record["infectionsInterval"] = {
                "lower": float(i_low),
                "upper": float(i_high),
            }

        daily_outputs.append(daily_record)

    tot_base_cases = float(np.sum(base_cases))
    tot_scen_cases = float(np.sum(scen_cases))
    diff_cases = tot_scen_cases - tot_base_cases
    pct_cases = (
        ((tot_scen_cases - tot_base_cases) / tot_base_cases) * 100.0
        if tot_base_cases > 0
        else None
    )

    tot_base_inf = float(base_res.C[-1] - c0)
    tot_scen_inf = float(scen_res.C[-1] - c0)
    diff_inf = tot_scen_inf - tot_base_inf
    pct_inf = (
        ((tot_scen_inf - tot_base_inf) / tot_base_inf) * 100.0
        if tot_base_inf > 0
        else None
    )

    summary_text = format_scenario_sentence(
        start_date=start_date_str,
        horizon_days=horizon_days,
        percent_change=percent_change,
        baseline_beta=baseline_beta,
        scenario_beta=scenario_beta,
        baseline_expected_cases=tot_base_cases,
        scenario_expected_cases=tot_scen_cases,
        expected_cases_diff=diff_cases,
        expected_cases_pct_diff=pct_cases,
        baseline_infections=tot_base_inf,
        scenario_infections=tot_scen_inf,
        infections_diff=diff_inf,
        infections_pct_diff=pct_inf,
    )

    summary: dict[str, Any] = {
        "startDate": start_date_str,
        "horizonDays": horizon_days,
        "percentChange": percent_change,
        "baselineBeta": baseline_beta,
        "scenarioBeta": scenario_beta,
        "baselineExpectedCases": tot_base_cases,
        "scenarioExpectedCases": tot_scen_cases,
        "expectedCasesDiff": diff_cases,
        "expectedCasesPctDiff": pct_cases,
        "baselineInfections": tot_base_inf,
        "scenarioInfections": tot_scen_inf,
        "infectionsDiff": diff_inf,
        "infectionsPctDiff": pct_inf,
        "summaryText": summary_text,
    }

    if has_bootstrap:
        if boot_cum_cases:
            c_low, c_high = np.percentile(boot_cum_cases, [2.5, 97.5])
            summary["casesInterval"] = {"lower": float(c_low), "upper": float(c_high)}
        if boot_cum_infections:
            i_low, i_high = np.percentile(boot_cum_infections, [2.5, 97.5])
            summary["infectionsInterval"] = {"lower": float(i_low), "upper": float(i_high)}
        if boot_pct_cases:
            p_low, p_high = np.percentile(boot_pct_cases, [2.5, 97.5])
            summary["pctCasesInterval"] = {"lower": float(p_low), "upper": float(p_high)}
        if boot_pct_infections:
            p_low, p_high = np.percentile(boot_pct_infections, [2.5, 97.5])
            summary["pctInfectionsInterval"] = {"lower": float(p_low), "upper": float(p_high)}

    return {
        "dailyOutputs": daily_outputs,
        "summary": summary,
        "config": {
            "percentChange": percent_change,
            "horizonDays": horizon_days,
            "startDate": start_date_str,
        },
    }
