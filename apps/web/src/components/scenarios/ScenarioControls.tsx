"use client";

import React from "react";
import { Lock, Play, Loader2 } from "lucide-react";
import type { RunItem } from "@/hooks/useRuns";
import type { FitResultPayload } from "@epilens/shared";
import { formatNumber, formatInt } from "@epilens/shared";
import { DemoBadge } from "@/components/common/DemoBadge";

interface ScenarioControlsProps {
  runs: RunItem[];
  selectedRunId: string | null;
  onSelectRun: (id: string) => void;
  parentPayload: FitResultPayload | null;
  percentChange: number;
  onPercentChange: (val: number) => void;
  horizonDays: number;
  onHorizonDays: (val: number) => void;
  startDate: string;
  onRunScenario: () => void;
  isRunning: boolean;
}

const PRESET_DELTAS = [-50, -20, -10, 0, 10, 20, 50];

export function ScenarioControls({
  runs,
  selectedRunId,
  onSelectRun,
  parentPayload,
  percentChange,
  onPercentChange,
  horizonDays,
  onHorizonDays,
  startDate,
  onRunScenario,
  isRunning,
}: ScenarioControlsProps) {
  const completedRunsWithFit = runs.filter(
    (r) => r.status === "COMPLETED" && r.hasFit
  );

  const finalBeta = parentPayload?.finalState?.beta;
  const gamma = parentPayload?.assumptions?.gamma;
  const rho = parentPayload?.assumptions?.reportingFraction;
  const pop = parentPayload?.assumptions?.population?.value;
  const s0 = parentPayload?.finalState?.S;
  const i0 = parentPayload?.finalState?.I;
  const r0 = parentPayload?.finalState?.R;

  const currentScenarioBeta =
    typeof finalBeta === "number"
      ? finalBeta * (1.0 + percentChange / 100.0)
      : null;

  return (
    <div className="flex flex-col gap-5 p-5 bg-surface border border-border rounded-[14px] shadow-xs">
      {/* Run Selector */}
      <div className="space-y-1.5">
        <label
          htmlFor="parent-run-select"
          className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center justify-between"
        >
          <span>Parent Fitted Model</span>
          <span className="text-[10px] lowercase text-slate-400 font-mono">
            {completedRunsWithFit.length} available
          </span>
        </label>
        <select
          id="parent-run-select"
          value={selectedRunId || ""}
          onChange={(e) => onSelectRun(e.target.value)}
          disabled={isRunning || completedRunsWithFit.length === 0}
          className="w-full text-xs font-medium text-ink bg-surface border border-border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-600 focus:outline-none transition-shadow disabled:opacity-50"
        >
          {completedRunsWithFit.length === 0 && (
            <option value="">No completed fits available</option>
          )}
          {completedRunsWithFit.map((r) => (
            <option key={r.id} value={r.id}>
              {r.displayName} ({r.modelType} · {r.mode})
            </option>
          ))}
        </select>
        {selectedRunId && (
          <div className="flex items-center gap-2 pt-1 text-[11px] text-muted">
            {runs.find((r) => r.id === selectedRunId)?.dataset?.isSynthetic && (
              <DemoBadge />
            )}
            <span className="font-mono text-[10px] text-slate-500">
              ID: {selectedRunId.slice(0, 8)}…
            </span>
          </div>
        )}
      </div>

      {/* Locked Historical Parameters */}
      <div className="rounded-lg bg-surface-2 p-3.5 border border-border/80 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-ink">
            <Lock className="w-3.5 h-3.5 text-slate-500" />
            <span>Fitted Model (Locked)</span>
          </div>
          <span
            className="text-[10px] text-slate-400 cursor-help"
            title="Historical parameters are calibrated from the empirical fit and cannot be modified here."
          >
            Read-only
          </span>
        </div>

        {parentPayload ? (
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="bg-surface p-2 rounded border border-border/60">
              <span className="text-[10px] text-muted block font-sans">
                Fitted β
              </span>
              <span className="font-medium text-ink">
                {finalBeta !== undefined ? formatNumber(finalBeta, 4) : "—"}
              </span>
            </div>
            <div className="bg-surface p-2 rounded border border-border/60">
              <span className="text-[10px] text-muted block font-sans">
                Recovery γ
              </span>
              <span className="font-medium text-ink">
                {gamma !== undefined ? formatNumber(gamma, 4) : "—"}
              </span>
            </div>
            <div className="bg-surface p-2 rounded border border-border/60">
              <span className="text-[10px] text-muted block font-sans">
                Reporting ρ
              </span>
              <span className="font-medium text-ink">
                {rho !== undefined ? `${Math.round(rho * 100)}%` : "—"}
              </span>
            </div>
            <div className="bg-surface p-2 rounded border border-border/60">
              <span className="text-[10px] text-muted block font-sans">
                Population N
              </span>
              <span className="font-medium text-ink">
                {pop ? formatInt(pop) : "—"}
              </span>
            </div>
            <div className="col-span-2 bg-surface p-2 rounded border border-border/60 text-[11px]">
              <span className="text-[10px] text-muted block font-sans">
                Initial State [S, I, R] at start
              </span>
              <span className="text-slate-700">
                S: {s0 ? formatInt(Math.round(s0)) : "—"} · I:{" "}
                {i0 ? formatInt(Math.round(i0)) : "—"} · R:{" "}
                {r0 ? formatInt(Math.round(r0)) : "—"}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted">
            Select a completed fit to view calibrated parameters.
          </p>
        )}
      </div>

      {/* Transmission Change Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label
            htmlFor="percent-change-slider"
            className="text-xs font-semibold uppercase tracking-wider text-muted"
          >
            Transmission Change (Δβ)
          </label>
          <span
            className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
              percentChange < 0
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : percentChange > 0
                ? "bg-amber-50 text-amber-700 border border-amber-200"
                : "bg-slate-100 text-slate-700 border border-slate-200"
            }`}
          >
            {percentChange > 0 ? `+${percentChange}%` : `${percentChange}%`}
          </span>
        </div>

        <input
          id="percent-change-slider"
          type="range"
          min={-50}
          max={50}
          step={5}
          value={percentChange}
          onChange={(e) => onPercentChange(Number(e.target.value))}
          disabled={isRunning || !parentPayload}
          className="w-full accent-blue-600 cursor-pointer disabled:opacity-50"
        />

        {/* Preset delta chips */}
        <div className="flex flex-wrap items-center gap-1 pt-1">
          {PRESET_DELTAS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onPercentChange(p)}
              disabled={isRunning || !parentPayload}
              className={`text-[10px] font-mono px-2 py-1 rounded transition-colors ${
                percentChange === p
                  ? "bg-navy-900 text-white font-bold"
                  : "bg-surface-2 text-slate-600 hover:bg-slate-200 border border-border"
              }`}
            >
              {p > 0 ? `+${p}%` : `${p}%`}
            </button>
          ))}
        </div>

        {currentScenarioBeta !== null && (
          <p className="text-[11px] text-muted font-mono pt-1">
            Scenario β: {formatNumber(currentScenarioBeta, 4)} / day (baseline:{" "}
            {typeof finalBeta === "number" ? formatNumber(finalBeta, 4) : "—"})
          </p>
        )}
      </div>

      {/* Horizon Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label
            htmlFor="horizon-slider"
            className="text-xs font-semibold uppercase tracking-wider text-muted"
          >
            Forward Horizon
          </label>
          <span className="text-xs font-mono font-bold text-ink px-2 py-0.5 rounded bg-surface-2 border border-border">
            {horizonDays} days
          </span>
        </div>

        <input
          id="horizon-slider"
          type="range"
          min={7}
          max={60}
          step={1}
          value={horizonDays}
          onChange={(e) => onHorizonDays(Number(e.target.value))}
          disabled={isRunning || !parentPayload}
          className="w-full accent-blue-600 cursor-pointer disabled:opacity-50"
        />
        <div className="flex justify-between text-[10px] text-muted font-mono">
          <span>7 days</span>
          <span>28 days (4 wk)</span>
          <span>60 days</span>
        </div>
      </div>

      {/* Start Date Pill */}
      <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-center justify-between">
        <span className="font-medium">Scenario Start Date:</span>
        <span className="font-mono font-semibold">{startDate || "—"}</span>
      </div>

      {/* Submit Button */}
      <button
        type="button"
        onClick={onRunScenario}
        disabled={isRunning || !parentPayload || !selectedRunId}
        className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
      >
        {isRunning ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Simulating forward…</span>
          </>
        ) : (
          <>
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Run scenario</span>
          </>
        )}
      </button>
    </div>
  );
}
