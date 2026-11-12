"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  ScenarioDailyOutput,
  ScenarioSummary,
  ScenarioConfig,
  ScenarioStatus,
} from "@epilens/shared";

export interface ScenarioItem {
  id: string;
  parentRunId: string;
  percentChange: number;
  horizonDays: number;
  status: ScenarioStatus;
  config: ScenarioConfig;
  dailyOutputs?: ScenarioDailyOutput[] | null;
  summary?: ScenarioSummary | null;
  errorReference?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  completedAt?: string | null;
  parentRun?: {
    id: string;
    displayName: string;
    modelType: string;
    dataset?: {
      id: string;
      name: string;
      isSynthetic: boolean;
    };
  };
}

export function isScenarioTerminal(status?: string | null): boolean {
  return status === "COMPLETED" || status === "FAILED" || status === "CANCELLED";
}

export function useScenarios(parentRunId?: string | null) {
  return useQuery({
    queryKey: ["scenarios", { parentRunId: parentRunId || "all" }],
    queryFn: async (): Promise<ScenarioItem[]> => {
      const url = parentRunId
        ? `/api/scenarios?parentRunId=${encodeURIComponent(parentRunId)}`
        : "/api/scenarios";
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error("Failed to load scenarios");
      }
      const data = await res.json();
      return data.scenarios;
    },
  });
}

export function useScenario(scenarioId: string | null) {
  return useQuery({
    queryKey: ["scenario", scenarioId],
    queryFn: async (): Promise<ScenarioItem> => {
      if (!scenarioId) throw new Error("No scenario ID provided");
      const res = await fetch(`/api/scenarios/${scenarioId}`);
      if (!res.ok) {
        throw new Error("Failed to fetch scenario");
      }
      const data = await res.json();
      return data.scenario;
    },
    enabled: Boolean(scenarioId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return isScenarioTerminal(status) ? false : 1500;
    },
  });
}

export function useCreateScenario() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      parentRunId: string;
      percentChange: number;
      horizonDays: number;
    }) => {
      const res = await fetch("/api/scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData.error?.message || `Failed to create scenario (${res.status})`
        );
      }

      return res.json() as Promise<{ scenarioId: string }>;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["scenarios"] });
      queryClient.invalidateQueries({
        queryKey: ["scenarios", { parentRunId: variables.parentRunId }],
      });
    },
  });
}

export function useDeleteScenario() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (scenarioId: string) => {
      const res = await fetch(`/api/scenarios/${scenarioId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData.error?.message || `Failed to delete scenario (${res.status})`
        );
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scenarios"] });
    },
  });
}
