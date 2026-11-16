"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Play,
  RotateCcw,
  Clock,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Info,
  Layers,
  Sparkles,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  DEFAULT_DATE_RANGE,
  diffDays,
  formatInt,
  RunConfigSchema,
  computeConfigHash,
  type RunConfig,
} from "@epilens/shared";
import { PageHeader } from "@/components/layout/PageHeader";
import { StaleBanner } from "@/components/common/StaleBanner";
import { InlineError } from "@/components/common/InlineError";
import { FieldHelp } from "@/components/common/FieldHelp";
import { DemoBadge } from "@/components/common/DemoBadge";
import { SettingsSummaryCard } from "@/components/model/SettingsSummaryCard";
import { RecentRunsCard } from "@/components/model/RecentRunsCard";
import { RunProgress } from "@/components/model/RunProgress";
import { useDatasets, useDataset } from "@/hooks/useDatasets";
import { useRuns, useRun, useCreateRun, isTerminalStatus } from "@/hooks/useRuns";
import { useWorkspaceStore } from "@/store/workspace";

const DEFAULT_ADVANCED = {
  betaBounds: [0.01, 2.0] as [number, number],
  initialInfectiousBounds: [1.0, 100000.0] as [number, number],
  dispersionBounds: [0.05, 1000.0] as [number, number],
  nStarts: 20,
  seed: 42,
  rtol: 1e-8,
  atol: 1e-8,
  cpMinSegmentDays: 21,
  cpStepDays: 7,
  cpSearchStarts: 5,
  bootstrapStarts: 1,
  bootstrapReplicates: 200,
};

export default function ModelSetupPage() {
  const { data: datasetsData, isLoading: isDatasetsLoading } = useDatasets();
  const datasets = useMemo(() => datasetsData?.datasets || [], [datasetsData]);

  const workspaceDatasetId = useWorkspaceStore((s) => s.datasetId);
  const setWorkspaceDataset = useWorkspaceStore((s) => s.setDataset);
  const lastSubmittedConfigHash = useWorkspaceStore((s) => s.lastSubmittedConfigHash);
  const setLastSubmittedConfigHash = useWorkspaceStore((s) => s.setLastSubmittedConfigHash);

  // Default to workspace dataset or first ready dataset
  const activeDatasetId = useMemo(() => {
    if (workspaceDatasetId && datasets.some((d) => d.id === workspaceDatasetId)) {
      return workspaceDatasetId;
    }
    const ready = datasets.find((d) => d.status === "READY");
    return ready ? ready.id : datasets[0]?.id || null;
  }, [workspaceDatasetId, datasets]);

  const { data: activeDatasetResponse } = useDataset(activeDatasetId);
  const activeDataset = activeDatasetResponse?.dataset || datasets.find((d) => d.id === activeDatasetId);

  // Form states with overrides
  const [mode, setMode] = useState<"FIT" | "EVALUATE">("FIT");
  const [modelType, setModelType] = useState<"M1" | "M2">("M1");
  const [startDateOverride, setStartDateOverride] = useState<string | null>(null);
  const [endDateOverride, setEndDateOverride] = useState<string | null>(null);
  const [populationOverride, setPopulationOverride] = useState<number | null>(null);
  const [infectiousDurationDays, setInfectiousDurationDays] = useState(7);
  const [reportingFractionPercent, setReportingFractionPercent] = useState(20);
  const [susceptibleFractionPercent, setSusceptibleFractionPercent] = useState(95.0);
  const [uncertainty, setUncertainty] = useState<"OFF" | "BOOTSTRAP">("OFF");

  // Effective values derived from dataset defaults or explicit overrides
  const startDate = startDateOverride ?? (mode === "EVALUATE" ? DEFAULT_DATE_RANGE.start : activeDataset?.qualitySummary?.date_start ?? DEFAULT_DATE_RANGE.start);
  const endDate = endDateOverride ?? (mode === "EVALUATE" ? DEFAULT_DATE_RANGE.end : activeDataset?.qualitySummary?.date_end ?? DEFAULT_DATE_RANGE.end);
  const populationValue = populationOverride ?? activeDataset?.populationValue ?? 30000000;

  // Estimated rolling origin blocks when in EVALUATE mode
  const estimatedBlocks = useMemo(() => {
    if (mode !== "EVALUATE") return 0;
    const totalDays = diffDays(startDate, endDate) + 1;
    if (totalDays < 133) return 0;
    const initialTrain = totalDays >= 153 ? 62 : 42;
    const originCount = Math.floor((totalDays - initialTrain - 7) / 7) + 1;
    return Math.max(0, originCount);
  }, [mode, startDate, endDate]);

  // Advanced accordion state
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [advanced, setAdvanced] = useState(DEFAULT_ADVANCED);

  // Runtime estimate badge
  const [showRuntimeEstimate, setShowRuntimeEstimate] = useState(false);

  // Selected run for right-hand column display
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  // Runs data
  const { data: allRuns } = useRuns(false);
  const createRunMutation = useCreateRun();

  const datasetRuns = useMemo(() => {
    if (!allRuns || !activeDatasetId) return [];
    return allRuns.filter(
      (r) => r.dataset?.id === activeDatasetId || r.config?.datasetId === activeDatasetId
    );
  }, [allRuns, activeDatasetId]);

  // Find active run (in-progress)
  const activeRun = useMemo(() => {
    return datasetRuns.find((r) => !isTerminalStatus(r.status)) || null;
  }, [datasetRuns]);

  // Single run watcher hook if active run or selected run
  const activeOrSelectedId = activeRun ? activeRun.id : selectedRunId;
  const { data: liveRun } = useRun(activeOrSelectedId);
  const displayRun = liveRun || datasetRuns.find((r) => r.id === activeOrSelectedId) || null;

  // Most recent completed run
  const latestCompletedRun = useMemo(() => {
    return datasetRuns.find((r) => r.status === "COMPLETED") || null;
  }, [datasetRuns]);

  // Construct current config object
  const currentConfig: RunConfig | null = useMemo(() => {
    if (!activeDatasetId || !activeDataset) return null;

    const popProvenance = {
      value: Math.round(populationValue),
      sourceUrl:
        activeDataset.populationSourceUrl || "https://censusindia.gov.in/census.website/",
      referenceYear: activeDataset.populationReferenceYear || 2020,
      geography: activeDataset.populationGeography || activeDataset.regionCode || "Punjab",
    };

    return {
      datasetId: activeDatasetId,
      dateRange: { start: startDate, end: endDate },
      population: popProvenance,
      mode,
      modelType: mode === "EVALUATE" ? "M1" : modelType,
      infectiousDurationDays,
      reportingFraction: reportingFractionPercent / 100,
      susceptibleFraction: susceptibleFractionPercent / 100,
      uncertainty,
      advanced,
    };
  }, [
    activeDatasetId,
    activeDataset,
    populationValue,
    startDate,
    endDate,
    mode,
    modelType,
    infectiousDurationDays,
    reportingFractionPercent,
    susceptibleFractionPercent,
    uncertainty,
    advanced,
  ]);

  // Validation
  const validationResult = useMemo(() => {
    if (!currentConfig) return { success: false, errors: {} as Record<string, string> };
    const res = RunConfigSchema.safeParse(currentConfig);
    if (res.success) return { success: true, errors: {} };

    const errors: Record<string, string> = {};
    for (const issue of res.error.issues) {
      const fieldPath = issue.path.join(".");
      errors[fieldPath] = issue.message;
    }
    return { success: false, errors };
  }, [currentConfig]);

  // Current config hash
  const currentConfigHash = useMemo(() => {
    if (!currentConfig || !validationResult.success) return null;
    return computeConfigHash(currentConfig);
  }, [currentConfig, validationResult.success]);

  const isStale = useMemo(() => {
    if (!currentConfigHash || !lastSubmittedConfigHash || !latestCompletedRun) return false;
    return currentConfigHash !== lastSubmittedConfigHash;
  }, [currentConfigHash, lastSubmittedConfigHash, latestCompletedRun]);

  const daysSelected = useMemo(() => {
    if (!startDate || !endDate) return 0;
    try {
      return diffDays(startDate, endDate) + 1;
    } catch {
      return 0;
    }
  }, [startDate, endDate]);

  const runtimeEstimate = useMemo(() => {
    let est = "";
    if (mode === "FIT") {
      est = modelType === "M1" ? "~2–4s (LSODA multi-start)" : "~10–18s (change-point scan + L-BFGS-B)";
    } else {
      const blocks = estimatedBlocks > 0 ? estimatedBlocks : 13;
      est = `~${Math.round(blocks * 2.5)}s (${blocks} rolling origins × 4 models, warm-started)`;
    }
    if (uncertainty === "BOOTSTRAP") {
      est += " + ~40–60s (200 bootstrap replicates)";
    }
    return est;
  }, [mode, modelType, uncertainty, estimatedBlocks]);

  // Handler: Submit Run
  const handleLaunchRun = async () => {
    if (!currentConfig || !validationResult.success) {
      toast.error("Please fix configuration errors before launching");
      return;
    }

    if (activeRun) {
      toast.error("Another run is currently active on this dataset. Please wait or cancel it.");
      return;
    }

    try {
      const idempotencyKey = crypto.randomUUID();
      const res = await createRunMutation.mutateAsync({
        config: currentConfig,
        idempotencyKey,
      });

      if (currentConfigHash) {
        setLastSubmittedConfigHash(currentConfigHash);
      }
      setSelectedRunId(res.runId);

      toast.success(
        res.cached ? "Results Loaded from Cache" : `${mode === "FIT" ? "Fit" : "Evaluation"} Run Queued`,
        {
          description: res.cached
            ? "Exact configuration was previously computed."
            : "Worker has accepted the analysis job.",
        }
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to queue run";
      toast.error("Launch Failed", { description: msg });
    }
  };

  const handleResetDefaults = () => {
    setStartDateOverride(null);
    setEndDateOverride(null);
    setPopulationOverride(null);
    setMode("FIT");
    setModelType("M1");
    setInfectiousDurationDays(7);
    setReportingFractionPercent(20);
    setSusceptibleFractionPercent(95.0);
    setUncertainty("OFF");
    setAdvanced(DEFAULT_ADVANCED);
    toast.info("Settings reset to PRD defaults");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Model setup"
        description="Configure epidemiological assumptions, calibration parameters, and launch SIR fitting or 7-day evaluation."
      />

      {/* Dataset Selector / Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface rounded-[14px] border border-border p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-navy-900/5 text-navy-900 flex items-center justify-center font-semibold shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                Active Dataset
              </span>
              {activeDataset?.isSynthetic && <DemoBadge label="Synthetic" />}
            </div>
            <p className="text-sm font-semibold text-ink">
              {activeDataset ? activeDataset.name : isDatasetsLoading ? "Loading..." : "No dataset selected"}
            </p>
          </div>
        </div>

        {datasets.length > 1 && (
          <div className="flex items-center gap-2">
            <label htmlFor="dataset-picker" className="text-xs text-muted font-medium">
              Change:
            </label>
            <div className="relative inline-flex items-center">
              <select
                id="dataset-picker"
                value={activeDatasetId || ""}
                onChange={(e) => {
                  const id = e.target.value;
                  const d = datasets.find((item) => item.id === id);
                  if (d) {
                    setWorkspaceDataset(d.id, d.name, d.isSynthetic);
                    setStartDateOverride(null);
                    setEndDateOverride(null);
                    setPopulationOverride(null);
                  }
                }}
                className="appearance-none pl-3 pr-8 py-1.5 text-xs font-semibold text-ink bg-surface-2 border border-border rounded-lg shadow-2xs hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 transition cursor-pointer"
              >
                {datasets.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} {d.isSynthetic ? "(Synthetic)" : ""}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-muted pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>
        )}
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form (7 cols on lg) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-surface rounded-[14px] border border-border p-5 sm:p-6 shadow-xs space-y-6">
            {/* Section 1: Execution Mode */}
            <div>
              <FieldHelp
                label="Analysis Mode"
                tooltip="Fit mode calibrates the chosen model over the entire range. Evaluate mode runs the 13-block rolling forecast protocol."
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1.5">
                <button
                  type="button"
                  onClick={() => setMode("FIT")}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    mode === "FIT"
                      ? "border-blue-600 bg-blue-50/50 shadow-xs ring-1 ring-blue-600/30"
                      : "border-border hover:bg-surface-2 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-ink">Fit Selected Period</span>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                        mode === "FIT" ? "border-blue-600 bg-blue-600" : "border-slate-300 bg-white"
                      }`}
                    >
                      {mode === "FIT" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </div>
                  <p className="text-[11px] text-muted mt-1 leading-relaxed">
                    Calibrate parameters (β, I₀, k) across the selected date window.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode("EVALUATE");
                    setStartDateOverride(DEFAULT_DATE_RANGE.start);
                    setEndDateOverride(DEFAULT_DATE_RANGE.end);
                  }}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    mode === "EVALUATE"
                      ? "border-blue-600 bg-blue-50/50 shadow-xs ring-1 ring-blue-600/30"
                      : "border-border hover:bg-surface-2 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-ink">Evaluate 7-Day Forecasts</span>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                        mode === "EVALUATE" ? "border-blue-600 bg-blue-600" : "border-slate-300 bg-white"
                      }`}
                    >
                      {mode === "EVALUATE" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </div>
                  <p className="text-[11px] text-muted mt-1 leading-relaxed">
                    13-block chronological evaluation comparing M1, M2 & baselines.
                  </p>
                </button>
              </div>
            </div>

            {/* Section 2: Model Architecture */}
            <div>
              <FieldHelp
                label="SIR Model Architecture"
                tooltip="M1 assumes a single constant transmission rate. M2 searches for a discrete change-point in transmission rate."
              />
              {mode === "EVALUATE" ? (
                <div className="space-y-2 mt-1.5">
                  <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200 text-xs text-blue-900 flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-semibold text-ink">
                        Comprehensive Multi-Model Benchmarking
                      </p>
                      <p className="text-[11px] text-muted leading-relaxed">
                        In Evaluation mode, both <strong>M1 (Constant SIR)</strong> and <strong>M2 (Change-Point SIR)</strong> are evaluated alongside both empirical baselines across all 13 rolling origins. The best model is selected automatically by frozen PRD rules.
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                    <div className="p-2.5 rounded-lg border border-border bg-surface-2 font-mono font-medium text-ink flex flex-col items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-blue-600" />
                      <span>M1: Constant</span>
                    </div>
                    <div className="p-2.5 rounded-lg border border-border bg-surface-2 font-mono font-medium text-ink flex flex-col items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-cyan-600" />
                      <span>M2: Change-Point</span>
                    </div>
                    <div className="p-2.5 rounded-lg border border-border bg-surface-2 font-mono font-medium text-ink flex flex-col items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-slate-500" />
                      <span>B1: 7-Day Mean</span>
                    </div>
                    <div className="p-2.5 rounded-lg border border-border bg-surface-2 font-mono font-medium text-ink flex flex-col items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-slate-400" />
                      <span>B2: Weekday</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1.5">
                  <button
                    type="button"
                    onClick={() => setModelType("M1")}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      modelType === "M1"
                        ? "border-blue-600 bg-blue-50/50 shadow-xs ring-1 ring-blue-600/30"
                        : "border-border hover:bg-surface-2 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-ink">Constant SIR (M1)</span>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                          modelType === "M1" ? "border-blue-600 bg-blue-600" : "border-slate-300 bg-white"
                        }`}
                      >
                        {modelType === "M1" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                    <p className="text-[11px] text-muted mt-1 leading-relaxed">
                      Fixed contact rate β throughout the entire window.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModelType("M2")}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      modelType === "M2"
                        ? "border-blue-600 bg-blue-50/50 shadow-xs ring-1 ring-blue-600/30"
                        : "border-border hover:bg-surface-2 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-ink">Change-Point SIR (M2)</span>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                          modelType === "M2" ? "border-blue-600 bg-blue-600" : "border-slate-300 bg-white"
                        }`}
                      >
                        {modelType === "M2" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                    <p className="text-[11px] text-muted mt-1 leading-relaxed">
                      Searches for optimal transmission shift (β₁ → β₂).
                    </p>
                  </button>
                </div>
              )}
            </div>

            {/* Section 3: Date Range */}
            <div>
              <div className="flex items-center justify-between">
                <FieldHelp
                  label="Date Range"
                  tooltip="Select starting and ending dates for calibration or evaluation."
                />
                {mode === "EVALUATE" && (
                  <button
                    type="button"
                    onClick={() => {
                      setStartDateOverride(DEFAULT_DATE_RANGE.start);
                      setEndDateOverride(DEFAULT_DATE_RANGE.end);
                      toast.info("Date range set to PRD standard 13-origin evaluation period");
                    }}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    Use Standard Protocol (Jul 01 – Nov 30, 2020)
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1.5">
                <div>
                  <label htmlFor="start-date" className="block text-[11px] text-muted mb-1 font-medium">
                    Start Date
                  </label>
                  <input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDateOverride(e.target.value)}
                    className="w-full text-xs font-mono bg-surface border border-border rounded-lg px-3 py-2 text-ink focus-visible:ring-2 focus-visible:ring-blue-600 outline-none hover:border-slate-300 transition-colors"
                  />
                </div>
                <div>
                  <label htmlFor="end-date" className="block text-[11px] text-muted mb-1 font-medium">
                    End Date
                  </label>
                  <input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDateOverride(e.target.value)}
                    className="w-full text-xs font-mono bg-surface border border-border rounded-lg px-3 py-2 text-ink focus-visible:ring-2 focus-visible:ring-blue-600 outline-none hover:border-slate-300 transition-colors"
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between mt-1.5 text-[11px] text-muted gap-2">
                <span>Selected duration: <strong>{daysSelected} days</strong></span>
                {mode === "EVALUATE" && (
                  <span className={`font-semibold px-2 py-0.5 rounded border text-[10px] ${
                    estimatedBlocks >= 13
                      ? "text-blue-700 bg-blue-50 border-blue-200"
                      : "text-danger bg-red-50 border-red-200"
                  }`}>
                    {estimatedBlocks} rolling origins {estimatedBlocks >= 13 ? "(Ready)" : "(Requires ≥133 days)"}
                  </span>
                )}
                {mode === "FIT" && modelType === "M2" && daysSelected < 42 && (
                  <span className="text-danger font-medium">M2 requires ≥ 42 days</span>
                )}
              </div>
              {mode === "EVALUATE" && estimatedBlocks > 15 && (
                <div className="mt-2.5 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Extended date range:</span> You have selected {daysSelected} days generating <strong>{estimatedBlocks} weekly forecast blocks</strong>. This will run ~{Math.round(estimatedBlocks * 2.5)}s. For standard evaluation, use the 13-origin protocol (2020-07-01 to 2020-11-30).
                  </div>
                </div>
              )}
              {validationResult.errors["dateRange"] && (
                <InlineError message={validationResult.errors["dateRange"]} />
              )}
            </div>

            {/* Section 4: Population Provenance */}
            <div>
              <FieldHelp
                label="Population (N)"
                tooltip="Jurisdictional total population for scale invariance in the ODE."
              />
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1.5">
                <input
                  type="number"
                  value={populationValue}
                  onChange={(e) => setPopulationOverride(Number(e.target.value))}
                  min={1}
                  step={100000}
                  className="w-full sm:w-48 text-xs font-mono bg-surface border border-border rounded-lg px-3 py-2 text-ink focus-visible:ring-2 focus-visible:ring-blue-600 outline-none"
                />
                <div className="text-[11px] text-muted flex items-center gap-1.5 truncate">
                  <span>Ref: {activeDataset?.populationGeography || "Punjab"} ({activeDataset?.populationReferenceYear || 2020})</span>
                  {activeDataset?.populationSourceUrl && (
                    <a
                      href={activeDataset.populationSourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:underline inline-flex items-center gap-0.5"
                    >
                      <span>Source</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
              {validationResult.errors["population.value"] && (
                <InlineError message={validationResult.errors["population.value"]} />
              )}
            </div>

            {/* Section 5: Epidemiological Calibrations */}
            <div className="space-y-4 pt-2 border-t border-border">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
                Epidemiological Assumptions
              </h3>

              {/* Infectious duration D */}
              <div>
                <div className="flex items-center justify-between text-xs">
                  <FieldHelp
                    label="Infectious Duration (D)"
                    tooltip="Mean duration of infectiousness in days. Recovery rate γ = 1 / D."
                  />
                  <span className="font-mono font-medium text-ink">
                    D = {infectiousDurationDays} days (γ = {(1 / infectiousDurationDays).toFixed(3)}/d)
                  </span>
                </div>
                <input
                  type="range"
                  min={3}
                  max={21}
                  step={1}
                  value={infectiousDurationDays}
                  onChange={(e) => setInfectiousDurationDays(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer mt-1"
                />
                <div className="flex justify-between text-[10px] text-muted font-mono">
                  <span>3 days</span>
                  <span>7 days (PRD default)</span>
                  <span>21 days</span>
                </div>
              </div>

              {/* Reporting fraction rho */}
              <div>
                <div className="flex items-center justify-between text-xs">
                  <FieldHelp
                    label="Reporting Fraction (ρ)"
                    tooltip="Ascertainment probability: fraction of genuine infections reported as confirmed cases."
                  />
                  <span className="font-mono font-medium text-ink">
                    ρ = {reportingFractionPercent}%
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={100}
                  step={1}
                  value={reportingFractionPercent}
                  onChange={(e) => setReportingFractionPercent(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer mt-1"
                />
                <div className="flex justify-between text-[10px] text-muted font-mono">
                  <span>1%</span>
                  <span>20% (PRD default)</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Susceptible fraction f_s */}
              <div>
                <div className="flex items-center justify-between text-xs">
                  <FieldHelp
                    label="Initial Susceptible Fraction (f_s)"
                    tooltip="Proportion of the population initially susceptible at range start. S₀ = f_s · N."
                  />
                  <span className="font-mono font-medium text-ink">
                    f_s = {susceptibleFractionPercent.toFixed(1)}% ({formatInt(Math.round((susceptibleFractionPercent / 100) * populationValue))})
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={99.9}
                  step={0.1}
                  value={susceptibleFractionPercent}
                  onChange={(e) => setSusceptibleFractionPercent(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer mt-1"
                />
                <div className="flex justify-between text-[10px] text-muted font-mono">
                  <span>1.0%</span>
                  <span>95.0% (PRD default)</span>
                  <span>99.9%</span>
                </div>
              </div>
            </div>

            {/* Section 6: Uncertainty Estimation */}
            <div className="pt-2 border-t border-border">
              <FieldHelp
                label="Uncertainty Quantification"
                tooltip="Parametric bootstrap generates 200 synthetic resamples to compute 95% confidence intervals on fitted trajectories and forecasts."
              />
              <div className="flex items-center gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setUncertainty(uncertainty === "OFF" ? "BOOTSTRAP" : "OFF")}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                    uncertainty === "BOOTSTRAP" ? "bg-blue-600" : "bg-slate-200"
                  }`}
                  role="switch"
                  aria-checked={uncertainty === "BOOTSTRAP"}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                      uncertainty === "BOOTSTRAP" ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
                <div className="text-xs">
                  <span className="font-semibold text-ink">
                    {uncertainty === "BOOTSTRAP"
                      ? "Parametric Bootstrap (200 Replicates)"
                      : "Point Estimates Only"}
                  </span>
                  <p className="text-[11px] text-muted">
                    {uncertainty === "BOOTSTRAP"
                      ? "Adds ~60–90s. Recomputes parameters on synthetic resamples to generate 95% confidence intervals."
                      : "Fast point-estimate fit without confidence interval bands."}
                  </p>
                </div>
              </div>
            </div>

            {/* Section 7: Advanced Accordion */}
            <div className="pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setAdvancedOpen(!advancedOpen)}
                className="w-full flex items-center justify-between text-xs font-semibold text-muted hover:text-ink transition-colors py-1"
              >
                <span>Optimization & Numerical Constraints</span>
                {advancedOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {advancedOpen && (
                <div className="mt-3 space-y-3.5 bg-surface-2 rounded-lg p-4 border border-border text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-muted block mb-1">
                        Transmission β Bounds [min, max]
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          step={0.01}
                          value={advanced.betaBounds[0]}
                          onChange={(e) =>
                            setAdvanced({
                              ...advanced,
                              betaBounds: [Number(e.target.value), advanced.betaBounds[1]],
                            })
                          }
                          className="w-full text-xs font-mono bg-surface border border-border rounded px-2 py-1"
                        />
                        <input
                          type="number"
                          step={0.1}
                          value={advanced.betaBounds[1]}
                          onChange={(e) =>
                            setAdvanced({
                              ...advanced,
                              betaBounds: [advanced.betaBounds[0], Number(e.target.value)],
                            })
                          }
                          className="w-full text-xs font-mono bg-surface border border-border rounded px-2 py-1"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] text-muted block mb-1">
                        Initial Infected I₀ Bounds [min, max]
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={advanced.initialInfectiousBounds[0]}
                          onChange={(e) =>
                            setAdvanced({
                              ...advanced,
                              initialInfectiousBounds: [
                                Number(e.target.value),
                                advanced.initialInfectiousBounds[1],
                              ],
                            })
                          }
                          className="w-full text-xs font-mono bg-surface border border-border rounded px-2 py-1"
                        />
                        <input
                          type="number"
                          value={advanced.initialInfectiousBounds[1]}
                          onChange={(e) =>
                            setAdvanced({
                              ...advanced,
                              initialInfectiousBounds: [
                                advanced.initialInfectiousBounds[0],
                                Number(e.target.value),
                              ],
                            })
                          }
                          className="w-full text-xs font-mono bg-surface border border-border rounded px-2 py-1"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-muted block mb-1">
                        Multi-Start Count (nStarts)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min={5}
                          max={50}
                          step={1}
                          value={advanced.nStarts}
                          onChange={(e) =>
                            setAdvanced({ ...advanced, nStarts: Number(e.target.value) })
                          }
                          className="w-full accent-blue-600 cursor-pointer"
                        />
                        <span className="font-mono text-xs w-6 text-right">
                          {advanced.nStarts}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] text-muted block mb-1">Random Seed</label>
                      <input
                        type="number"
                        value={advanced.seed}
                        onChange={(e) =>
                          setAdvanced({ ...advanced, seed: Number(e.target.value) })
                        }
                        className="w-full text-xs font-mono bg-surface border border-border rounded px-2 py-1"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setAdvanced(DEFAULT_ADVANCED)}
                      className="text-[11px] text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Reset Numerical Options to Defaults
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Stale Banner */}
            {isStale && (
              <StaleBanner
                message="Settings changed since last completed run — rerun required to update results"
                className="mt-2"
              />
            )}

            {/* Action Buttons */}
            <div className="pt-3 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleLaunchRun}
                  disabled={
                    !validationResult.success ||
                    createRunMutation.isPending ||
                    Boolean(activeRun) ||
                    activeDataset?.status !== "READY"
                  }
                  className="px-5 py-2.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs transition-colors"
                >
                  {createRunMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-current" />
                  )}
                  <span>
                    {createRunMutation.isPending
                      ? "Queueing Run…"
                      : mode === "FIT"
                      ? "Launch Model Calibration"
                      : "Launch Forecast Evaluation"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowRuntimeEstimate(!showRuntimeEstimate)}
                  className="text-xs text-muted hover:text-ink px-2.5 py-1.5 rounded-lg border border-border hover:bg-surface-2 transition-colors flex items-center gap-1.5"
                  title="Estimate execution runtime"
                >
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Estimate Runtime</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleResetDefaults}
                className="text-xs text-muted hover:text-ink flex items-center gap-1 self-start sm:self-auto py-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Defaults</span>
              </button>
            </div>

            {/* Runtime Estimate Notification */}
            {showRuntimeEstimate && (
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>
                    Estimated duration: <strong>{runtimeEstimate}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRuntimeEstimate(false)}
                  className="text-blue-600 hover:text-blue-800 text-[11px]"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Status & Live Progress (5 cols on lg) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Active or Display Run Progress Card */}
          {displayRun ? (
            <div className="space-y-4">
              <RunProgress
                run={displayRun}
                onRunAnother={() => {
                  setSelectedRunId(null);
                }}
              />

              {displayRun.status === "COMPLETED" && (
                <div className="p-3 bg-surface rounded-[14px] border border-border shadow-xs flex items-center justify-between text-xs">
                  <span className="text-muted">Analysis results ready:</span>
                  <Link
                    href={`/results?runId=${displayRun.id}`}
                    className="font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
                  >
                    <span>View Output Visualizations</span>
                    <span>→</span>
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-surface rounded-[14px] border border-dashed border-border p-6 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 mx-auto flex items-center justify-center">
                <Play className="w-4 h-4 fill-current ml-0.5" />
              </div>
              <h3 className="text-sm font-semibold text-ink">Ready to Execute</h3>
              <p className="text-xs text-muted max-w-xs mx-auto leading-normal">
                Click <strong>Fit Selected Period</strong> or <strong>Evaluate 7-Day Forecasts</strong> to launch the scientific engine worker.
              </p>
            </div>
          )}

          {/* Active Configuration Summary */}
          <SettingsSummaryCard
            datasetName={activeDataset ? activeDataset.name : null}
            dateRange={{ start: startDate, end: endDate }}
            population={populationValue}
            modelType={modelType}
            infectiousDurationDays={infectiousDurationDays}
            reportingFraction={reportingFractionPercent / 100}
            susceptibleFraction={susceptibleFractionPercent / 100}
            uncertainty={uncertainty}
            seed={advanced.seed}
            mode={mode}
          />

          {/* Recent Runs List */}
          <RecentRunsCard
            selectedRunId={displayRun?.id}
            onSelectRun={(run) => setSelectedRunId(run.id)}
          />
        </div>
      </div>
    </div>
  );
}
