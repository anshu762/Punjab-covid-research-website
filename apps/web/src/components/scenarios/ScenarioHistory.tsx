"use client";

import React from "react";
import { History, Trash2, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import type { ScenarioItem } from "@/hooks/useScenarios";
import { formatDisplayDate } from "@epilens/shared";

interface ScenarioHistoryProps {
  scenarios: ScenarioItem[];
  activeScenarioId: string | null;
  onSelectScenario: (id: string) => void;
  onDeleteScenario: (id: string) => void;
  isDeleting?: boolean;
}

export function ScenarioHistory({
  scenarios,
  activeScenarioId,
  onSelectScenario,
  onDeleteScenario,
  isDeleting = false,
}: ScenarioHistoryProps) {
  if (scenarios.length === 0) return null;

  return (
    <div className="bg-surface border border-border rounded-[14px] p-4 space-y-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
        <History className="w-3.5 h-3.5" />
        <span>Scenario History for this Run ({scenarios.length})</span>
      </div>

      <div className="divide-y divide-border/60 max-h-60 overflow-y-auto">
        {scenarios.map((scen) => {
          const isActive = scen.id === activeScenarioId;
          const signStr =
            scen.percentChange > 0 ? `+${scen.percentChange}%` : `${scen.percentChange}%`;

          return (
            <div
              key={scen.id}
              className={`flex items-center justify-between py-2 px-2 rounded-lg transition-colors ${
                isActive ? "bg-blue-50/70 border border-blue-200/60" : "hover:bg-surface-2"
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectScenario(scen.id)}
                className="flex items-center gap-3 text-left min-w-0 flex-1"
              >
                <span
                  className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                    scen.percentChange < 0
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : scen.percentChange > 0
                      ? "bg-amber-50 text-amber-700 border border-amber-200"
                      : "bg-slate-100 text-slate-700 border border-slate-200"
                  }`}
                >
                  {signStr}
                </span>

                <div className="min-w-0">
                  <div className="text-xs font-medium text-ink flex items-center gap-1.5">
                    <span>{scen.horizonDays} days forward</span>
                    {isActive && (
                      <span className="text-[10px] text-blue-600 font-semibold">(current)</span>
                    )}
                  </div>
                  <div className="text-[10px] text-muted flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    <span>
                      {formatDisplayDate(scen.createdAt.slice(0, 10))} ·{" "}
                      {new Date(scen.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              </button>

              <div className="flex items-center gap-2 shrink-0 ml-2">
                {scen.status === "COMPLETED" && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                )}
                {scen.status === "FAILED" && (
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                )}
                <button
                  type="button"
                  onClick={() => onDeleteScenario(scen.id)}
                  disabled={isDeleting || scen.status === "RUNNING"}
                  title="Delete scenario"
                  className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors disabled:opacity-40"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
