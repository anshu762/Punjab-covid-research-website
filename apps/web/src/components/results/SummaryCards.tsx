"use client";

import React from "react";
import Link from "next/link";
import { formatNumber } from "@epilens/shared";
import type { FitResultPayload } from "@epilens/shared";
import { useWorkspaceStore } from "@/store/workspace";
import {
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Activity,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Info,
} from "lucide-react";

interface SummaryCardsProps {
  payload: FitResultPayload;
  onSelectDiagnosticsTab?: () => void;
}

export function SummaryCards({ payload, onSelectDiagnosticsTab }: SummaryCardsProps) {
  const setModelSettingsDraft = useWorkspaceStore((s) => s.setModelSettingsDraft);
  const evaluation = payload.evaluation;
  const isEvaluate = payload.run.mode === "EVALUATE" && Boolean(evaluation);

  // If Fit-only run
  if (!isEvaluate || !evaluation) {
    function handlePrefillForEvaluation() {
      setModelSettingsDraft({
        mode: "EVALUATE",
        modelType: payload.run.modelType,
        infectiousDurationDays: payload.assumptions.infectiousDurationDays,
        reportingFractionPercent: payload.assumptions.reportingFraction * 100,
        susceptibleFractionPercent: payload.assumptions.susceptibleFraction * 100,
      });
    }

    return (
      <div
        role="region"
        aria-label="Fit-only summary"
        className="bg-surface rounded-2xl border border-border p-5 sm:p-6 shadow-2xs space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                Fit Mode Analysis
              </span>
              <h3 className="text-base font-bold text-ink">Forecast performance not evaluated</h3>
            </div>
            <p className="text-xs text-muted leading-relaxed max-w-2xl">
              This analysis was executed in <strong>Fit-only</strong> mode. The fitted trajectory describes
              historical incidence across the full period without holding out observations. To rigorously test
              predictive skill against rolling 7-day baselines, launch a 13-origin forecast evaluation.
            </p>
          </div>

          <Link
            href="/model"
            onClick={handlePrefillForEvaluation}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-xs transition shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <span>Evaluate seven-day forecasts</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  // Evaluated Run
  const selectedSir = evaluation.selection.selectedSir;
  const sirRow = evaluation.comparison.find((r) => r.model === selectedSir);
  const finalMae = sirRow?.finalMae;
  const finalRmse = sirRow?.finalRmse;
  const improvement = evaluation.selection.improvement;
  const diagStatus = payload.diagnostics.status;

  // Improvement formatting
  let improvementDisplay: React.ReactNode = "—";
  if (improvement === null || improvement === undefined) {
    improvementDisplay = (
      <span className="text-xs font-medium text-muted">Undefined (baseline error is zero)</span>
    );
  } else if (improvement > 0) {
    improvementDisplay = (
      <span className="flex items-center gap-1 font-mono font-bold text-emerald-700">
        <TrendingDown className="w-4 h-4 text-emerald-600" />
        <span>+{formatNumber(improvement, 1)}%</span>
        <span className="text-xs font-normal text-muted ml-1">(error reduced)</span>
      </span>
    );
  } else {
    improvementDisplay = (
      <span className="flex items-center gap-1 font-mono font-bold text-rose-700">
        <TrendingUp className="w-4 h-4 text-rose-600" />
        <span>{formatNumber(improvement, 1)}%</span>
        <span className="text-xs font-normal text-muted ml-1">(baseline better)</span>
      </span>
    );
  }

  return (
    <div role="region" aria-label="Evaluation summary" className="space-y-4">
      {/* Incomplete Evaluation Banner */}
      {evaluation.incomplete && (
        <div
          role="alert"
          className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-amber-900 text-xs"
        >
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block mb-0.5">Evaluation Protocol Incomplete</span>
            <p className="leading-relaxed">
              One or more origins failed convergence or encountered numerical bounds:
            </p>
            <ul className="list-disc list-inside mt-1 space-y-0.5 font-mono text-[11px]">
              {evaluation.incompleteReasons.map((reason, idx) => (
                <li key={idx}>{reason}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* 4 StatCards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Final MAE */}
        <div className="bg-surface p-4 sm:p-5 rounded-2xl border border-border shadow-2xs space-y-1">
          <span className="text-xs text-muted flex items-center gap-1.5 font-medium">
            <Activity className="w-3.5 h-3.5 text-blue-600" /> Forecast MAE (Final)
          </span>
          <span className="text-2xl font-bold font-mono text-ink block">
            {finalMae !== null && finalMae !== undefined ? formatNumber(finalMae, 1) : "—"}
          </span>
          <span className="text-[11px] text-muted block">
            Selected SIR ({selectedSir}) final blocks mean error
          </span>
        </div>

        {/* Card 2: Final RMSE */}
        <div className="bg-surface p-4 sm:p-5 rounded-2xl border border-border shadow-2xs space-y-1">
          <span className="text-xs text-muted flex items-center gap-1.5 font-medium">
            <Activity className="w-3.5 h-3.5 text-blue-600" /> Forecast RMSE (Final)
          </span>
          <span className="text-2xl font-bold font-mono text-ink block">
            {finalRmse !== null && finalRmse !== undefined ? formatNumber(finalRmse, 1) : "—"}
          </span>
          <span className="text-[11px] text-muted block">Root mean squared error (final blocks)</span>
        </div>

        {/* Card 3: Improvement Over Baseline */}
        <div className="bg-surface p-4 sm:p-5 rounded-2xl border border-border shadow-2xs space-y-1">
          <span className="text-xs text-muted flex items-center gap-1.5 font-medium">
            <TrendingDown className="w-3.5 h-3.5 text-blue-600" /> Baseline Improvement
          </span>
          <div className="text-xl font-bold block">{improvementDisplay}</div>
          <span className="text-[11px] text-muted block">
            vs. {evaluation.selection.selectedBaseline === "baseline_mean" ? "7-day mean" : "Same weekday"}
          </span>
        </div>

        {/* Card 4: Diagnostic Status */}
        <div className="bg-surface p-4 sm:p-5 rounded-2xl border border-border shadow-2xs space-y-1">
          <span className="text-xs text-muted flex items-center gap-1.5 font-medium">
            <HelpCircle className="w-3.5 h-3.5 text-blue-600" /> Diagnostic Status
          </span>
          <div className="flex items-center gap-2 pt-0.5">
            {diagStatus === "ok" ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" /> OK
              </span>
            ) : diagStatus === "warnings" ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                <AlertTriangle className="w-3.5 h-3.5" /> Warnings
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                <AlertCircle className="w-3.5 h-3.5" /> Problems
              </span>
            )}

            {onSelectDiagnosticsTab && (
              <button
                type="button"
                onClick={onSelectDiagnosticsTab}
                className="text-[11px] text-blue-600 hover:text-blue-700 hover:underline font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-600 rounded"
              >
                View diagnostics
              </button>
            )}
          </div>
          <span className="text-[11px] text-muted block">
            {payload.diagnostics.warnings.length === 0
              ? "All convergence checks passed"
              : `${payload.diagnostics.warnings.length} warning(s) flagged`}
          </span>
        </div>
      </div>

      {/* Verdict and Scientific Honesty Banner */}
      <div className="p-4 bg-surface rounded-2xl border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 text-blue-700 rounded-xl shrink-0">
            <Info className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-ink text-sm">
              Verdict: {evaluation.selection.verdictText}
            </div>
            <div className="text-muted text-[11px]">
              {evaluation.selection.rulesNote}
            </div>
          </div>
        </div>

        <div className="px-3 py-1 rounded-lg bg-surface-2 border border-border text-[11px] text-muted self-start sm:self-auto font-mono">
          {evaluation.retrospectiveNote}
        </div>
      </div>
    </div>
  );
}
