"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { RunConfig, FitResultPayload } from "@epilens/shared";

export interface RunItem {
  id: string;
  displayName: string;
  mode: "FIT" | "EVALUATE";
  modelType: "M1" | "M2";
  status:
    | "QUEUED"
    | "VALIDATING"
    | "FITTING"
    | "EVALUATING"
    | "ESTIMATING_UNCERTAINTY"
    | "EXPORTING"
    | "COMPLETED"
    | "FAILED"
    | "CANCELLED";
  stage: string;
  progressDone: number | null;
  progressTotal: number | null;
  elapsedSeconds?: number;
  cancelRequested?: boolean;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  errorReference: string | null;
  errorMessage: string | null;
  hasFit: boolean;
  evaluated: boolean;
  configHash?: string;
  cacheKey?: string;
  config?: RunConfig;
  dataset?: {
    id: string;
    name: string;
    isSynthetic: boolean;
  };
}

export function isTerminalStatus(status?: string | null): boolean {
  return status === "COMPLETED" || status === "FAILED" || status === "CANCELLED";
}

export function useRuns(activeOnly = false) {
  return useQuery({
    queryKey: ["runs", { activeOnly }],
    queryFn: async (): Promise<RunItem[]> => {
      const res = await fetch(`/api/runs${activeOnly ? "?active=true" : ""}`);
      if (!res.ok) {
        throw new Error("Failed to load runs");
      }
      const data = await res.json();
      return data.runs;
    },
  });
}

export function useRun(runId: string | null) {
  return useQuery({
    queryKey: ["run", runId],
    queryFn: async (): Promise<RunItem> => {
      if (!runId) throw new Error("No run ID");
      const res = await fetch(`/api/runs/${runId}`);
      if (!res.ok) {
        throw new Error("Failed to fetch run status");
      }
      const data = await res.json();
      return data.run;
    },
    enabled: Boolean(runId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return isTerminalStatus(status) ? false : 2000;
    },
  });
}

export function useRunResults(runId: string | null) {
  return useQuery({
    queryKey: ["run-results", runId],
    queryFn: async () => {
      if (!runId) throw new Error("No run ID");
      const res = await fetch(`/api/runs/${runId}/results`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error?.message || "Failed to fetch run results");
      }
      return res.json() as Promise<{
        runId: string;
        metadata: Record<string, unknown>;
        payload: FitResultPayload;
        forecastRows: Array<Record<string, unknown>>;
      }>;
    },
    enabled: Boolean(runId),
  });
}

export function useCreateRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      config,
      idempotencyKey,
    }: {
      config: RunConfig;
      idempotencyKey: string;
    }): Promise<{ runId: string; cached?: boolean; message?: string }> => {
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(config),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(
          errJson.error?.message || `Server returned ${res.status}: Failed to launch run`
        );
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["runs"] });
    },
  });
}

export function useCancelRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (runId: string) => {
      const res = await fetch(`/api/runs/${runId}/cancel`, {
        method: "POST",
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || "Failed to cancel run");
      }
      return res.json();
    },
    onSuccess: (_data, runId) => {
      queryClient.invalidateQueries({ queryKey: ["run", runId] });
      queryClient.invalidateQueries({ queryKey: ["runs"] });
    },
  });
}

export function useRenameRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      runId,
      displayName,
    }: {
      runId: string;
      displayName: string;
    }) => {
      const res = await fetch(`/api/runs/${runId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName }),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || "Failed to rename run");
      }
      return res.json();
    },
    onSuccess: (_data, { runId }) => {
      queryClient.invalidateQueries({ queryKey: ["run", runId] });
      queryClient.invalidateQueries({ queryKey: ["runs"] });
    },
  });
}

export function useDeleteRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (runId: string) => {
      const res = await fetch(`/api/runs/${runId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || "Failed to delete run");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["runs"] });
    },
  });
}
