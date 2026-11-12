"use client";

import React from "react";
import { X, AlertTriangle, Trophy, ExternalLink } from "lucide-react";
import type { RunItem } from "@/hooks/useRuns";
import {
  evaluateRunComparison,
  type ComparableRunSummary,
  formatNumber,
  formatDisplayDate,
} from "@epilens/shared";
import { DemoBadge } from "@/components/common/DemoBadge";
import Link from "next/link";

interface RunCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedRuns: RunItem[];
}

export function RunCompareModal({
  isOpen,
  onClose,
  selectedRuns,
}: RunCompareModalProps) {
  if (!isOpen || selectedRuns.length < 2) return null;

  // Build ComparableRunSummary objects
  const comparableRuns: ComparableRunSummary[] = selectedRuns.map((r) => {
    const rawPayload = r.fitResult?.payload as Record<string, unknown> | undefined;
    const evalData = rawPayload?.evaluation as Record<string, unknown> | undefined;
    const diagData = rawPayload?.diagnostics as Record<string, unknown> | undefined;

    const finalMae =
      typeof evalData?.finalMae === "number"
        ? evalData.finalMae
        : typeof (evalData?.comparison as Array<Record<string, unknown>> | undefined)?.[0]?.finalMae === "number"
        ? (evalData?.comparison as Array<Record<string, unknown>>)[0].finalMae as number
        : null;

    const finalRmse =
      typeof evalData?.finalRmse === "number"
        ? evalData.finalRmse
        : typeof (evalData?.comparison as Array<Record<string, unknown>> | undefined)?.[0]?.finalRmse === "number"
        ? (evalData?.comparison as Array<Record<string, unknown>>)[0].finalRmse as number
        : null;

    const meanAbsTotalError =
      typeof evalData?.meanAbsTotalError === "number"
        ? evalData.meanAbsTotalError
        : typeof (evalData?.comparison as Array<Record<string, unknown>> | undefined)?.[0]?.meanAbsTotalError === "number"
        ? (evalData?.comparison as Array<Record<string, unknown>>)[0].meanAbsTotalError as number
        : null;

    const devMae =
      typeof evalData?.developmentMae === "number"
        ? evalData.developmentMae
        : typeof (evalData?.comparison as Array<Record<string, unknown>> | undefined)?.[0]?.developmentMae === "number"
        ? (evalData?.comparison as Array<Record<string, unknown>>)[0].developmentMae as number
        : null;

    const blocksWon =
      typeof (evalData?.comparison as Array<Record<string, unknown>> | undefined)?.[0]?.blocksWon === "number"
        ? (evalData?.comparison as Array<Record<string, unknown>>)[0].blocksWon as number
        : 0;

    const origins = Array.isArray(evalData?.origins)
      ? (evalData?.origins as string[])
      : undefined;

    return {
      id: r.id,
      displayName: r.displayName,
      mode: r.mode,
      modelType: r.modelType,
      datasetId: r.dataset?.id || r.config?.datasetId || "unknown",
      datasetVersion: r.dataset?.version || 1,
      datasetName: r.dataset?.name || "Dataset",
      dateRange: {
        start: r.config?.dateRange?.start || "2020-07-01",
        end: r.config?.dateRange?.end || "2020-11-30",
      },
      targetDates: origins,
      evaluation: {
        finalMae,
        finalRmse,
        meanAbsTotalError,
        developmentMae: devMae,
        blocksWon,
      },
      diagnosticsStatus: diagData?.status as "ok" | "warnings" | "problems" | undefined,
    };
  });

  const comparisonResult = evaluateRunComparison(comparableRuns);
  const { compatible, reasons, rankings } = comparisonResult;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/60 backdrop-blur-xs">
      <div
        className="w-full max-w-4xl bg-surface border border-border rounded-[16px] shadow-xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="compare-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface">
          <div>
            <h3 id="compare-modal-title" className="text-base font-semibold text-ink">
              Multi-run comparison ({selectedRuns.length} runs)
            </h3>
            <p className="text-xs text-muted mt-0.5">
              Side-by-side evaluation metrics and compatibility condition checks
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-surface-2 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Compatibility Banner */}
        <div className="px-6 py-3 border-b border-border bg-surface-2">
          {!compatible ? (
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold text-amber-950">
                  Different evaluation conditions — Ranking omitted
                </span>
                <ul className="list-disc pl-4 space-y-0.5 text-amber-800">
                  {reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
                <p className="text-[11px] text-amber-700 pt-0.5">
                  Fair comparison requires identical datasets, identical versions, and identical evaluation target windows.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs">
              <Trophy className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <span className="font-semibold text-emerald-950">
                  Evaluation conditions match identically
                </span>
                <p className="text-emerald-800 text-[11px]">
                  All runs evaluated against identical target dates and dataset version. Ranked by Final MAE.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Content Table */}
        <div className="flex-1 overflow-auto p-6">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2.5 px-3 font-semibold text-muted uppercase tracking-wider w-40 bg-surface sticky left-0">
                  Metric / Attribute
                </th>
                {selectedRuns.map((run) => {
                  const rankInfo = rankings?.find((rk) => rk.runId === run.id);
                  const isWinner = rankInfo?.rank === 1;

                  return (
                    <th
                      key={run.id}
                      className={`py-2.5 px-4 font-semibold text-ink min-w-[200px] ${
                        isWinner ? "bg-emerald-50/50" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-bold">{run.displayName}</span>
                        {run.dataset?.isSynthetic && <DemoBadge />}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[11px] font-mono font-normal text-muted">
                        <span className="px-1.5 py-0.5 rounded bg-surface border border-border">
                          {run.modelType}
                        </span>
                        <span>{run.mode}</span>
                        {isWinner && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold font-sans text-[10px]">
                            Rank #1
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {/* Rank row */}
              {compatible && rankings && (
                <tr className="bg-surface-2/40 font-semibold">
                  <td className="py-2.5 px-3 text-muted sticky left-0 bg-surface">Model Rank</td>
                  {selectedRuns.map((run) => {
                    const rk = rankings.find((r) => r.runId === run.id);
                    return (
                      <td key={run.id} className="py-2.5 px-4 font-mono text-ink">
                        {rk ? (
                          <span
                            className={
                              rk.rank === 1
                                ? "text-emerald-700 font-bold"
                                : "text-slate-600"
                            }
                          >
                            #{rk.rank} {rk.rank === 1 ? "(Lowest final MAE)" : ""}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    );
                  })}
                </tr>
              )}

              {/* Dataset & Version */}
              <tr>
                <td className="py-2.5 px-3 text-muted sticky left-0 bg-surface">Dataset</td>
                {selectedRuns.map((run) => (
                  <td key={run.id} className="py-2.5 px-4 text-ink">
                    {run.dataset?.name || "Dataset"} (v{run.dataset?.version || 1})
                  </td>
                ))}
              </tr>

              {/* Date Range */}
              <tr>
                <td className="py-2.5 px-3 text-muted sticky left-0 bg-surface">Date Range</td>
                {selectedRuns.map((run) => (
                  <td key={run.id} className="py-2.5 px-4 font-mono text-[11px] text-slate-700">
                    {formatDisplayDate(run.config?.dateRange?.start || "2020-07-01")} →{" "}
                    {formatDisplayDate(run.config?.dateRange?.end || "2020-11-30")}
                  </td>
                ))}
              </tr>

              {/* Final MAE */}
              <tr>
                <td className="py-2.5 px-3 text-muted sticky left-0 bg-surface">Final MAE</td>
                {comparableRuns.map((cr) => (
                  <td key={cr.id} className="py-2.5 px-4 font-mono font-medium text-ink">
                    {cr.evaluation?.finalMae != null ? formatNumber(cr.evaluation.finalMae, 2) : "—"}
                  </td>
                ))}
              </tr>

              {/* Final RMSE */}
              <tr>
                <td className="py-2.5 px-3 text-muted sticky left-0 bg-surface">Final RMSE</td>
                {comparableRuns.map((cr) => (
                  <td key={cr.id} className="py-2.5 px-4 font-mono text-ink">
                    {cr.evaluation?.finalRmse != null ? formatNumber(cr.evaluation.finalRmse, 2) : "—"}
                  </td>
                ))}
              </tr>

              {/* Mean Abs Total Error */}
              <tr>
                <td className="py-2.5 px-3 text-muted sticky left-0 bg-surface">Mean Abs Total Error</td>
                {comparableRuns.map((cr) => (
                  <td key={cr.id} className="py-2.5 px-4 font-mono text-ink">
                    {cr.evaluation?.meanAbsTotalError != null ? formatNumber(cr.evaluation.meanAbsTotalError, 1) : "—"}
                  </td>
                ))}
              </tr>

              {/* Development MAE */}
              <tr>
                <td className="py-2.5 px-3 text-muted sticky left-0 bg-surface">Development MAE</td>
                {comparableRuns.map((cr) => (
                  <td key={cr.id} className="py-2.5 px-4 font-mono text-ink">
                    {cr.evaluation?.developmentMae != null ? formatNumber(cr.evaluation.developmentMae, 2) : "—"}
                  </td>
                ))}
              </tr>

              {/* Blocks Won */}
              <tr>
                <td className="py-2.5 px-3 text-muted sticky left-0 bg-surface">Blocks Won</td>
                {comparableRuns.map((cr) => (
                  <td key={cr.id} className="py-2.5 px-4 font-mono text-ink">
                    {cr.evaluation?.blocksWon ?? "—"}
                  </td>
                ))}
              </tr>

              {/* Diagnostics Status */}
              <tr>
                <td className="py-2.5 px-3 text-muted sticky left-0 bg-surface">Diagnostics</td>
                {comparableRuns.map((cr) => (
                  <td key={cr.id} className="py-2.5 px-4 font-mono capitalize">
                    {cr.diagnosticsStatus ? (
                      <span
                        className={`px-2 py-0.5 rounded font-sans text-[11px] ${
                          cr.diagnosticsStatus === "ok"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : cr.diagnosticsStatus === "warnings"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {cr.diagnosticsStatus}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                ))}
              </tr>

              {/* View Results Link */}
              <tr>
                <td className="py-3 px-3 text-muted sticky left-0 bg-surface">Actions</td>
                {selectedRuns.map((run) => (
                  <td key={run.id} className="py-3 px-4">
                    <Link
                      href={`/results?run=${run.id}`}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      <span>Open in Results</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-border bg-surface">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-surface hover:bg-surface-2 border border-border rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
