"use client";

import { useWorkspaceStore } from "@/store/workspace";
import { formatDisplayDate } from "@epilens/shared";
import { Database, Calendar, Activity } from "lucide-react";
import React from "react";
import { DemoBadge } from "../common/DemoBadge";
import { RunStatusPill } from "../common/RunStatusPill";

interface StatusBarProps {
  isDemoUser?: boolean;
}

export function StatusBar({ isDemoUser = false }: StatusBarProps) {
  const { datasetName, isSynthetic, dateRange, activeRunStatus } = useWorkspaceStore();

  const formattedDates =
    dateRange?.start && dateRange?.end
      ? `${formatDisplayDate(dateRange.start)} – ${formatDisplayDate(dateRange.end)}`
      : "—";

  return (
    <header className="sticky top-14 md:top-0 z-30 flex items-center justify-between h-14 px-4 sm:px-6 bg-surface border-b border-border shadow-xs">
      <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
        <span className="font-semibold text-sm tracking-tight text-ink shrink-0 hidden sm:inline">
          EpiLens
        </span>
        <span className="text-slate-300 hidden sm:inline">|</span>

        {/* Dataset indicator */}
        <div className="flex items-center gap-1.5 text-xs text-slate-700 bg-surface-2 px-2.5 py-1 rounded-md border border-border shrink-0">
          <Database className="w-3.5 h-3.5 text-muted" />
          <span className="font-medium truncate max-w-[140px] sm:max-w-[200px]">
            {datasetName || "No dataset selected"}
          </span>
        </div>

        {/* Date range indicator */}
        <div className="flex items-center gap-1.5 text-xs text-slate-700 bg-surface-2 px-2.5 py-1 rounded-md border border-border shrink-0">
          <Calendar className="w-3.5 h-3.5 text-muted" />
          <span className="font-mono">{formattedDates}</span>
        </div>

        {(isSynthetic || isDemoUser) && <DemoBadge label={isSynthetic ? "Demo data" : "Demo account"} />}
      </div>

      {/* Run status indicator */}
      <div className="flex items-center gap-2 pl-3 shrink-0">
        <span className="text-xs text-muted hidden md:inline">Run Status:</span>
        <div className="flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-muted hidden sm:inline" />
          <RunStatusPill status={activeRunStatus} />
        </div>
      </div>
    </header>
  );
}
