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
  CheckCircle2,
  Layers,
  Sparkles,
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
  const startDate = startDateOverride ?? activeDataset?.qualitySummary?.date_start ?? DEFAULT_DATE_RANGE.start;
  const endDate = endDateOverride ?? activeDataset?.qualitySummary?.date_end ?? DEFAULT_DATE_RANGE.end;
  const populationValue = populationOverride ?? activeDataset?.populationValue ?? 30000000;

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
      est = modelType === "M1" ? "~3–5s (LSODA multi-start)" : "~15–25s (change-point scan + L-BFGS-B)";
    } else {
      est = "~45–90s (13 rolling origins × 4 models)";
    }
    if (uncertainty === "BOOTSTRAP") {
      est += " + ~60–90s (200 bootstrap replicates)";
    }
    return est;
  }, [mode, modelType, uncertainty]);

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
              {activeDataset?.isSynthetic && (
                <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 font-semibold px-1.5 py-0.2 rounded">
                  Synthetic
                </span>
              )}
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
              className="text-xs bg-surface-2 border border-border rounded-lg px-2.5 py-1.5 font-medium text-ink focus-visible:ring-2 focus-visible:ring-blue-600 outline-none"
            >
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} {d.isSynthetic ? "(Synthetic)" : ""}
                </option>
              ))}
            </select>
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
              <div className="grid grid-cols-2 gap-3 mt-1.5">
                <button
                  type="button"
                  onClick={() => setMode("FIT")}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    mode === "FIT"
                      ? "border-blue-600 bg-blue-50/50 shadow-xs"
                      : "border-border hover:bg-surface-2"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-ink">Fit Selected Period</span>
                    {mode === "FIT" && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                  </div>
                  <p className="text-[11px] text-muted mt-1">
                    Calibrate parameters (β, I₀, k) across the selected date window.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setMode("EVALUATE")}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    mode === "EVALUATE"
                      ? "border-blue-600 bg-blue-50/50 shadow-xs"
                      : "border-border hover:bg-surface-2"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-ink">Evaluate 7-Day Forecasts</span>
                    {mode === "EVALUATE" && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                  </div>
                  <p className="text-[11px] text-muted mt-1">
                    13-block chronological evaluation comparing M1, M2 & baselines.
                  </p>
                </button>
              </div>
            </div>

            {/* Section 2: Model Architecture (Disabled in EVALUATE) */}
            <div className={mode === "EVALUATE" ? "opacity-60" : ""}>
              <FieldHelp
                label="SIR Model Architecture"
                tooltip="M1 assumes a single constant transmission rate. M2 searches for a discrete change-point in transmission rate."
              />
              {mode === "EVALUATE" ? (
                <div className="p-2.5 rounded-lg bg-surface-2 border border-border text-xs text-muted flex items-center gap-2 mt-1">
                  <Info className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>
                    Evaluation protocol always benchmarks both <strong>M1</strong> and <strong>M2</strong> against both baselines (B1, B2).
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 mt-1.5">
                  <button
                    type="button"
                    onClick={() => setModelType("M1")}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      modelType === "M1"
                        ? "border-blue-600 bg-blue-50/50 shadow-xs"
                        : "border-border hover:bg-surface-2"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-ink">Constant SIR (M1)</span>
                      {modelType === "M1" && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                    </div>
                    <p className="text-[11px] text-muted mt-1">
                      Fixed contact rate β throughout the entire window.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModelType("M2")}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      modelType === "M2"
                        ? "border-blue-600 bg-blue-50/50 shadow-xs"
                        : "border-border hover:bg-surface-2"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-ink">Change-Point SIR (M2)</span>
                      {modelType === "M2" && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                    </div>
                    <p className="text-[11px] text-muted mt-1">
                      Searches for optimal transmission shift (β₁ → β₂).
                    </p>
                  </button>
                </div>
              )}
            </div>

            {/* Section 3: Date Range */}
            <div>
              <FieldHelp
                label="Date Range"
                tooltip="Select starting and ending dates for calibration or evaluation."
              />
              <div className="grid grid-cols-2 gap-3 mt-1.5">
                <div>
                  <label htmlFor="start-date" className="block text-[11px] text-muted mb-1">
                    Start Date
                  </label>
                  <input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDateOverride(e.target.value)}
                    className="w-full text-xs font-mono bg-surface border border-border rounded-lg px-3 py-2 text-ink focus-visible:ring-2 focus-visible:ring-blue-600 outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="end-date" className="block text-[11px] text-muted mb-1">
                    End Date
                  </label>
                  <input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDateOverride(e.target.value)}
                    className="w-full text-xs font-mono bg-surface border border-border rounded-lg px-3 py-2 text-ink focus-visible:ring-2 focus-visible:ring-blue-600 outline-none"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between mt-1 text-[11px] text-muted">
                <span>Selected duration: {daysSelected} days</span>
                {mode === "EVALUATE" && daysSelected < 133 && (
                  <span className="text-danger font-medium">Requires ≥ 133 days for 13 blocks</span>
                )}
                {mode === "FIT" && modelType === "M2" && daysSelected < 42 && (
                  <span className="text-danger font-medium">M2 requires ≥ 42 days</span>
                )}
              </div>
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
              <div className="flex items-center gap-3 mt-1.5">
                <input
                  type="number"
                  value={populationValue}
                  onChange={(e) => setPopulationOverride(Number(e.target.value))}
                  min={1}
                  step={100000}
                  className="w-48 text-xs font-mono bg-surface border border-border rounded-lg px-3 py-2 text-ink focus-visible:ring-2 focus-visible:ring-blue-600 outline-none"
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
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleLaunchRun}
                  disabled={
                    !validationResult.success ||
                    createRunMutation.isPending ||
                    Boolean(activeRun) ||
                    activeDataset?.status !== "READY"
                  }
                  className="btn btn-primary px-5 py-2.5 text-xs font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>
                    {createRunMutation.isPending
                      ? "Queueing..."
                      : mode === "FIT"
                      ? "Fit Selected Period"
                      : "Evaluate 7-Day Forecasts"}
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
