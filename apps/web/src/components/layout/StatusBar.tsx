"use client";

import { useWorkspaceStore } from "@/store/workspace";
import { formatDisplayDate } from "@epilens/shared";
import { Database, Calendar, Activity, ChevronRight } from "lucide-react";
import Link from "next/link";
import React from "react";
import { DemoBadge } from "../common/DemoBadge";
import { RunStatusPill } from "../common/RunStatusPill";

interface StatusBarProps {
  isDemoUser?: boolean;
  user?: {
    name?: string | null;
    email?: string | null;
    isDemo?: boolean;
  };
}

export function StatusBar({ isDemoUser = false, user }: StatusBarProps) {
  const { datasetName, isSynthetic, dateRange, activeRunStatus } = useWorkspaceStore();

  const formattedDates =
    dateRange?.start && dateRange?.end
      ? `${formatDisplayDate(dateRange.start)} – ${formatDisplayDate(dateRange.end)}`
      : "—";

  return (
    <header className="sticky top-14 md:top-0 z-30 flex items-center justify-between h-14 px-4 sm:px-6 bg-surface/90 backdrop-blur-md border-b border-border shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-all">
      <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar py-1">
        {/* Workspace Brand Micro-Badge */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-muted font-medium shrink-0">
          <span className="font-semibold text-ink">Punjab COVID-19</span>
          <ChevronRight className="w-3 h-3 text-slate-300" />
        </div>

        {/* Dataset indicator chip (interactive) */}
        <Link
          href="/data"
          title="Switch or inspect observation dataset"
          className="group h-6 inline-flex items-center gap-1.5 text-xs text-slate-700 bg-surface-2 hover:bg-blue-50/70 hover:text-blue-700 px-2.5 rounded-full border border-border hover:border-blue-200 transition-all shrink-0 cursor-pointer shadow-2xs"
        >
          <Database className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-colors" />
          <span className="font-medium truncate max-w-[130px] sm:max-w-[200px]">
            {datasetName || "No dataset selected"}
          </span>
        </Link>

        {/* Date range indicator (shown on sm+ screens, interactive) */}
        <Link
          href="/data"
          title="View observation range"
          className="hidden sm:inline-flex group h-6 items-center gap-1.5 text-xs text-slate-700 bg-surface-2 hover:bg-blue-50/70 hover:text-blue-700 px-2.5 rounded-full border border-border hover:border-blue-200 transition-all shrink-0 font-mono cursor-pointer shadow-2xs"
        >
          <Calendar className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-colors" />
          <span>{formattedDates}</span>
        </Link>

        {(isSynthetic || isDemoUser) && <DemoBadge label={isSynthetic ? "Demo data" : "Demo account"} />}
      </div>

      {/* Right-hand side indicators: Run Status & User Quick Profile */}
      <div className="flex items-center gap-3 pl-3 shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted hidden md:inline font-medium">Status:</span>
          <Activity className="w-3.5 h-3.5 text-muted hidden sm:inline" />
          <RunStatusPill status={activeRunStatus} />
        </div>

        {/* User initials pill */}
        {user && (
          <div className="hidden sm:inline-flex items-center gap-2 h-7 pl-1.5 pr-2.5 rounded-full bg-surface-2 border border-border/80 text-xs text-ink font-medium shadow-2xs">
            <div className="w-5 h-5 rounded-full bg-navy-900 text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
              {user.name ? user.name[0].toUpperCase() : "U"}
            </div>
            <span className="truncate max-w-[110px]">{user.name || "Researcher"}</span>
          </div>
        )}
      </div>
    </header>
  );
}
