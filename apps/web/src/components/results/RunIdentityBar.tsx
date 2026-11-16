"use client";

import React, { createContext, useContext } from "react";
import { formatDisplayDate } from "@epilens/shared";
import type { RunResultsMetadata } from "@/hooks/useRuns";
import { Database, Calendar, Tag, GitCommit, Hash, Cpu } from "lucide-react";

const RunIdContext = createContext<string | null>(null);

/**
 * Dev-mode assertion that child component data strictly belongs to the displayed run ID.
 */
export function useAssertRunId(childRunId: string | undefined, componentName = "ChildComponent") {
  const currentRunId = useContext(RunIdContext);
  if (process.env.NODE_ENV !== "production") {
    if (currentRunId && childRunId && currentRunId !== childRunId) {
      console.error(
        `[EpiLens Violation] ${componentName} received data for run "${childRunId}" but the active results shell is displaying "${currentRunId}". Mixing data between runs violates PRD §2/3.`
      );
    }
  }
}

export function RunIdProvider({
  runId,
  children,
}: {
  runId: string;
  children: React.ReactNode;
}) {
  return <RunIdContext.Provider value={runId}>{children}</RunIdContext.Provider>;
}

interface RunIdentityBarProps {
  runId: string;
  metadata: RunResultsMetadata;
  startDate?: string;
  endDate?: string;
}

export function RunIdentityBar({
  metadata,
  startDate,
  endDate,
}: RunIdentityBarProps) {
  const dateRangeStr =
    startDate && endDate
      ? `${formatDisplayDate(startDate)} – ${formatDisplayDate(endDate)}`
      : "Full archive";

  const completedTimeStr = metadata.completedAt
    ? `${formatDisplayDate(metadata.completedAt.slice(0, 10))} ${metadata.completedAt.slice(11, 19)} UTC`
    : "Completed";

  return (
    <div
      role="region"
      aria-label="Run Identity"
      className="bg-surface rounded-2xl border border-border p-4 sm:p-5 shadow-2xs space-y-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="text-base font-bold text-ink">{metadata.displayName}</span>
          {metadata.dataset?.isSynthetic && (
            <span className="h-6 inline-flex items-center px-2.5 text-xs font-medium bg-amber-50 text-amber-800 rounded-full border border-amber-200 shrink-0">
              Synthetic Demo
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="h-6 inline-flex items-center px-2.5 text-xs font-semibold rounded-md bg-blue-50 text-blue-700 border border-blue-200">
            {metadata.mode === "EVALUATE" ? "7-Day Forecast Evaluation" : "Model Fit Only"}
          </span>
          <span className="h-6 inline-flex items-center px-2.5 text-xs font-semibold rounded-md bg-slate-100 text-slate-700 border border-slate-200">
            {metadata.modelType === "M2" ? "Change-point SIR (M2)" : "Constant SIR (M1)"}
          </span>
        </div>
      </div>

      {/* Identity Meta Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
        <div>
          <span className="text-muted block text-[11px] flex items-center gap-1">
            <Database className="w-3 h-3 text-slate-400" /> Dataset
          </span>
          <span className="font-semibold text-ink truncate block">
            {metadata.dataset?.name || "Punjab COVID-19"}{" "}
            <span className="text-muted font-normal">v{metadata.dataset?.version ?? 1}</span>
          </span>
        </div>

        <div>
          <span className="text-muted block text-[11px] flex items-center gap-1">
            <Calendar className="w-3 h-3 text-slate-400" /> Date Range
          </span>
          <span className="font-medium text-ink block">{dateRangeStr}</span>
        </div>

        <div>
          <span className="text-muted block text-[11px] flex items-center gap-1">
            <Tag className="w-3 h-3 text-slate-400" /> Completed
          </span>
          <span className="font-medium text-ink block truncate" title={completedTimeStr}>
            {completedTimeStr}
          </span>
        </div>

        <div>
          <span className="text-muted block text-[11px] flex items-center gap-1">
            <GitCommit className="w-3 h-3 text-slate-400" /> Code Version
          </span>
          <span className="font-mono text-ink block truncate" title={metadata.codeVersion}>
            {metadata.codeVersion || "dev"}
          </span>
        </div>

        <div>
          <span className="text-muted block text-[11px] flex items-center gap-1">
            <Hash className="w-3 h-3 text-slate-400" /> Seed
          </span>
          <span className="font-mono text-ink block">{metadata.seed}</span>
        </div>

        <div>
          <span className="text-muted block text-[11px] flex items-center gap-1">
            <Cpu className="w-3 h-3 text-slate-400" /> Observation Model
          </span>
          <span className="font-medium text-ink block">Negative Binomial</span>
        </div>
      </div>
    </div>
  );
}
