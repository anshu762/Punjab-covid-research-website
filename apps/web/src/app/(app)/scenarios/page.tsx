"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TrendingUp, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { StaleBanner } from "@/components/common/StaleBanner";
import { ErrorState } from "@/components/common/ErrorState";

import { useRuns, useRunResults } from "@/hooks/useRuns";
import {
  useScenarios,
  useScenario,
  useCreateScenario,
  useDeleteScenario,
} from "@/hooks/useScenarios";
import { useWorkspaceStore } from "@/store/workspace";
import { addDays } from "@epilens/shared";

import { ScenarioControls } from "@/components/scenarios/ScenarioControls";
import { ScenarioCharts } from "@/components/scenarios/ScenarioCharts";
import { ScenarioSummary } from "@/components/scenarios/ScenarioSummary";
import { ScenarioHistory } from "@/components/scenarios/ScenarioHistory";

export default function ScenariosPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlRunId = searchParams.get("run");
  const urlScenarioId = searchParams.get("scenario");

  const { setActiveRun } = useWorkspaceStore();
  const { data: runs = [], isLoading: isLoadingRuns } = useRuns();

  const completedRunsWithFit = useMemo(
    () => runs.filter((r) => r.status === "COMPLETED" && r.hasFit),
    [runs]
  );

  // Determine active parent run ID
  const activeRunId = useMemo(() => {
    if (urlRunId && completedRunsWithFit.some((r) => r.id === urlRunId)) {
      return urlRunId;
    }
    return completedRunsWithFit[0]?.id || null;
  }, [urlRunId, completedRunsWithFit]);

  // Sync to workspace store
  useEffect(() => {
    if (activeRunId) {
      const run = runs.find((r) => r.id === activeRunId);
      setActiveRun(activeRunId, run?.status || null);
    }
  }, [activeRunId, runs, setActiveRun]);

  // Fetch parent fit payload
  const { data: runResults } = useRunResults(
    activeRunId,
    Boolean(activeRunId)
  );

  // Fetch scenarios list for this parent run
  const { data: scenarioList = [] } = useScenarios(activeRunId);

  // Active scenario ID
  const activeScenarioId = useMemo(() => {
    if (urlScenarioId && scenarioList.some((s) => s.id === urlScenarioId)) {
      return urlScenarioId;
    }
    return scenarioList[0]?.id || null;
  }, [urlScenarioId, scenarioList]);

  // Fetch active scenario details
  const { data: activeScenario } = useScenario(activeScenarioId);

  // Form controls state
  const [percentChange, setPercentChange] = useState<number>(-20);
  const [horizonDays, setHorizonDays] = useState<number>(28);
  const [loadedScenarioId, setLoadedScenarioId] = useState<string | null>(null);

  // Synchronize controls with loaded scenario configuration when scenario changes
  if (activeScenario && activeScenario.id !== loadedScenarioId) {
    setLoadedScenarioId(activeScenario.id);
    if (activeScenario.config) {
      setPercentChange(activeScenario.config.percentChange);
      setHorizonDays(activeScenario.config.horizonDays);
    }
  }

  // Compute startDate
  const parentStartDate = useMemo(() => {
    const finalDate = runResults?.payload?.finalState?.date;
    if (!finalDate) return "—";
    return addDays(finalDate, 1);
  }, [runResults?.payload?.finalState?.date]);

  // Check if controls have drifted from displayed scenario
  const isStale = useMemo(() => {
    if (!activeScenario || activeScenario.status !== "COMPLETED") return false;
    return (
      activeScenario.config.percentChange !== percentChange ||
      activeScenario.config.horizonDays !== horizonDays
    );
  }, [activeScenario, percentChange, horizonDays]);

  // Mutations
  const createScenarioMutation = useCreateScenario();
  const deleteScenarioMutation = useDeleteScenario();

  const isSimulating =
    createScenarioMutation.isPending ||
    (activeScenario &&
      (activeScenario.status === "QUEUED" || activeScenario.status === "RUNNING"));

  function handleSelectRun(newRunId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("run", newRunId);
    params.delete("scenario");
    router.push(`/scenarios?${params.toString()}`);
  }

  function handleSelectScenario(scenId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("scenario", scenId);
    router.push(`/scenarios?${params.toString()}`);
  }

  async function handleRunScenario() {
    if (!activeRunId) {
      toast.error("Please select a completed fit first");
      return;
    }

    try {
      const res = await createScenarioMutation.mutateAsync({
        parentRunId: activeRunId,
        percentChange,
        horizonDays,
      });

      toast.success("Scenario simulation queued");
      const params = new URLSearchParams(searchParams.toString());
      params.set("scenario", res.scenarioId);
      router.push(`/scenarios?${params.toString()}`);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to launch scenario"
      );
    }
  }

  async function handleDeleteScenario(idToDelete: string) {
    try {
      await deleteScenarioMutation.mutateAsync(idToDelete);
      toast.success("Scenario deleted");
      if (activeScenarioId === idToDelete) {
        const remaining = scenarioList.filter((s) => s.id !== idToDelete);
        const params = new URLSearchParams(searchParams.toString());
        if (remaining[0]) {
          params.set("scenario", remaining[0].id);
        } else {
          params.delete("scenario");
        }
        router.push(`/scenarios?${params.toString()}`);
      }
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete scenario"
      );
    }
  }

  // Initial loading state
  if (isLoadingRuns) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Scenario explorer"
          description="Compare baseline transmission with hypothetical transmission rate changes over a forward horizon."
        />
        <div className="flex flex-col items-center justify-center p-16 bg-surface border border-border rounded-xl">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
          <p className="text-sm text-muted">Loading empirical fits…</p>
        </div>
      </div>
    );
  }

  // No runs with fit available
  if (completedRunsWithFit.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Scenario explorer"
          description="Compare baseline transmission with hypothetical transmission rate changes over a forward horizon."
        />
        <EmptyState
          icon={TrendingUp}
          title="Scenario simulation requires a completed fit"
          explanation="Simulating hypothetical forward projections requires calibrated state values (S, I, R) and the final fitted transmission rate (β) from an empirical model run. Once a fit is completed, you can test deltas from −50% to +50%."
          primaryAction={{
            label: "Run an Empirical Fit First",
            href: "/model",
          }}
          secondaryAction={{
            label: "View Methodology",
            href: "/methods",
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Scenario explorer"
        description="Forward simulation of hypothetical transmission variations (−50% to +50%) initialized strictly from calibrated empirical fit states."
      />

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Controls Column (4 cols on lg, 5 on md) */}
        <div className="md:col-span-5 lg:col-span-4 flex flex-col gap-6">
          <ScenarioControls
            runs={runs}
            selectedRunId={activeRunId}
            onSelectRun={handleSelectRun}
            parentPayload={runResults?.payload || null}
            percentChange={percentChange}
            onPercentChange={setPercentChange}
            horizonDays={horizonDays}
            onHorizonDays={setHorizonDays}
            startDate={parentStartDate}
            onRunScenario={handleRunScenario}
            isRunning={Boolean(isSimulating)}
          />

          <ScenarioHistory
            scenarios={scenarioList}
            activeScenarioId={activeScenarioId}
            onSelectScenario={handleSelectScenario}
            onDeleteScenario={handleDeleteScenario}
            isDeleting={deleteScenarioMutation.isPending}
          />
        </div>

        {/* Right Main Display Panel (8 cols on lg, 7 on md) */}
        <div className="md:col-span-7 lg:col-span-8 flex flex-col gap-6">
          {/* Active Simulation Loading State */}
          {activeScenario &&
            (activeScenario.status === "QUEUED" ||
              activeScenario.status === "RUNNING") && (
              <div className="flex flex-col items-center justify-center p-12 bg-surface border border-border rounded-[14px] shadow-xs text-center space-y-4">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <div>
                  <h3 className="text-sm font-semibold text-ink">
                    Simulating hypothetical projection…
                  </h3>
                  <p className="text-xs text-muted mt-1 max-w-sm">
                    Integrating ODE forward over {activeScenario.horizonDays} days
                    with {activeScenario.percentChange > 0 ? "+" : ""}
                    {activeScenario.percentChange}% transmission change.
                  </p>
                </div>
              </div>
            )}

          {/* Failed Scenario State */}
          {activeScenario && activeScenario.status === "FAILED" && (
            <ErrorState
              message={
                activeScenario.errorMessage ||
                "An unexpected error occurred during forward simulation."
              }
              errorReference={activeScenario.errorReference || undefined}
              onRetry={handleRunScenario}
            />
          )}

          {/* Stale Banner when inputs changed */}
          {isStale && (
            <StaleBanner message="Settings changed — click 'Run scenario' to recalculate projection with current inputs." />
          )}

          {/* Completed Scenario Results */}
          {activeScenario &&
            activeScenario.status === "COMPLETED" &&
            activeScenario.summary &&
            activeScenario.dailyOutputs && (
              <>
                <ScenarioSummary summary={activeScenario.summary} />

                <ScenarioCharts
                  dailyOutputs={activeScenario.dailyOutputs}
                  summary={activeScenario.summary}
                  runDisplayName={
                    runs.find((r) => r.id === activeRunId)?.displayName
                  }
                  runId={activeRunId || "unknown"}
                />
              </>
            )}

          {/* No Scenario Run Yet */}
          {(!activeScenarioId || scenarioList.length === 0) &&
            !createScenarioMutation.isPending && (
              <div className="flex flex-col items-center justify-center p-12 bg-surface border border-border rounded-[14px] shadow-xs text-center space-y-3">
                <Sparkles className="w-8 h-8 text-blue-600" />
                <h3 className="text-sm font-semibold text-ink">
                  Ready to simulate forward scenario
                </h3>
                <p className="text-xs text-muted max-w-md">
                  Choose a transmission change percentage (−50% to +50%) and forward
                  horizon (7 to 60 days) in the left panel, then click &quot;Run scenario&quot;.
                </p>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
