"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ExportRecord, ExportType } from "@epilens/shared";

export function useRunExports(runId: string | null) {
  return useQuery({
    queryKey: ["exports", runId],
    queryFn: async (): Promise<ExportRecord[]> => {
      if (!runId) return [];
      const res = await fetch(`/api/runs/${runId}/exports`);
      if (!res.ok) {
        throw new Error("Failed to load exports");
      }
      const data = await res.json();
      return data.exports;
    },
    enabled: Boolean(runId),
  });
}

export function useExport(exportId: string | null) {
  return useQuery({
    queryKey: ["export", exportId],
    queryFn: async (): Promise<ExportRecord> => {
      if (!exportId) throw new Error("No export ID");
      const res = await fetch(`/api/exports/${exportId}`);
      if (!res.ok) {
        throw new Error("Failed to load export");
      }
      const data = await res.json();
      return data.export;
    },
    enabled: Boolean(exportId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "READY" || status === "FAILED" ? false : 1500;
    },
  });
}

export function useCreateExport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      runId,
      type,
      scenarioId,
    }: {
      runId: string;
      type: ExportType;
      scenarioId?: string;
    }) => {
      const res = await fetch(`/api/runs/${runId}/exports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, scenarioId }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || "Failed to request export");
      }

      return res.json() as Promise<{ exportId: string }>;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["exports", variables.runId] });
    },
  });
}
