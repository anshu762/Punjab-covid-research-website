"""Publication-grade Matplotlib figure generators at 300 DPI."""
from __future__ import annotations

import io
from typing import Any

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import numpy as np
from datetime import datetime


def render_observed_and_fitted_figure(
    payload: dict[str, Any],
    format: str = "png",
) -> bytes:
    """Generate 300 DPI publication figure for observed cases and fitted SIR incidence."""
    series = payload.get("series", [])
    if not series:
        fig, ax = plt.subplots(figsize=(10, 5.625), dpi=300)
        ax.text(0.5, 0.5, "No series data available", ha="center", va="center")
        buf = io.BytesIO()
        fig.savefig(buf, format=format, dpi=300, bbox_inches="tight")
        plt.close(fig)
        return buf.getvalue()

    dates = [datetime.strptime(pt["date"], "%Y-%m-%d") for pt in series]
    observed = [pt.get("observed") for pt in series]
    expected = [pt.get("expected", 0.0) for pt in series]
    lowers = [pt.get("lower") for pt in series]
    uppers = [pt.get("upper") for pt in series]

    fig, ax = plt.subplots(figsize=(10, 5.625), dpi=300)
    fig.patch.set_facecolor("#FFFFFF")
    ax.set_facecolor("#FFFFFF")

    # Grid
    ax.grid(True, linestyle="--", alpha=0.5, color="#E2E8F0")

    # Observed cases (ink points/bars)
    obs_dates = [d for d, o in zip(dates, observed) if o is not None]
    obs_vals = [o for o in observed if o is not None]
    if obs_vals:
        ax.scatter(obs_dates, obs_vals, color="#0F172A", s=18, label="Observed cases", zorder=3)

    # Uncertainty interval
    valid_intervals = [
        (d, l, u) for d, l, u in zip(dates, lowers, uppers) if l is not None and u is not None
    ]
    if valid_intervals:
        int_dates = [x[0] for x in valid_intervals]
        int_low = [x[1] for x in valid_intervals]
        int_up = [x[2] for x in valid_intervals]
        ax.fill_between(
            int_dates,
            int_low,
            int_up,
            color="#2563EB",
            alpha=0.18,
            label="95% Predictive interval",
            zorder=2,
        )

    # Fitted line
    model_type = payload.get("run", {}).get("modelType", "SIR")
    line_style = "--" if model_type == "M1" else ":"
    line_color = "#2563EB" if model_type == "M1" else "#0891B2"
    ax.plot(
        dates,
        expected,
        color=line_color,
        linestyle=line_style,
        linewidth=2.2,
        label=f"{model_type} Fitted incidence",
        zorder=4,
    )

    # Format Axes
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%d %b %Y"))
    ax.xaxis.set_major_locator(mdates.AutoDateLocator())
    fig.autofmt_xdate(rotation=25)

    ax.set_ylabel("Daily Reported Cases", fontsize=11, color="#0F172A", labelpad=8)
    ax.set_title("EpiLens — Observed Daily Cases & Calibrated SIR Model", fontsize=13, fontweight="bold", color="#0F172A", pad=12)

    ax.legend(frameon=True, facecolor="#FFFFFF", edgecolor="#E2E8F0", fontsize=9, loc="upper right")
    ax.set_ylim(bottom=0)

    # Annotation Block (Title, Period, Assumptions)
    start_str = series[0]["date"]
    end_str = series[-1]["date"]
    assumptions = payload.get("assumptions", {})
    gamma_str = f"{assumptions.get('gamma', 0.1428):.4f}"
    rho_str = f"{round(assumptions.get('reportingFraction', 0.2) * 100)}%"

    caption_text = (
        f"Period: {start_str} to {end_str} · Assumptions: γ = {gamma_str}/day, ρ = {rho_str} (assumed) · "
        f"Model: {model_type} · 300 DPI Reproducibility Export"
    )
    fig.text(0.08, -0.04, caption_text, fontsize=8, color="#64748B", ha="left")

    buf = io.BytesIO()
    fig.savefig(buf, format=format, dpi=300, bbox_inches="tight")
    plt.close(fig)
    return buf.getvalue()


def render_scenario_figure(
    daily_outputs: list[dict[str, Any]],
    summary: dict[str, Any],
    format: str = "png",
) -> bytes:
    """Generate 300 DPI publication figure for forward policy scenarios."""
    if not daily_outputs:
        fig, ax = plt.subplots(figsize=(10, 5.625), dpi=300)
        ax.text(0.5, 0.5, "No scenario data available", ha="center", va="center")
        buf = io.BytesIO()
        fig.savefig(buf, format=format, dpi=300, bbox_inches="tight")
        plt.close(fig)
        return buf.getvalue()

    dates = [datetime.strptime(d["date"], "%Y-%m-%d") for d in daily_outputs]
    base_cases = [d["baselineExpectedCases"] for d in daily_outputs]
    scen_cases = [d["scenarioExpectedCases"] for d in daily_outputs]

    fig, ax = plt.subplots(figsize=(10, 5.625), dpi=300)
    fig.patch.set_facecolor("#FFFFFF")
    ax.set_facecolor("#FFFFFF")
    ax.grid(True, linestyle="--", alpha=0.5, color="#E2E8F0")

    # Paired bootstrap band
    has_interval = any(d.get("casesInterval") for d in daily_outputs)
    if has_interval:
        lowers = [d.get("casesInterval", {}).get("lower", d["scenarioExpectedCases"]) for d in daily_outputs]
        uppers = [d.get("casesInterval", {}).get("upper", d["scenarioExpectedCases"]) for d in daily_outputs]
        ax.fill_between(
            dates,
            lowers,
            uppers,
            color="#0891B2",
            alpha=0.18,
            label="95% Paired interval (conditional on assumptions)",
            zorder=2,
        )

    # Baseline line (solid blue)
    ax.plot(
        dates,
        base_cases,
        color="#2563EB",
        linestyle="-",
        linewidth=2.2,
        label="Baseline projection (fitted β)",
        zorder=3,
    )

    # Scenario line (dashed teal)
    pct = summary.get("percentChange", 0)
    sign_str = f"+{pct}%" if pct > 0 else f"{pct}%"
    ax.plot(
        dates,
        scen_cases,
        color="#0891B2",
        linestyle="--",
        linewidth=2.2,
        label=f"Scenario projection ({sign_str} transmission)",
        zorder=4,
    )

    ax.xaxis.set_major_formatter(mdates.DateFormatter("%d %b %Y"))
    ax.xaxis.set_major_locator(mdates.AutoDateLocator())
    fig.autofmt_xdate(rotation=25)

    ax.set_ylabel("Expected Daily Reported Cases", fontsize=11, color="#0F172A", labelpad=8)
    ax.set_title("EpiLens — Forward Scenario Simulation", fontsize=13, fontweight="bold", color="#0F172A", pad=12)
    ax.legend(frameon=True, facecolor="#FFFFFF", edgecolor="#E2E8F0", fontsize=9, loc="upper right")
    ax.set_ylim(bottom=0)

    caption_text = (
        f"Hypothetical simulation under fitted model: {summary.get('horizonDays')} days from {summary.get('startDate')} · "
        f"β {summary.get('baselineBeta', 0):.4f} → {summary.get('scenarioBeta', 0):.4f} · "
        f"Not a causal policy evaluation · 300 DPI Export"
    )
    fig.text(0.08, -0.04, caption_text, fontsize=8, color="#64748B", ha="left")

    buf = io.BytesIO()
    fig.savefig(buf, format=format, dpi=300, bbox_inches="tight")
    plt.close(fig)
    return buf.getvalue()
