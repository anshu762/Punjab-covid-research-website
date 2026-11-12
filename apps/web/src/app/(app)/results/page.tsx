"use client";

import React, { Suspense, useEffect, useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useRuns, useRunResults, type RunItem } from "@/hooks/useRuns";
import { useWorkspaceStore } from "@/store/workspace";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { StaleBanner } from "@/components/common/StaleBanner";
import { RunProgress } from "@/components/model/RunProgress";
import { RunIdentityBar, RunIdProvider } from "@/components/results/RunIdentityBar";
import { RunSwitcher } from "@/components/results/RunSwitcher";
import { AssumptionsPanel } from "@/components/results/AssumptionsPanel";
import { SummaryCards } from "@/components/results/SummaryCards";
import { ParameterTable } from "@/components/results/ParameterTable";
import { ModelComparisonTable } from "@/components/results/ModelComparisonTable";
import { TabObservedFitted } from "@/components/results/tabs/TabObservedFitted";
import { TabForecastValidation } from "@/components/results/tabs/TabForecastValidation";
import { TabSirStates } from "@/components/results/tabs/TabSirStates";
import { TabTransmission } from "@/components/results/tabs/TabTransmission";
import { TabDiagnostics } from "@/components/results/tabs/TabDiagnostics";
import {
  BarChart2,
  Calendar,
  Layers,
  Activity,
  AlertTriangle,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
} from "lucide-react";

type TabKey = "observed" | "forecast" | "states" | "transmission" | "diagnostics";

interface TabItem {
  key: TabKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const TABS: TabItem[] = [
  { key: "observed", label: "Observed & Fitted", icon: Activity },
  { key: "forecast", label: "Forecast Validation", icon: Calendar },
  { key: "states", label: "SIR States", icon: Layers },
  { key: "transmission", label: "Transmission Dynamics", icon: TrendingUp },
  { key: "diagnostics", label: "Residual Diagnostics", icon: BarChart2 },
];

function ResultsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedRunId = searchParams.get("run") || searchParams.get("runId");

  const { data: runs, isLoading: isRunsLoading } = useRuns(false);
  const activeWorkspaceRunId = useWorkspaceStore((s) => s.activeRunId);
  const setActiveRun = useWorkspaceStore((s) => s.setActiveRun);
  const lastSubmittedConfigHash = useWorkspaceStore((s) => s.lastSubmittedConfigHash);

  // Tab state
  const [activeTab, setActiveTab] = useState<TabKey>("observed");

  // Determine current run ID
  const allRuns = useMemo(() => runs || [], [runs]);
  const completedRuns = useMemo(() => allRuns.filter((r) => r.status === "COMPLETED"), [allRuns]);

  const activeRun: RunItem | undefined = useMemo(() => {
    if (requestedRunId) {
      return allRuns.find((r) => r.id === requestedRunId);
    }
    // Default to workspace active run or latest completed run
    if (activeWorkspaceRunId) {
      const found = allRuns.find((r) => r.id === activeWorkspaceRunId);
      if (found) return found;
    }
    return completedRuns[0];
  }, [requestedRunId, allRuns, activeWorkspaceRunId, completedRuns]);

  const activeRunId = activeRun?.id || requestedRunId || null;

  // Mirror choice into workspace store and URL
  useEffect(() => {
    if (activeRun && activeRun.id !== activeWorkspaceRunId) {
      setActiveRun(activeRun.id, activeRun.status);
    }
  }, [activeRun, activeWorkspaceRunId, setActiveRun]);

  // Fetch results only for completed run
  const isCompleted = activeRun?.status === "COMPLETED";
  const {
    data: resultsData,
    isLoading: isResultsLoading,
    error: resultsError,
  } = useRunResults(activeRunId, isCompleted);

  function handleSwitchRun(newRunId: string) {
    router.push(`/results?run=${newRunId}`);
  }

  // 1. Loading runs list state
  if (isRunsLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Analysis Results"
          description="Interactive charts, fitted parameters, 7-day validation scores, and uncertainty intervals."
        />
        <div className="bg-surface rounded-2xl border border-border p-12 flex flex-col items-center justify-center gap-3 animate-pulse">
          <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
          <span className="text-xs text-muted">Loading analysis runs...</span>
        </div>
      </div>
    );
  }

  // 2. Empty state: No runs exist at all
  if (allRuns.length === 0) {
    return (
      <div>
        <PageHeader
          title="Analysis Results"
          description="Interactive charts, fitted parameters, 7-day validation scores, and uncertainty intervals."
        />
        <EmptyState
          icon={BarChart2}
          title="No analysis runs found"
          explanation="Results are populated only after completing a model fit or 7-day forecast evaluation from the Model setup screen. All charts, residual diagnostics, and comparison tables trace strictly to a specific completed run ID."
          primaryAction={{
            label: "Launch Run in Model Setup",
            href: "/model",
          }}
          secondaryAction={{
            label: "Open Data Screen",
            href: "/data",
          }}
        />
      </div>
    );
  }

  // 3. Error state: Forbidden (403) or Not Found (404)
  if (resultsError?.statusCode === 403) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Analysis Results"
          description="Interactive charts, fitted parameters, 7-day validation scores, and uncertainty intervals."
        />
        <div className="bg-surface rounded-2xl border border-border p-8 text-center space-y-3">
          <ShieldAlert className="w-10 h-10 text-rose-600 mx-auto" />
          <h3 className="text-base font-bold text-ink">Access Denied (403)</h3>
          <p className="text-xs text-muted max-w-md mx-auto">
            You do not have permission to view results for run ID <code>{activeRunId}</code>. In accordance
            with security isolation rules, runs belong solely to their owner.
          </p>
          <div className="pt-2">
            <Link
              href="/model"
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
            >
              Back to Model Setup
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 4. Active (in-progress) run state
  if (activeRun && activeRun.status !== "COMPLETED" && activeRun.status !== "FAILED" && activeRun.status !== "CANCELLED") {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Analysis Results"
          description="Interactive charts, fitted parameters, 7-day validation scores, and uncertainty intervals."
          actions={
            <RunSwitcher
              runs={allRuns}
              activeRunId={activeRunId}
              onSelectRun={handleSwitchRun}
            />
          }
        />
        <div className="bg-surface rounded-2xl border border-border p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-600 animate-ping" />
            <h3 className="text-sm font-bold text-ink">
              Analysis in progress: {activeRun.displayName} ({activeRun.id.slice(0, 8)})
            </h3>
          </div>
          <p className="text-xs text-muted">
            Stage: <strong className="font-mono text-ink">{activeRun.stage}</strong> · Status:{" "}
            <span className="font-mono text-blue-700">{activeRun.status}</span>. Results will populate
            automatically upon completion.
          </p>
          <RunProgress run={activeRun} />
          <div className="pt-2">
            <Link
              href="/model"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-surface hover:bg-surface-2 border border-border rounded-lg"
            >
              <span>Inspect in Model Setup</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 5. Failed or Cancelled run state
  if (activeRun && (activeRun.status === "FAILED" || activeRun.status === "CANCELLED")) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Analysis Results"
          description="Interactive charts, fitted parameters, 7-day validation scores, and uncertainty intervals."
          actions={
            <RunSwitcher
              runs={allRuns}
              activeRunId={activeRunId}
              onSelectRun={handleSwitchRun}
            />
          }
        />
        <div className="bg-surface rounded-2xl border border-rose-200 p-6 shadow-2xs space-y-3">
          <div className="flex items-center gap-2 text-rose-700">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <h3 className="text-sm font-bold">
              Analysis {activeRun.status === "FAILED" ? "Failed" : "Cancelled"}: {activeRun.displayName}
            </h3>
          </div>
          <p className="text-xs text-muted leading-relaxed">
            {activeRun.errorMessage || "The run was terminated before completing optimization."}
          </p>
          {activeRun.errorReference && (
            <div className="text-[11px] font-mono text-muted">
              Reference code: <span className="text-ink font-semibold">{activeRun.errorReference}</span>
            </div>
          )}
          <div className="pt-2">
            <Link
              href="/model"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs transition"
            >
              <span>Return to Model Setup</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 6. Loading results payload
  if (isResultsLoading || !resultsData) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Analysis Results"
          description="Interactive charts, fitted parameters, 7-day validation scores, and uncertainty intervals."
          actions={
            <RunSwitcher
              runs={allRuns}
              activeRunId={activeRunId}
              onSelectRun={handleSwitchRun}
            />
          }
        />
        <div className="bg-surface rounded-2xl border border-border p-12 flex flex-col items-center justify-center gap-3 animate-pulse">
          <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
          <span className="text-xs text-muted">Loading visualization results and diagnostics...</span>
        </div>
      </div>
    );
  }

  const { payload, metadata, forecastRows } = resultsData;

  // Stale check: does the displayed run's config hash differ from the draft store's last submitted hash?
  const isStale = Boolean(
    metadata.configHash &&
    lastSubmittedConfigHash &&
    metadata.configHash !== lastSubmittedConfigHash
  );

  return (
    <RunIdProvider runId={payload.run.id}>
      <div className="space-y-6 pb-16">
        <PageHeader
          title="Analysis Results"
          description="Interactive charts, fitted parameters, 7-day validation scores, and uncertainty intervals."
          actions={
            <RunSwitcher
              runs={allRuns}
              activeRunId={payload.run.id}
              onSelectRun={handleSwitchRun}
            />
          }
        />

        {/* Stale Banner strictly per PRD Persistent Interface rules */}
        {isStale && (
          <StaleBanner message="Settings changed — rerun required. Model setup parameters have been modified since this run was generated. Displayed metrics and charts strictly reflect this completed run's parameters." />
        )}

        {/* Run Identity Bar */}
        <RunIdentityBar
          runId={payload.run.id}
          metadata={metadata}
          startDate={payload.series[0]?.date}
          endDate={payload.series[payload.series.length - 1]?.date}
        />

        {/* Assumptions Panel (Collapsible, open by default) */}
        <AssumptionsPanel payload={payload} />

        {/* Summary Cards */}
        <SummaryCards
          payload={payload}
          onSelectDiagnosticsTab={() => setActiveTab("diagnostics")}
        />

        {/* Parameter Table */}
        <ParameterTable payload={payload} />

        {/* Model Comparison Table (Evaluated runs only) */}
        {payload.run.mode === "EVALUATE" && payload.evaluation && (
          <ModelComparisonTable payload={payload} />
        )}

        {/* Five Chart Tabs */}
        <div className="space-y-4 pt-2">
          {/* Accessible Tab Navigation */}
          <div
            role="tablist"
            aria-label="Analysis Visualizations"
            className="flex items-center gap-1.5 border-b border-border overflow-x-auto pb-px scrollbar-none"
          >
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  role="tab"
                  id={`tab-${tab.key}`}
                  aria-selected={isActive}
                  aria-controls={`tabpanel-${tab.key}`}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => setActiveTab(tab.key)}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-t-lg ${
                    isActive
                      ? "border-blue-600 text-blue-600 bg-blue-50/40"
                      : "border-transparent text-muted hover:text-ink hover:bg-surface-2"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Active Tab Panel */}
          <div
            role="tabpanel"
            id={`tabpanel-${activeTab}`}
            aria-labelledby={`tab-${activeTab}`}
            className="focus-visible:outline-none"
          >
            {activeTab === "observed" && <TabObservedFitted payload={payload} />}
            {activeTab === "forecast" && (
              <TabForecastValidation payload={payload} forecastRows={forecastRows} />
            )}
            {activeTab === "states" && <TabSirStates payload={payload} />}
            {activeTab === "transmission" && <TabTransmission payload={payload} />}
            {activeTab === "diagnostics" && <TabDiagnostics payload={payload} />}
          </div>
        </div>
      </div>
    </RunIdProvider>
  );
}

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <PageHeader
            title="Analysis Results"
            description="Interactive charts, fitted parameters, 7-day validation scores, and uncertainty intervals."
          />
          <div className="bg-surface rounded-2xl border border-border p-12 flex flex-col items-center justify-center gap-3 animate-pulse">
            <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
            <span className="text-xs text-muted">Loading visualization results...</span>
          </div>
        </div>
      }
    >
      <ResultsPageContent />
    </Suspense>
  );
}
