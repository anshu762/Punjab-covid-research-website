"use client";

import React from "react";
import { Info } from "lucide-react";
import type { ScenarioSummary as ScenarioSummaryType } from "@epilens/shared";
import { formatInt, formatNumber, formatDisplayDate, addDays } from "@epilens/shared";
import { StatCard } from "@/components/common/StatCard";

interface ScenarioSummaryProps {
  summary: ScenarioSummaryType;
}

export function ScenarioSummary({ summary }: ScenarioSummaryProps) {
  const endDate = addDays(summary.startDate, summary.horizonDays - 1);
  const signStr =
    summary.percentChange > 0 ? `+${summary.percentChange}%` : `${summary.percentChange}%`;

  const casesDiffSign = summary.expectedCasesDiff > 0 ? "+" : "";
  const casesPctDiffStr =
    summary.expectedCasesPctDiff !== null
      ? `${summary.expectedCasesPctDiff > 0 ? "+" : ""}${formatNumber(
          summary.expectedCasesPctDiff,
          1
        )}%`
      : "Undefined (baseline is zero)";

  const infDiffSign = summary.infectionsDiff > 0 ? "+" : "";
  const infPctDiffStr =
    summary.infectionsPctDiff !== null
      ? `${summary.infectionsPctDiff > 0 ? "+" : ""}${formatNumber(
          summary.infectionsPctDiff,
          1
        )}%`
      : "Undefined (baseline is zero)";

  const hasInterval = Boolean(summary.casesInterval || summary.infectionsInterval);

  return (
    <div className="flex flex-col gap-5">
      {/* Persistent Banner: Hypothetical simulation under the fitted model */}
      <div className="flex items-start gap-3 p-4 rounded-[14px] bg-blue-50/80 border border-blue-200/90 text-blue-950">
        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <div className="font-semibold text-sm text-blue-900 tracking-tight flex items-center gap-2">
            <span>Hypothetical simulation under the fitted model</span>
            <span className="font-normal font-mono text-[11px] px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
              Δβ = {signStr}
            </span>
          </div>
          <p className="text-blue-800/90 leading-relaxed">
            This projection holds calibrated parameters (initial state, γ, ρ, N) constant
            and simulates forward dynamics under a modified transmission parameter. It is a
            hypothetical counterfactual exploration, not a causal policy evaluation or guaranteed outcome.
          </p>
        </div>
      </div>

      {/* 4 StatCards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Cumulative Expected Cases"
          value={formatInt(Math.round(summary.scenarioExpectedCases))}
          hint={`Baseline: ${formatInt(Math.round(summary.baselineExpectedCases))} (${casesDiffSign}${formatInt(
            Math.round(summary.expectedCasesDiff)
          )}, ${casesPctDiffStr})`}
        />

        <StatCard
          label="Cumulative Model Infections"
          value={formatInt(Math.round(summary.scenarioInfections))}
          hint={`Baseline: ${formatInt(Math.round(summary.baselineInfections))} (${infDiffSign}${formatInt(
            Math.round(summary.infectionsDiff)
          )}, ${infPctDiffStr})`}
        />

        <StatCard
          label="Transmission Parameter (β)"
          value={`${formatNumber(summary.scenarioBeta, 4)} / d`}
          hint={`Baseline β: ${formatNumber(summary.baselineBeta, 4)} (${signStr})`}
        />

        <StatCard
          label="Projection Window"
          value={`${summary.horizonDays} days`}
          hint={`${formatDisplayDate(summary.startDate)} → ${formatDisplayDate(endDate)}`}
        />
      </div>

      {/* Deterministic Summary Sentence */}
      <div className="p-4 rounded-[14px] bg-surface border border-border space-y-2">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">
          Summary Statement (Deterministic Specification)
        </div>
        <p className="text-sm font-medium text-ink leading-relaxed font-sans">
          {summary.summaryText}
        </p>

        {hasInterval && (
          <p className="text-[11px] text-muted italic pt-1 border-t border-border/60">
            Interval is conditional on model assumptions and reflects parameter uncertainty only.
          </p>
        )}
      </div>
    </div>
  );
}
