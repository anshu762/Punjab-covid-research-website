"use client";

import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Ban,
  Check,
  Edit2,
  ArrowRight,
  RotateCw,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { type RunItem, useCancelRun, useRenameRun } from "@/hooks/useRuns";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { CopyButton } from "@/components/common/CopyButton";

interface RunProgressProps {
  run: RunItem;
  onEditSettings?: () => void;
  onRunAnother?: () => void;
}

const STAGES_FIT = [
  { id: "queued", label: "Queued in queue" },
  { id: "validating", label: "Validating inputs" },
  { id: "fitting", label: "Fitting SIR equations" },
  { id: "estimating_uncertainty", label: "Estimating bootstrap" },
  { id: "exporting", label: "Exporting diagnostics" },
  { id: "completed", label: "Completed" },
];

const STAGES_EVALUATE = [
  { id: "queued", label: "Queued in queue" },
  { id: "validating", label: "Validating inputs" },
  { id: "evaluating", label: "Evaluating forecast blocks" },
  { id: "fitting", label: "Fitting selected SIR model" },
  { id: "estimating_uncertainty", label: "Estimating bootstrap" },
  { id: "exporting", label: "Exporting diagnostics" },
  { id: "completed", label: "Completed" },
];

export function RunProgress({ run, onEditSettings, onRunAnother }: RunProgressProps) {
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(run.displayName);
  const [localSeconds, setLocalSeconds] = useState(run.elapsedSeconds || 0);

  const cancelMutation = useCancelRun();
  const renameMutation = useRenameRun();

  const isTerminal =
    run.status === "COMPLETED" || run.status === "FAILED" || run.status === "CANCELLED";

  // Tick local seconds while run is active
  useEffect(() => {
    if (isTerminal) {
      return;
    }

    const interval = setInterval(() => {
      setLocalSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isTerminal]);

  const elapsedSec = isTerminal ? (run.elapsedSeconds ?? localSeconds) : localSeconds;

  const formatElapsed = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}:${s.toString().padStart(2, "0")}`;
  };

  const stages = run.mode === "EVALUATE" ? STAGES_EVALUATE : STAGES_FIT;
  const currentStageIndex = stages.findIndex((s) => s.id === run.stage.toLowerCase());

  const hasDeterminateProgress =
    typeof run.progressDone === "number" &&
    typeof run.progressTotal === "number" &&
    run.progressTotal > 0;

  const progressPercent = hasDeterminateProgress
    ? Math.min(100, Math.round(((run.progressDone || 0) / (run.progressTotal || 1)) * 100))
    : null;

  const handleSaveName = async () => {
    if (!nameDraft.trim() || nameDraft === run.displayName) {
      setIsEditingName(false);
      return;
    }
    await renameMutation.mutateAsync({ runId: run.id, displayName: nameDraft.trim() });
    setIsEditingName(false);
  };

  const handleConfirmCancel = async () => {
    await cancelMutation.mutateAsync(run.id);
    setShowCancelDialog(false);
  };

  return (
    <div className="bg-surface rounded-[14px] border border-border shadow-xs p-6 space-y-6">
      {/* Screen reader live status */}
      <div className="sr-only" aria-live="polite">
        Analysis run status is {run.status}, current stage: {run.stage}.
        {progressPercent !== null && ` Progress: ${progressPercent} percent.`}
      </div>

      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">
              Analysis Run
            </span>
            <span className="font-mono text-xs bg-surface-2 text-slate-700 px-2 py-0.5 rounded border border-border">
              {run.id}
            </span>
            <CopyButton value={run.id} label="Copy ID" />
          </div>

          {/* Editable Display Name */}
          {isEditingName ? (
            <div className="flex items-center gap-2 mt-1">
              <input
                type="text"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                maxLength={80}
                className="px-2.5 py-1 text-sm font-semibold rounded-md border border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
                autoFocus
              />
              <button
                type="button"
                onClick={handleSaveName}
                disabled={renameMutation.isPending}
                className="p-1 rounded bg-blue-600 text-white hover:bg-blue-700 text-xs"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group">
              <h2 className="text-base font-semibold text-ink tracking-tight">
                {run.displayName}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setNameDraft(run.displayName);
                  setIsEditingName(true);
                }}
                aria-label="Edit display name"
                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-700 rounded transition-opacity"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Status indicator & elapsed time */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs text-muted font-mono bg-surface-2 px-2.5 py-1 rounded-md border border-border">
            <Clock className="w-3.5 h-3.5 text-muted" />
            <span>{formatElapsed(elapsedSec)}</span>
          </div>

          {run.status !== "COMPLETED" &&
            run.status !== "FAILED" &&
            run.status !== "CANCELLED" && (
              <button
                type="button"
                onClick={() => setShowCancelDialog(true)}
                disabled={run.cancelRequested || cancelMutation.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-danger bg-red-50 hover:bg-red-100 rounded-md border border-red-200 transition-colors disabled:opacity-50"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>{run.cancelRequested ? "Cancelling..." : "Cancel run"}</span>
              </button>
            )}
        </div>
      </div>

      {/* Main Status Panel */}
      {run.status === "COMPLETED" ? (
        <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-4">
          <div className="flex items-center gap-3 text-emerald-800">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
            <div>
              <h3 className="font-semibold text-sm">Analysis completed successfully</h3>
              <p className="text-xs text-emerald-700">
                Fitted parameter estimates, state trajectories, and diagnostics have been persisted.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href={`/results?runId=${run.id}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <span>View results</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            {onRunAnother && (
              <button
                type="button"
                onClick={onRunAnother}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-surface hover:bg-surface-2 text-slate-700 border border-border rounded-lg text-xs font-medium transition-colors"
              >
                <RotateCw className="w-3.5 h-3.5 text-muted" />
                <span>Run another analysis</span>
              </button>
            )}
          </div>
        </div>
      ) : run.status === "FAILED" ? (
        <div className="p-5 rounded-xl bg-red-50 border border-red-200 space-y-4">
          <div className="flex items-start gap-3 text-red-900">
            <AlertCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="font-semibold text-sm">Analysis failed</h3>
              <p className="text-xs text-red-800 leading-relaxed">
                {run.errorMessage || "An unexpected error occurred during optimization."}
              </p>
              {run.errorReference && (
                <div className="flex items-center gap-2 pt-1 font-mono text-xs text-red-700">
                  <span>Reference: {run.errorReference}</span>
                  <CopyButton value={run.errorReference} label="Copy reference" />
                </div>
              )}
            </div>
          </div>

          {onEditSettings && (
            <div className="pt-1">
              <button
                type="button"
                onClick={onEditSettings}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-surface text-slate-800 border border-border rounded-md text-xs font-medium hover:bg-surface-2"
              >
                <span>Edit settings & retry</span>
              </button>
            </div>
          )}
        </div>
      ) : run.status === "CANCELLED" ? (
        <div className="p-5 rounded-xl bg-slate-50 border border-border text-slate-700 space-y-2">
          <div className="flex items-center gap-2.5">
            <Ban className="w-5 h-5 text-muted" />
            <h3 className="font-semibold text-sm">Analysis cancelled</h3>
          </div>
          <p className="text-xs text-muted">
            The run was terminated before completion. Partial computational tasks were discarded.
          </p>
          {onRunAnother && (
            <button
              type="button"
              onClick={onRunAnother}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface text-slate-700 border border-border rounded-md text-xs font-medium hover:bg-surface-2"
            >
              <span>Restart analysis</span>
            </button>
          )}
        </div>
      ) : (
        /* Active Running State */
        <div className="space-y-4">
          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs text-slate-600 font-medium">
              <span>{stages[Math.max(0, currentStageIndex)]?.label || "Processing"}...</span>
              {progressPercent !== null ? (
                <span className="font-mono">{progressPercent}%</span>
              ) : (
                <span className="text-muted">Working</span>
              )}
            </div>

            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
              {progressPercent !== null ? (
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              ) : (
                <div className="h-full bg-blue-600/60 rounded-full w-1/3 animate-pulse" />
              )}
            </div>
            {hasDeterminateProgress && (
              <p className="text-[11px] text-muted text-right font-mono">
                {run.progressDone} / {run.progressTotal} tasks
              </p>
            )}
          </div>

          {/* Stepper */}
          <div className="pt-2">
            <ol className="relative border-l border-slate-200 ml-3 space-y-4">
              {stages.map((stage, idx) => {
                const isPassed = currentStageIndex > idx || run.status === "COMPLETED";
                const isCurrent = currentStageIndex === idx && run.status !== "COMPLETED";

                return (
                  <li key={stage.id} className="ml-6 flex items-center gap-3">
                    <span
                      className={`absolute -left-3 flex items-center justify-center w-6 h-6 rounded-full text-xs transition-colors ${
                        isPassed
                          ? "bg-emerald-500 text-white"
                          : isCurrent
                          ? "bg-blue-600 text-white ring-4 ring-blue-100"
                          : "bg-surface-2 border border-slate-300 text-slate-400"
                      }`}
                    >
                      {isPassed ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : isCurrent ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        idx + 1
                      )}
                    </span>
                    <span
                      className={`text-xs ${
                        isCurrent
                          ? "font-semibold text-ink"
                          : isPassed
                          ? "text-slate-700"
                          : "text-slate-400"
                      }`}
                    >
                      {stage.label}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      )}

      {/* Cancellation Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showCancelDialog}
        title="Cancel Analysis Run?"
        description="Are you sure you want to stop this analysis? Active optimization tasks will terminate cooperatively and no incomplete forecast records will be saved."
        confirmLabel="Yes, cancel run"
        cancelLabel="Keep running"
        isDestructive={true}
        isLoading={cancelMutation.isPending}
        onConfirm={handleConfirmCancel}
        onCancel={() => setShowCancelDialog(false)}
      />
    </div>
  );
}
