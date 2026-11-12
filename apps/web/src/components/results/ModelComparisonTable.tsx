"use client";

import React, { useState, useMemo } from "react";
import { formatNumber, formatDisplayDate } from "@epilens/shared";
import type { FitResultPayload } from "@epilens/shared";
import { downloadCsv } from "@/lib/downloadCsv";
import {
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Download,
  ArrowUpDown,
  ShieldCheck,
  Star,
} from "lucide-react";

interface ModelComparisonTableProps {
  payload: FitResultPayload;
}

const REQUIRED_MODELS = [
  { key: "M1", defaultLabel: "Constant SIR" },
  { key: "M2", defaultLabel: "Change-point SIR" },
  { key: "baseline_mean", defaultLabel: "Seven-day mean baseline" },
  { key: "baseline_weekday", defaultLabel: "Same-weekday baseline" },
];

export function ModelComparisonTable({ payload }: ModelComparisonTableProps) {
  const evaluation = payload.evaluation;
  const [originsExpanded, setOriginsExpanded] = useState(false);
  const [sortField, setSortField] = useState<"finalMae" | "finalRmse" | "developmentMae" | "blocksWon">("finalMae");
  const [sortAsc, setSortAsc] = useState(true);

  const comparison = evaluation?.comparison;

  // Build exactly 4 rows
  const modelRows = useMemo(() => {
    if (!comparison) return [];
    return REQUIRED_MODELS.map(({ key, defaultLabel }) => {
      const found = comparison.find((r) => r.model === key);
      if (found) return found;
      // Honest missing/failed row representation
      return {
        model: key,
        label: defaultLabel,
        developmentMae: null,
        finalMae: null,
        finalRmse: null,
        meanAbsTotalError: null,
        blocksWon: 0,
        blocksWonDev: 0,
        blocksWonFinal: 0,
        status: "failed" as const,
        reason: "Model unavailable or not evaluated",
      };
    });
  }, [comparison]);

  // Sorted rows
  const sortedRows = useMemo(() => {
    return [...modelRows].sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];
      if (valA === null && valB === null) return 0;
      if (valA === null) return 1;
      if (valB === null) return -1;
      return sortAsc ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
    });
  }, [modelRows, sortField, sortAsc]);

  if (!evaluation) {
    return null;
  }

  const { selection, blocks } = evaluation;

  function handleSort(field: "finalMae" | "finalRmse" | "developmentMae" | "blocksWon") {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  }

  function handleDownloadOriginsCsv() {
    const headers = [
      "Block",
      "Origin Date",
      "Split",
      "Target Start",
      "Target End",
      "M1 MAE",
      "M2 MAE",
      "7-Day Mean MAE",
      "Same-Weekday MAE",
      "M1 RMSE",
      "M2 RMSE",
      "7-Day Mean RMSE",
      "Same-Weekday RMSE",
      "M1 Total Error",
      "M2 Total Error",
      "7-Day Mean Total Error",
      "Same-Weekday Total Error",
    ];

    const rows = blocks.map((b) => [
      b.index,
      b.origin,
      b.split,
      b.targetStart,
      b.targetEnd,
      b.mae.M1 ?? "",
      b.mae.M2 ?? "",
      b.mae.baseline_mean ?? "",
      b.mae.baseline_weekday ?? "",
      b.rmse.M1 ?? "",
      b.rmse.M2 ?? "",
      b.rmse.baseline_mean ?? "",
      b.rmse.baseline_weekday ?? "",
      b.totalError.M1 ?? "",
      b.totalError.M2 ?? "",
      b.totalError.baseline_mean ?? "",
      b.totalError.baseline_weekday ?? "",
    ]);

    downloadCsv(`epilens_${payload.run.id.slice(0, 8)}_origin_scores.csv`, headers, rows);
  }

  return (
    <div
      role="region"
      aria-label="Model comparison and validation scores"
      className="bg-surface rounded-2xl border border-border shadow-2xs overflow-hidden space-y-0"
    >
      <div className="px-5 py-4 border-b border-border bg-surface flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-ink tracking-tight">Model Comparison & Rolling Scores</h4>
          <p className="text-xs text-muted mt-0.5">
            Rolling 7-day forecast validation across 13 temporal origins (9 development, 4 final blocks).
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-surface-2 border-b border-border text-muted font-medium">
              <th scope="col" className="py-2.5 px-4">Model Candidate</th>
              <th
                scope="col"
                className="py-2.5 px-4 text-right cursor-pointer hover:text-ink select-none"
                onClick={() => handleSort("developmentMae")}
              >
                <div className="inline-flex items-center gap-1">
                  <span>Dev MAE (9)</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                scope="col"
                className="py-2.5 px-4 text-right cursor-pointer hover:text-ink select-none"
                onClick={() => handleSort("finalMae")}
              >
                <div className="inline-flex items-center gap-1">
                  <span>Final MAE (4)</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                scope="col"
                className="py-2.5 px-4 text-right cursor-pointer hover:text-ink select-none"
                onClick={() => handleSort("finalRmse")}
              >
                <div className="inline-flex items-center gap-1">
                  <span>Final RMSE</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th scope="col" className="py-2.5 px-4 text-right">
                Mean Total Error
              </th>
              <th
                scope="col"
                className="py-2.5 px-4 text-center cursor-pointer hover:text-ink select-none"
                onClick={() => handleSort("blocksWon")}
              >
                <div className="inline-flex items-center gap-1 justify-center">
                  <span>Blocks Won</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th scope="col" className="py-2.5 px-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {sortedRows.map((r) => {
              const isSelectedSir = r.model === selection.selectedSir;
              const isSelectedBaseline = r.model === selection.selectedBaseline;

              return (
                <tr
                  key={r.model}
                  className={`transition-colors ${
                    isSelectedSir
                      ? "bg-blue-50/40 font-semibold"
                      : isSelectedBaseline
                      ? "bg-slate-50/60"
                      : "hover:bg-surface-2/60"
                  }`}
                >
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-ink">{r.label}</span>
                      {isSelectedSir && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-md bg-blue-100 text-blue-800 border border-blue-300">
                          <Star className="w-3 h-3 fill-blue-700 text-blue-700" /> Selected SIR
                        </span>
                      )}
                      {isSelectedBaseline && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-200 text-slate-800 border border-slate-300">
                          <ShieldCheck className="w-3 h-3 text-slate-600" /> Selected Baseline
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Dev MAE */}
                  <td className="py-3 px-4 text-right font-mono">
                    {r.developmentMae !== null && r.developmentMae !== undefined ? (
                      formatNumber(r.developmentMae, 1)
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>

                  {/* Final MAE */}
                  <td className="py-3 px-4 text-right font-mono font-bold text-ink">
                    {r.finalMae !== null && r.finalMae !== undefined ? (
                      formatNumber(r.finalMae, 1)
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>

                  {/* Final RMSE */}
                  <td className="py-3 px-4 text-right font-mono">
                    {r.finalRmse !== null && r.finalRmse !== undefined ? (
                      formatNumber(r.finalRmse, 1)
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>

                  {/* 7-day total error */}
                  <td className="py-3 px-4 text-right font-mono text-slate-700">
                    {r.meanAbsTotalError !== null && r.meanAbsTotalError !== undefined ? (
                      formatNumber(r.meanAbsTotalError, 1)
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>

                  {/* Blocks won */}
                  <td className="py-3 px-4 text-center">
                    {r.status === "ok" ? (
                      <span
                        className="font-mono text-ink text-xs inline-block"
                        title={`${r.blocksWonDev} dev blocks won, ${r.blocksWonFinal} final blocks won`}
                      >
                        {r.blocksWon}/13
                      </span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>

                  {/* Status / Reason */}
                  <td className="py-3 px-4 text-center">
                    {r.status === "ok" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" /> OK
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-md bg-rose-50 text-rose-700 border border-rose-200"
                        title={r.reason || "Failed"}
                      >
                        <AlertCircle className="w-3 h-3" />
                        <span className="truncate max-w-[150px]">{r.reason || "Failed"}</span>
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Expandable Origin-Level Scores */}
      <div className="border-t border-border">
        <button
          type="button"
          onClick={() => setOriginsExpanded(!originsExpanded)}
          aria-expanded={originsExpanded}
          className="w-full flex items-center justify-between px-5 py-3 bg-surface hover:bg-surface-2 transition text-xs font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          <div className="flex items-center gap-2">
            <span>Origin-Level Scores (13 Rolling Temporal Blocks)</span>
            <span className="px-2 py-0.5 text-[10px] font-normal text-muted bg-surface-2 rounded border border-border">
              {blocks.length} blocks evaluated
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted">
              {originsExpanded ? "Collapse origin details" : "Expand origin scores"}
            </span>
            {originsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {originsExpanded && (
          <div className="p-5 border-t border-border bg-surface-2/40 space-y-3">
            <div className="flex items-center justify-between gap-3 pb-2">
              <p className="text-xs text-muted">
                Detailed forecast errors per origin cutoff. First 9 origins form the Development split; last 4 form the Final frozen split.
              </p>
              <button
                type="button"
                onClick={handleDownloadOriginsCsv}
                aria-label="Download origin-level scores CSV"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-surface hover:bg-slate-50 border border-border rounded-lg shadow-2xs transition"
              >
                <Download className="w-3.5 h-3.5 text-blue-600" />
                <span>Export Origin CSV</span>
              </button>
            </div>

            <div className="overflow-x-auto bg-surface rounded-xl border border-border">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead>
                  <tr className="bg-surface-2 border-b border-border text-muted font-medium">
                    <th scope="col" className="py-2 px-3">#</th>
                    <th scope="col" className="py-2 px-3">Origin</th>
                    <th scope="col" className="py-2 px-3">Split</th>
                    <th scope="col" className="py-2 px-3">Forecast Targets</th>
                    <th scope="col" className="py-2 px-3 text-right">M1 MAE</th>
                    <th scope="col" className="py-2 px-3 text-right">M2 MAE</th>
                    <th scope="col" className="py-2 px-3 text-right">7d Mean</th>
                    <th scope="col" className="py-2 px-3 text-right">Weekday</th>
                    <th scope="col" className="py-2 px-3 text-right">M1 Tot Err</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {blocks.map((b) => (
                    <tr key={b.index} className="hover:bg-surface-2/40 transition">
                      <td className="py-2 px-3 font-mono font-semibold text-ink">{b.index}</td>
                      <td className="py-2 px-3 font-mono">{b.origin}</td>
                      <td className="py-2 px-3">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                            b.split === "final"
                              ? "bg-purple-50 text-purple-700 border-purple-200"
                              : "bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          {b.split}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-muted">
                        {formatDisplayDate(b.targetStart)} – {formatDisplayDate(b.targetEnd)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono">
                        {b.mae.M1 !== null && b.mae.M1 !== undefined ? formatNumber(b.mae.M1, 1) : "—"}
                      </td>
                      <td className="py-2 px-3 text-right font-mono">
                        {b.mae.M2 !== null && b.mae.M2 !== undefined ? formatNumber(b.mae.M2, 1) : "—"}
                      </td>
                      <td className="py-2 px-3 text-right font-mono">
                        {b.mae.baseline_mean !== null && b.mae.baseline_mean !== undefined
                          ? formatNumber(b.mae.baseline_mean, 1)
                          : "—"}
                      </td>
                      <td className="py-2 px-3 text-right font-mono">
                        {b.mae.baseline_weekday !== null && b.mae.baseline_weekday !== undefined
                          ? formatNumber(b.mae.baseline_weekday, 1)
                          : "—"}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-medium text-ink">
                        {b.totalError.M1 !== null && b.totalError.M1 !== undefined
                          ? formatNumber(b.totalError.M1, 1)
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
