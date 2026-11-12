"use client";

import React, { useMemo } from "react";
import { formatInt, formatNumber } from "@epilens/shared";
import type { FitResultPayload } from "@epilens/shared";
import { CheckCircle2, AlertTriangle, HelpCircle, Lock, Sliders, ShieldAlert, Sparkles } from "lucide-react";

interface ParameterTableProps {
  payload: FitResultPayload;
}

interface ParameterRow {
  symbol: string;
  name: string;
  value: string;
  units: string;
  kind: "fitted" | "fixed" | "assumed" | "inferred";
  tooltip: string;
  interval: string;
  note?: string;
}

function quantile(arr: number[], q: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
}

export function ParameterTable({ payload }: ParameterTableProps) {
  const { parameters, assumptions, changePoint, convergence, boundaryHits, bootstrap } = payload;
  const isM2 = payload.run.modelType === "M2";

  // Compute bootstrap quantiles if draws exist
  const bootstrapIntervals = useMemo(() => {
    if (!bootstrap || !bootstrap.reliable || !bootstrap.draws || bootstrap.draws.length === 0) {
      return null;
    }

    const validDraws = bootstrap.draws.filter((d) => d.ok && d.parameters);
    if (validDraws.length < 10) return null;

    const valuesByParam: Record<string, number[]> = {};
    for (const draw of validDraws) {
      if (!draw.parameters) continue;
      for (const [k, v] of Object.entries(draw.parameters)) {
        if (!valuesByParam[k]) valuesByParam[k] = [];
        valuesByParam[k].push(v);
      }
    }

    const intervals: Record<string, { lower: number; upper: number }> = {};
    for (const [k, arr] of Object.entries(valuesByParam)) {
      intervals[k] = {
        lower: quantile(arr, 0.025),
        upper: quantile(arr, 0.975),
      };
    }
    return intervals;
  }, [bootstrap]);

  const rows: ParameterRow[] = [];

  // 1. Beta(s)
  if (isM2 && (parameters.beta1 !== undefined || parameters.beta2 !== undefined)) {
    const b1 = parameters.beta1 ?? 0;
    const b2 = parameters.beta2 ?? 0;
    const b1Interval = bootstrapIntervals?.beta1
      ? `[${formatNumber(bootstrapIntervals.beta1.lower, 4)}, ${formatNumber(bootstrapIntervals.beta1.upper, 4)}]`
      : bootstrap
      ? "unavailable"
      : "unavailable (uncertainty off)";
    const b2Interval = bootstrapIntervals?.beta2
      ? `[${formatNumber(bootstrapIntervals.beta2.lower, 4)}, ${formatNumber(bootstrapIntervals.beta2.upper, 4)}]`
      : bootstrap
      ? "unavailable"
      : "unavailable (uncertainty off)";

    rows.push({
      symbol: "β₁",
      name: "Transmission rate (Pre-break)",
      value: formatNumber(b1, 4),
      units: "day⁻¹",
      kind: "fitted",
      tooltip: "Transmission rate prior to the change-point date.",
      interval: b1Interval,
    });

    rows.push({
      symbol: "β₂",
      name: "Transmission rate (Post-break)",
      value: formatNumber(b2, 4),
      units: "day⁻¹",
      kind: "fitted",
      tooltip: "Transmission rate following the change-point date.",
      interval: b2Interval,
    });

    if (changePoint) {
      rows.push({
        symbol: "t_cp",
        name: "Change-point date",
        value: changePoint.date,
        units: `day ${changePoint.dayIndex}`,
        kind: "fitted",
        tooltip: "Optimal single change-point day selected by likelihood profile on training prefix.",
        interval: "— (discrete change)",
        note: "Represents a model change, not a verified policy event",
      });
    }
  } else {
    const b = parameters.beta ?? 0;
    const bInterval = bootstrapIntervals?.beta
      ? `[${formatNumber(bootstrapIntervals.beta.lower, 4)}, ${formatNumber(bootstrapIntervals.beta.upper, 4)}]`
      : bootstrap
      ? "unavailable"
      : "unavailable (uncertainty off)";

    rows.push({
      symbol: "β",
      name: "Effective transmission rate",
      value: formatNumber(b, 4),
      units: "day⁻¹",
      kind: "fitted",
      tooltip: "Constant transmission rate governing infectious contact in dS/dt = -βSI/N.",
      interval: bInterval,
    });
  }

  // 2. Gamma
  rows.push({
    symbol: "γ",
    name: "Removal rate (1/D)",
    value: formatNumber(assumptions.gamma, 4),
    units: "day⁻¹",
    kind: "fixed",
    tooltip: `Inverse of assumed infectious duration D=${assumptions.infectiousDurationDays} days.`,
    interval: "— (fixed)",
  });

  // 3. I0
  const i0Interval = bootstrapIntervals?.i0
    ? `[${formatInt(Math.round(bootstrapIntervals.i0.lower))}, ${formatInt(Math.round(bootstrapIntervals.i0.upper))}]`
    : bootstrap
    ? "unavailable"
    : "unavailable (uncertainty off)";

  rows.push({
    symbol: "I₀",
    name: "Initial infectious population",
    value: formatInt(Math.round(parameters.i0)),
    units: "persons",
    kind: "fitted",
    tooltip: "Infectious individuals at day 0 of the fitting window.",
    interval: i0Interval,
  });

  // 4. Dispersion k
  const dispInterval = bootstrapIntervals?.dispersion
    ? `[${formatNumber(bootstrapIntervals.dispersion.lower, 1)}, ${formatNumber(bootstrapIntervals.dispersion.upper, 1)}]`
    : bootstrap
    ? "unavailable"
    : "unavailable (uncertainty off)";

  rows.push({
    symbol: "k",
    name: "Overdispersion parameter",
    value: formatNumber(parameters.dispersion, 1),
    units: "dimensionless",
    kind: "fitted",
    tooltip: "Negative binomial dispersion parameter. Variance = μ + μ²/k.",
    interval: dispInterval,
  });

  // 5. Reporting fraction rho
  rows.push({
    symbol: "ρ",
    name: "Reporting fraction",
    value: `${formatNumber(assumptions.reportingFraction * 100, 1)}%`,
    units: "fraction",
    kind: "assumed",
    tooltip: "Assumed fraction of cumulative incident infections ascertained as reported cases.",
    interval: "— (assumed)",
  });

  // 6. Susceptible fraction
  rows.push({
    symbol: "S₀/N",
    name: "Initial susceptible fraction",
    value: `${formatNumber(assumptions.susceptibleFraction * 100, 1)}%`,
    units: "fraction",
    kind: "assumed",
    tooltip: "Assumed fraction of population susceptible at the start of the analysis.",
    interval: "— (assumed)",
  });

  // 7. S initial
  rows.push({
    symbol: "S₀",
    name: "Initial susceptible count",
    value: formatInt(Math.round(assumptions.sInitial)),
    units: "persons",
    kind: "assumed",
    tooltip: "S_initial = susceptible_fraction × Population.",
    interval: "— (assumed)",
  });

  // 8. R initial
  rows.push({
    symbol: "R₀",
    name: "Initial removed count",
    value: formatInt(Math.round(assumptions.rInitial)),
    units: "persons",
    kind: "inferred",
    tooltip: "Inferred initial removed population: R_initial = N - S_initial - I_initial.",
    interval: "— (inferred)",
  });

  // Badge renderer
  function renderKindBadge(kind: ParameterRow["kind"]) {
    switch (kind) {
      case "fitted":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-md bg-blue-50 text-blue-700 border border-blue-200">
            <Sliders className="w-3 h-3" /> Fitted
          </span>
        );
      case "fixed":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-md bg-slate-100 text-slate-700 border border-slate-200">
            <Lock className="w-3 h-3" /> Fixed
          </span>
        );
      case "assumed":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-md bg-amber-50 text-amber-700 border border-amber-200">
            <ShieldAlert className="w-3 h-3" /> Assumed
          </span>
        );
      case "inferred":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Sparkles className="w-3 h-3" /> Inferred
          </span>
        );
    }
  }

  // Boundary hits line
  const boundaryText =
    boundaryHits.length === 0
      ? "none"
      : boundaryHits.map((b) => `${b.param} (${b.bound})`).join(", ");

  return (
    <div
      role="region"
      aria-label="Fitted and assumed parameters"
      className="bg-surface rounded-2xl border border-border shadow-2xs overflow-hidden"
    >
      <div className="px-5 py-4 border-b border-border bg-surface flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-ink tracking-tight">Fitted & Assumed Parameters</h4>
          <p className="text-xs text-muted mt-0.5">
            Epidemiological transmission rates, initial compartment conditions, and dispersion.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-surface-2 border-b border-border text-muted font-medium">
              <th scope="col" className="py-2.5 px-4 font-mono">Symbol</th>
              <th scope="col" className="py-2.5 px-4">Parameter Name</th>
              <th scope="col" className="py-2.5 px-4">Role</th>
              <th scope="col" className="py-2.5 px-4 text-right">Fitted / Value</th>
              <th scope="col" className="py-2.5 px-4">Units</th>
              <th scope="col" className="py-2.5 px-4">
                95% Bootstrap Interval
                <span className="block text-[10px] text-muted font-normal">
                  Conditional on model assumptions
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {rows.map((r, idx) => (
              <tr key={idx} className="hover:bg-surface-2/60 transition-colors">
                <td className="py-2.5 px-4 font-mono font-bold text-ink">{r.symbol}</td>
                <td className="py-2.5 px-4">
                  <div className="font-medium text-ink flex items-center gap-1.5" title={r.tooltip}>
                    <span>{r.name}</span>
                  </div>
                  {r.note && (
                    <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 inline-block mt-0.5">
                      {r.note}
                    </span>
                  )}
                </td>
                <td className="py-2.5 px-4">{renderKindBadge(r.kind)}</td>
                <td className="py-2.5 px-4 text-right font-mono font-semibold text-ink">
                  {r.value}
                </td>
                <td className="py-2.5 px-4 text-muted text-[11px]">{r.units}</td>
                <td className="py-2.5 px-4 font-mono text-[11px] text-muted">{r.interval}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Convergence & Optimization Status Line */}
      <div className="px-5 py-3 bg-surface-2 border-t border-border flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>
            <strong className="text-ink font-mono">{convergence.nConverged}</strong> of{" "}
            <strong className="text-ink font-mono">{convergence.nStarts}</strong> starts converged
            &nbsp;·&nbsp; boundary hits: <span className="font-mono text-ink">{boundaryText}</span>
          </span>
        </div>

        {convergence.bestNll !== undefined && (
          <div className="font-mono text-[11px]">
            Best NLL: {formatNumber(convergence.bestNll, 2)} · spread:{" "}
            {formatNumber(convergence.nllSpread, 4)}
          </div>
        )}
      </div>
    </div>
  );
}
