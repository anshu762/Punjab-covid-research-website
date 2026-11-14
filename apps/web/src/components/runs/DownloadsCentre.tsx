"use client";

import React, { useState } from "react";
import {
  DownloadCloud,
  FileArchive,
  FileSpreadsheet,
  FileImage,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import type { RunItem } from "@/hooks/useRuns";
import type { ExportType } from "@epilens/shared";
import { useRunExports, useCreateExport } from "@/hooks/useExports";
import { CopyButton } from "@/components/common/CopyButton";
import { DemoBadge } from "@/components/common/DemoBadge";

interface DownloadsCentreProps {
  runs: RunItem[];
  defaultRunId?: string;
}

interface ExportDefinition {
  type: ExportType;
  title: string;
  description: string;
  format: "ZIP" | "CSV" | "PNG" | "SVG";
  icon: React.ComponentType<{ className?: string }>;
}

const EXPORT_DEFINITIONS: ExportDefinition[] = [
  {
    type: "BUNDLE_ZIP",
    title: "Complete Reproducibility Bundle",
    description: "Full archive containing SHA-256 manifest, configuration, provenance metadata, all CSVs, and 300 DPI publication figures.",
    format: "ZIP",
    icon: FileArchive,
  },
  {
    type: "FITTED_STATES_CSV",
    title: "Fitted Model Trajectories",
    description: "Numerical ODE trajectories for latent states (S, I, R, C), dynamic transmission (β), and effective reproduction number (R_eff).",
    format: "CSV",
    icon: FileSpreadsheet,
  },
  {
    type: "FORECASTS_CSV",
    title: "Forecast Evaluation Rows",
    description: "Rolling 7-day held-out forecasts across 13 origins with predictive intervals and baseline models.",
    format: "CSV",
    icon: FileSpreadsheet,
  },
  {
    type: "METRICS_CSV",
    title: "Model Selection Metrics",
    description: "Development and final split MAE, RMSE, mean absolute total error, and block win tallies.",
    format: "CSV",
    icon: FileSpreadsheet,
  },
  {
    type: "CLEANED_DATASET_CSV",
    title: "Cleaned Observations Dataset",
    description: "Normalized daily case counts with anomaly corrections and testing metrics.",
    format: "CSV",
    icon: FileSpreadsheet,
  },
  {
    type: "FIGURE_PNG",
    title: "Publication Figure (300 DPI PNG)",
    description: "Server-side matplotlib high-resolution raster figure with parameter annotations.",
    format: "PNG",
    icon: FileImage,
  },
  {
    type: "FIGURE_SVG",
    title: "Publication Figure (Vector SVG)",
    description: "Scalable vector graphic suitable for print publications and vector editors.",
    format: "SVG",
    icon: FileImage,
  },
];

export function DownloadsCentre({ runs, defaultRunId }: DownloadsCentreProps) {
  const completedRuns = runs.filter((r) => r.status === "COMPLETED");
  const [selectedRunId, setSelectedRunId] = useState<string>(
    defaultRunId && completedRuns.some((r) => r.id === defaultRunId)
      ? defaultRunId
      : completedRuns[0]?.id || ""
  );

  const { data: exports = [] } = useRunExports(selectedRunId);
  const createExportMutation = useCreateExport();
  const [requestingType, setRequestingType] = useState<ExportType | null>(null);

  const selectedRun = runs.find((r) => r.id === selectedRunId);

  async function handleRequestExport(type: ExportType) {
    if (!selectedRunId) {
      toast.error("Please select a completed run");
      return;
    }

    try {
      setRequestingType(type);
      await createExportMutation.mutateAsync({
        runId: selectedRunId,
        type,
      });
      toast.success("Export queued. Generating package…");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create export");
    } finally {
      setRequestingType(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Run Selector Card */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 bg-surface border border-border rounded-[14px] shadow-xs">
        <div className="space-y-1">
          <label
            htmlFor="export-run-select"
            className="text-xs font-semibold uppercase tracking-wider text-muted block"
          >
            Select Target Run for Reproducibility Exports
          </label>
          <div className="flex items-center gap-2">
            <select
              id="export-run-select"
              value={selectedRunId}
              onChange={(e) => setSelectedRunId(e.target.value)}
              disabled={completedRuns.length === 0}
              className="text-xs font-medium text-ink bg-surface border border-border rounded-lg px-3 py-2 w-full sm:w-auto sm:min-w-[280px] focus:ring-2 focus:ring-blue-600 focus:outline-none"
            >
              {completedRuns.length === 0 ? (
                <option value="">No completed runs available</option>
              ) : (
                completedRuns.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.displayName} ({r.modelType} · {r.mode})
                  </option>
                ))
              )}
            </select>

            {selectedRun?.dataset?.isSynthetic && <DemoBadge />}
          </div>
        </div>

        {selectedRun && (
          <div className="flex items-center gap-4 text-xs font-mono text-muted bg-surface-2 p-2.5 rounded-lg border border-border/60">
            <div>
              <span className="text-[10px] uppercase font-sans text-slate-400 block">Dataset</span>
              <span className="text-ink font-semibold">{selectedRun.dataset?.name}</span>
            </div>
            <div className="h-6 w-px bg-border" />
            <div>
              <span className="text-[10px] uppercase font-sans text-slate-400 block">Run ID</span>
              <span className="text-ink">{selectedRun.id.slice(0, 8)}…</span>
            </div>
          </div>
        )}
      </div>

      {/* Security Disclaimer Banner */}
      <div className="flex items-start gap-3 p-4 rounded-[14px] bg-slate-50 border border-slate-200 text-slate-800 text-xs">
        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-semibold text-slate-900 block">
            Cryptographic Integrity & Security Audited
          </span>
          <p className="text-slate-600 leading-relaxed">
            All download bundles include SHA-256 cryptographic manifests for every file. In accordance with
            EpiLens scientific integrity rules, internal server paths, private tokens, and credentials are
            strictly audited and stripped from all manifests. Download tokens expire in 5 minutes.
          </p>
        </div>
      </div>

      {/* Grid of Export Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {EXPORT_DEFINITIONS.map((def) => {
          const Icon = def.icon;
          // Find existing export for this type
          const existingExport = exports.find((e) => e.type === def.type);
          const isPending =
            requestingType === def.type ||
            (existingExport &&
              (existingExport.status === "QUEUED" || existingExport.status === "RUNNING"));
          const isReady = existingExport && existingExport.status === "READY" && existingExport.downloadUrl;

          return (
            <div
              key={def.type}
              className={`p-5 rounded-[14px] bg-surface border transition-all flex flex-col justify-between ${
                def.type === "BUNDLE_ZIP"
                  ? "border-blue-300 bg-blue-50/20 shadow-xs md:col-span-2"
                  : "border-border shadow-xs hover:border-slate-300"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        def.type === "BUNDLE_ZIP"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-surface-2 text-slate-700 border border-border"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-ink">{def.title}</h4>
                      <span className="font-mono text-[10px] text-muted uppercase">
                        Format: {def.format}
                      </span>
                    </div>
                  </div>

                  {existingExport?.status === "READY" && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Ready</span>
                    </span>
                  )}
                  {existingExport?.status === "FAILED" && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                      <AlertCircle className="w-3 h-3 text-rose-600" />
                      <span>Failed</span>
                    </span>
                  )}
                </div>

                <p className="text-xs text-muted leading-relaxed">{def.description}</p>

                {existingExport?.checksum && (
                  <div className="flex items-center gap-1.5 pt-1 text-[10px] font-mono text-slate-500">
                    <span className="font-sans font-medium text-slate-400">SHA-256:</span>
                    <span className="truncate max-w-[200px]">{existingExport.checksum}</span>
                    <CopyButton value={existingExport.checksum} label="Copy Hash" />
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="pt-4 mt-2 border-t border-border/60 flex items-center justify-between gap-3">
                <div className="text-[11px] text-muted">
                  {existingExport?.expiresAt && (
                    <span>
                      Token expires in 5 min on download
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {isReady ? (
                    <a
                      href={existingExport.downloadUrl}
                      download
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
                    >
                      <DownloadCloud className="w-3.5 h-3.5" />
                      <span>Download {def.format}</span>
                    </a>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => handleRequestExport(def.type)}
                    disabled={Boolean(isPending) || !selectedRunId}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                      isReady
                        ? "bg-surface hover:bg-surface-2 text-slate-700 border-border"
                        : "bg-blue-600 hover:bg-blue-700 text-white border-transparent"
                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Generating…</span>
                      </>
                    ) : (
                      <>
                        <DownloadCloud className="w-3.5 h-3.5" />
                        <span>{isReady ? "Regenerate" : "Generate Export"}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
