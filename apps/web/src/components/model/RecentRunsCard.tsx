"use client";

import React from "react";
import Link from "next/link";
import { formatDisplayDate } from "@epilens/shared";
import { useRuns, type RunItem } from "@/hooks/useRuns";
import { RunStatusPill } from "@/components/common/RunStatusPill";
import { ArrowRight, History } from "lucide-react";

interface RecentRunsCardProps {
  onSelectRun: (run: RunItem) => void;
  selectedRunId?: string | null;
}

export function RecentRunsCard({ onSelectRun, selectedRunId }: RecentRunsCardProps) {
  const { data: runs, isLoading } = useRuns(false);

  const recentRuns = (runs || []).slice(0, 5);

  if (isLoading || recentRuns.length === 0) {
    return null;
  }

  return (
    <div className="bg-surface rounded-[14px] border border-border p-5 shadow-xs space-y-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted pb-1 border-b border-border">
        <History className="w-3.5 h-3.5" />
        <span>Recent Analysis Runs</span>
      </div>

      <div className="divide-y divide-slate-100">
        {recentRuns.map((r) => {
          const isSelected = r.id === selectedRunId;
          const createdDate = r.createdAt ? formatDisplayDate(r.createdAt.slice(0, 10)) : "—";

          return (
            <div
              key={r.id}
              className={`py-2.5 flex items-center justify-between gap-3 text-xs transition-colors rounded-lg px-2 ${
                isSelected ? "bg-blue-50/70" : "hover:bg-surface-2"
              }`}
            >
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-ink truncate">{r.displayName}</span>
                  <RunStatusPill status={r.status} />
                </div>
                <div className="flex items-center gap-2 text-muted text-[11px]">
                  <span className="font-mono">{r.id.slice(0, 10)}</span>
                  <span>•</span>
                  <span>{r.mode}</span>
                  <span>•</span>
                  <span>{createdDate}</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {r.status === "COMPLETED" ? (
                  <Link
                    href={`/results?runId=${r.id}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200"
                  >
                    <span>Results</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => onSelectRun(r)}
                    className="px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-surface hover:bg-surface-2 border border-border rounded"
                  >
                    Inspect
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
