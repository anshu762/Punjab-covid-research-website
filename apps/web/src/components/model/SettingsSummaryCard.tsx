"use client";

import React from "react";
import { formatDisplayDate, formatInt, diffDays } from "@epilens/shared";

interface SettingsSummaryCardProps {
  datasetName: string | null;
  dateRange: { start: string; end: string } | null;
  population: number;
  modelType: "M1" | "M2";
  infectiousDurationDays: number;
  reportingFraction: number;
  susceptibleFraction: number;
  uncertainty: "OFF" | "BOOTSTRAP";
  seed: number;
  mode: "FIT" | "EVALUATE";
}

export function SettingsSummaryCard({
  datasetName,
  dateRange,
  population,
  modelType,
  infectiousDurationDays,
  reportingFraction,
  susceptibleFraction,
  uncertainty,
  seed,
  mode,
}: SettingsSummaryCardProps) {
  const daysCount =
    dateRange?.start && dateRange?.end
      ? diffDays(dateRange.start, dateRange.end) + 1
      : 0;

  const gamma = (1 / infectiousDurationDays).toFixed(4);
  const sInitial = Math.round(susceptibleFraction * population);

  return (
    <div className="bg-surface rounded-[14px] border border-border p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
          Active Configuration Summary
        </h3>
        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold border border-blue-200">
          {mode === "FIT" ? "Fit Mode" : "Evaluation Protocol"}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-4 text-xs">
        <div>
          <span className="text-muted block">Dataset</span>
          <span className="font-medium text-ink truncate block">
            {datasetName || "—"}
          </span>
        </div>

        <div>
          <span className="text-muted block">Date Span</span>
          <span className="font-mono text-ink block">
            {dateRange ? `${daysCount} days` : "—"}
          </span>
          <span className="text-[10px] text-muted font-mono">
            {dateRange ? `${formatDisplayDate(dateRange.start)} – ${formatDisplayDate(dateRange.end)}` : ""}
          </span>
        </div>

        <div>
          <span className="text-muted block">Population (N)</span>
          <span className="font-mono text-ink block">{formatInt(population)}</span>
        </div>

        <div>
          <span className="text-muted block">Model Structure</span>
          <span className="font-medium text-ink block">
            {modelType === "M1" ? "Constant SIR (M1)" : "One Change-Point (M2)"}
          </span>
        </div>

        <div>
          <span className="text-muted block">Infectious Duration (D)</span>
          <span className="font-mono text-ink block">
            {infectiousDurationDays} days (γ = {gamma})
          </span>
        </div>

        <div>
          <span className="text-muted block">Reporting Fraction (ρ)</span>
          <span className="font-mono text-ink block">
            {(reportingFraction * 100).toFixed(0)}%
          </span>
        </div>

        <div>
          <span className="text-muted block">Susceptible (f_s)</span>
          <span className="font-mono text-ink block">
            {(susceptibleFraction * 100).toFixed(1)}% ({formatInt(sInitial)})
          </span>
        </div>

        <div>
          <span className="text-muted block">Uncertainty</span>
          <span className="font-medium text-ink block">
            {uncertainty === "BOOTSTRAP" ? "200 Bootstrap Refits" : "Off"}
          </span>
        </div>

        <div>
          <span className="text-muted block">Seed</span>
          <span className="font-mono text-ink block">{seed}</span>
        </div>
      </div>
    </div>
  );
}
