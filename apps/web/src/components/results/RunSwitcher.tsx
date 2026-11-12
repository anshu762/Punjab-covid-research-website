"use client";

import React from "react";
import { formatDisplayDate } from "@epilens/shared";
import type { RunItem } from "@/hooks/useRuns";
import { ChevronDown } from "lucide-react";

interface RunSwitcherProps {
  runs: RunItem[];
  activeRunId: string | null;
  onSelectRun: (runId: string) => void;
}

export function RunSwitcher({ runs, activeRunId, onSelectRun }: RunSwitcherProps) {
  const completedRuns = runs.filter((r) => r.status === "COMPLETED");

  if (completedRuns.length <= 1) {
    return null;
  }

  return (
    <div className="relative inline-flex items-center">
      <label htmlFor="run-switcher-select" className="sr-only">
        Switch analysis run
      </label>
      <select
        id="run-switcher-select"
        value={activeRunId || ""}
        onChange={(e) => onSelectRun(e.target.value)}
        className="appearance-none pl-3 pr-8 py-1.5 text-xs font-medium text-ink bg-surface border border-border rounded-lg shadow-2xs hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 transition cursor-pointer"
        aria-label="Switch active analysis run"
      >
        {completedRuns.map((r) => {
          const dateStr = r.completedAt
            ? formatDisplayDate(r.completedAt.slice(0, 10))
            : formatDisplayDate(r.createdAt.slice(0, 10));
          const isDemo = r.dataset?.isSynthetic;
          return (
            <option key={r.id} value={r.id}>
              {r.displayName} • {r.mode} ({r.modelType}) • {dateStr}
              {isDemo ? " [Demo]" : ""}
            </option>
          );
        })}
      </select>
      <ChevronDown className="w-3.5 h-3.5 text-muted pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
    </div>
  );
}
