"use client";

import React, { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Sliders,
  Play,
  Loader2,
  Download,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { useSensitivity, useRunSensitivity } from "@/hooks/useSensitivity";
import { formatNumber } from "@epilens/shared";
import { DataTable, type DataTableColumn } from "@/components/charts/DataTable";

interface SensitivityPanelProps {
  runId: string;
  isEvaluated: boolean;
}

export function SensitivityPanel({ runId, isEvaluated }: SensitivityPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data } = useSensitivity(runId, isEvaluated);
  const runSensitivityMutation = useRunSensitivity();

  if (!isEvaluated) return null;

  const sensitivity = data?.sensitivity;
  const status = data?.status || "IDLE";
  const isPending =
    runSensitivityMutation.isPending || status === "QUEUED" || status === "RUNNING";

  async function handleLaunchSensitivity() {
    try {
      await runSensitivityMutation.mutateAsync(runId);
      toast.success("27-combination sensitivity analysis queued");
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to run sensitivity analysis"
      );
    }
  }

  function handleDownloadCsv() {
    if (!sensitivity) return;
    const headers = [
      "combo_index",
      "infectious_duration_days",
      "reporting_fraction",
      "susceptible_fraction",
      "m1_final_mae",
      "m2_final_mae",
      "winning_model",
      "improvement_pct",
      "verdict",
      "is_reversal",
      "reversal_reason",
    ];

    const rows = sensitivity.combos.map((c) => [
      c.comboIndex,
      c.infectiousDurationDays,
      c.reportingFraction,
      c.susceptibleFraction,
      c.m1FinalMae != null ? c.m1FinalMae.toFixed(2) : "",
      c.m2FinalMae != null ? c.m2FinalMae.toFixed(2) : "",
      c.winningModel,
      c.improvementPct != null ? c.improvementPct.toFixed(1) : "",
      c.verdict,
      c.isReversal ? "true" : "false",
      `"${c.reversalReason || ""}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `epilens_sensitivity_${runId.slice(0, 8)}_27combos.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const tableData: Record<string, unknown>[] = (sensitivity?.combos || []).map((c) => ({
    comboIndex: c.comboIndex,
    duration: `${c.infectiousDurationDays}d`,
    reporting: `${Math.round(c.reportingFraction * 100)}%`,
    susceptible: `${Math.round(c.susceptibleFraction * 100)}%`,
    m1Mae: c.m1FinalMae,
    m2Mae: c.m2FinalMae,
    winner: c.winningModel,
    improvement: c.improvementPct,
    verdict: c.verdict,
    isReversal: c.isReversal,
    reversalReason: c.reversalReason,
  }));

  const tableColumns: DataTableColumn[] = [
    {
      key: "comboIndex",
      header: "#",
      align: "center",
      render: (v) => <span className="font-mono text-[11px] text-muted">{String(v)}</span>,
    },
    {
      key: "duration",
      header: "Duration (D)",
      render: (v) => <span className="font-mono text-xs font-medium">{String(v)}</span>,
    },
    {
      key: "reporting",
      header: "Reporting (ρ)",
      render: (v) => <span className="font-mono text-xs font-medium">{String(v)}</span>,
    },
    {
      key: "susceptible",
      header: "Susceptibility (fs)",
      render: (v) => <span className="font-mono text-xs font-medium">{String(v)}</span>,
    },
    {
      key: "m1Mae",
      header: "M1 MAE",
      align: "right",
      render: (v) => (
        <span className="font-mono text-xs">
          {v != null ? formatNumber(v as number, 1) : "—"}
        </span>
      ),
    },
    {
      key: "m2Mae",
      header: "M2 MAE",
      align: "right",
      render: (v) => (
        <span className="font-mono text-xs">
          {v != null ? formatNumber(v as number, 1) : "—"}
        </span>
      ),
    },
    {
      key: "winner",
      header: "Winner",
      align: "center",
      render: (v, row) => {
        const isRev = row.isReversal as boolean;
        return (
          <span
            className={`px-2 py-0.5 rounded font-mono font-bold text-xs ${
              isRev
                ? "bg-amber-100 text-amber-800 border border-amber-300"
                : "bg-blue-50 text-blue-700 border border-blue-200"
            }`}
          >
            {String(v)}
          </span>
        );
      },
    },
    {
      key: "verdict",
      header: "Verdict",
      render: (v, row) => {
        const isRev = row.isReversal as boolean;
        return (
          <div className="flex flex-col">
            <span
              className={`font-sans text-[11px] font-medium ${
                v === "SUPPORTED" ? "text-emerald-700" : "text-slate-600"
              }`}
            >
              {String(v)}
            </span>
            {isRev && row.reversalReason ? (
              <span className="text-[10px] text-amber-700 italic">
                {String(row.reversalReason)}
              </span>
            ) : null}
          </div>
        );
      },
    },
  ];

  return (
    <div className="border border-border rounded-[16px] bg-surface overflow-hidden shadow-xs">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between p-5 bg-surface hover:bg-surface-2/40 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
              <span>Parameter Sensitivity Analysis (27 Combinations)</span>
              {sensitivity && (
                <span className="font-normal font-sans text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {sensitivity.summary.stabilityPct}% Stability
                </span>
              )}
            </h3>
            <p className="text-xs text-muted mt-0.5">
              Systematic evaluation of recovery time (D), reporting fraction (ρ), and susceptibility (fs)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
          <span>{isOpen ? "Collapse" : "Expand"}</span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-6 border-t border-border space-y-6">
          {/* Scientific Disclaimer */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold text-ink">
                Honest Robustness Verification vs Cherry-Picking
              </span>
              <p className="text-slate-600 leading-relaxed">
                Sensitivity analysis evaluates all 27 combinations of D ∈ [5, 7, 10], ρ ∈ [0.10, 0.20, 0.50],
                and fs ∈ [0.85, 0.95, 0.99] under bounded optimization (6 multi-starts vs 20) to detect whether
                superiority holds or ranking reversals occur.
              </p>
            </div>
          </div>

          {!sensitivity && status !== "QUEUED" && status !== "RUNNING" ? (
            <div className="flex flex-col items-center justify-center p-8 text-center bg-surface-2 rounded-xl border border-dashed border-border space-y-3">
              <Sliders className="w-7 h-7 text-slate-400" />
              <div>
                <h4 className="text-xs font-semibold text-ink">
                  Sensitivity analysis not yet executed for this run
                </h4>
                <p className="text-xs text-muted max-w-sm mt-0.5">
                  Click below to evaluate the 27-combination parameter grid.
                </p>
              </div>
              <button
                type="button"
                onClick={handleLaunchSensitivity}
                disabled={isPending}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors disabled:opacity-40"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Run 27-combination sensitivity matrix</span>
              </button>
            </div>
          ) : isPending ? (
            <div className="flex flex-col items-center justify-center p-10 text-center bg-surface-2 rounded-xl border border-border space-y-3">
              <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
              <div>
                <h4 className="text-xs font-semibold text-ink">
                  Evaluating 27 sensitivity configurations…
                </h4>
                <p className="text-xs text-muted max-w-sm mt-0.5">
                  Fitting M1 and M2 models across rolling origins for all combinations.
                </p>
              </div>
            </div>
          ) : sensitivity ? (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-surface border border-border">
                  <span className="text-[10px] uppercase font-semibold text-muted block mb-1">
                    Matrix Stability
                  </span>
                  <span className="text-2xl font-bold font-mono text-ink">
                    {sensitivity.summary.stabilityPct}%
                  </span>
                  <span className="text-xs text-muted block mt-1">
                    {sensitivity.summary.m2Wins} / 27 M2 superiority
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-surface border border-border">
                  <span className="text-[10px] uppercase font-semibold text-muted block mb-1">
                    Ranking Reversals
                  </span>
                  <span
                    className={`text-2xl font-bold font-mono ${
                      sensitivity.summary.reversalsCount > 0
                        ? "text-amber-600"
                        : "text-emerald-600"
                    }`}
                  >
                    {sensitivity.summary.reversalsCount}
                  </span>
                  <span className="text-xs text-muted block mt-1">
                    {sensitivity.summary.reversalsCount === 0
                      ? "Zero ranking flips"
                      : "Configs where winner reversed"}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-surface border border-border">
                  <span className="text-[10px] uppercase font-semibold text-muted block mb-1">
                    M2 vs M1 Wins
                  </span>
                  <span className="text-2xl font-bold font-mono text-ink">
                    {sensitivity.summary.m2Wins} : {sensitivity.summary.m1Wins}
                  </span>
                  <span className="text-xs text-muted block mt-1">
                    Change-point vs Constant
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-surface border border-border">
                  <span className="text-[10px] uppercase font-semibold text-muted block mb-1">
                    Verdict Reversals
                  </span>
                  <span className="text-2xl font-bold font-mono text-ink">
                    {sensitivity.summary.verdictReversalsCount}
                  </span>
                  <span className="text-xs text-muted block mt-1">
                    Verdict status modifications
                  </span>
                </div>
              </div>

              {/* Statement Banner */}
              <div className="p-4 rounded-xl bg-surface-2 border border-border text-xs text-ink font-medium leading-relaxed flex items-center justify-between gap-4">
                <span>{sensitivity.summary.stabilityStatement}</span>
                <button
                  type="button"
                  onClick={handleDownloadCsv}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-slate-50 text-xs font-semibold text-slate-700 transition shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export 27-row CSV</span>
                </button>
              </div>

              {/* 27-row DataTable */}
              <DataTable
                columns={tableColumns}
                data={tableData}
                pageSize={10}
                caption="27-Combination Parameter Matrix Results"
              />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
