"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { SensitivityResultPayload } from "@epilens/shared";

export interface SensitivityResponse {
  sensitivity: SensitivityResultPayload | null;
  status: "IDLE" | "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED";
}

export function useSensitivity(runId: string | null, isEvaluated = true) {
  return useQuery<SensitivityResponse>({
    queryKey: ["sensitivity", runId],
    queryFn: async () => {
      if (!runId) throw new Error("No run ID");
      const res = await fetch(`/api/runs/${runId}/sensitivity`);
      if (!res.ok) {
        throw new Error("Failed to fetch sensitivity status");
      }
      return res.json() as Promise<SensitivityResponse>;
    },
    enabled: Boolean(runId) && isEvaluated,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "QUEUED" || status === "RUNNING" ? 2000 : false;
    },
  });
}

export function useRunSensitivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (runId: string) => {
      const res = await fetch(`/api/runs/${runId}/sensitivity`, {
        method: "POST",
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || "Failed to trigger sensitivity run");
      }
      return res.json();
    },
    onSuccess: (_data, runId) => {
      queryClient.invalidateQueries({ queryKey: ["sensitivity", runId] });
    },
  });
}
