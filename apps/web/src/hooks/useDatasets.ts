"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { QualityFlag } from "@epilens/shared";

export interface QualitySummary {
  record_count: number;
  date_start: string | null;
  date_end: string | null;
  expected_days: number;
  missing_days: string[];
  duplicate_keys: Array<{ date: string; rows: number[] }>;
  correction_magnitude: number;
  corrections: Array<{
    date: string;
    magnitude: number;
    row_number: number;
    status: string;
    adjustments: Array<{ date: string; before: number; after: number; amount: number }>;
  }>;
  unresolved: Array<{ date: string; row_number: number; magnitude: number; shortfall: number }>;
  blocking_issues: Array<{ code: string; message: string; rows: number[]; dates: string[] }>;
  row_errors?: Array<{ code: string; message: string; rows: number[]; total_occurrences: number }>;
  analysis_ready: boolean;
}

export interface DatasetItem {
  id: string;
  familyId: string;
  version: number;
  name: string;
  regionCode: string;
  isSynthetic: boolean;
  sourceKind: string;
  sourceName: string;
  status: "PENDING_MAPPING" | "READY" | "BLOCKED";
  populationValue: number;
  populationGeography: string | null;
  populationReferenceYear: number | null;
  populationSourceUrl: string | null;
  qualitySummary: QualitySummary | null;
  createdAt: string;
  updatedAt: string;
}

export interface ObservationData {
  date: string;
  new_confirmed_raw: number | null;
  new_confirmed_analysis: number | null;
  quality_flag: QualityFlag;
  source_ref: string | null;
  transformation_id: string | null;
}

export interface ObservationsResponse {
  observations: ObservationData[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function useDatasets() {
  return useQuery<{ datasets: DatasetItem[] }>({
    queryKey: ["datasets"],
    queryFn: async () => {
      const res = await fetch("/api/datasets");
      if (!res.ok) {
        throw new Error("Failed to fetch datasets");
      }
      return res.json();
    },
  });
}

export function useDataset(id: string | null | undefined) {
  return useQuery<{ dataset: DatasetItem }>({
    queryKey: ["dataset", id],
    queryFn: async () => {
      if (!id) throw new Error("Dataset ID required");
      const res = await fetch(`/api/datasets/${encodeURIComponent(id)}`);
      if (!res.ok) {
        throw new Error("Failed to fetch dataset details");
      }
      return res.json();
    },
    enabled: !!id,
  });
}

export function useObservations(
  id: string | null | undefined,
  params: {
    page?: number;
    pageSize?: number;
    filterFlag?: string;
    startDate?: string;
    endDate?: string;
    all?: boolean;
  } = {}
) {
  return useQuery<ObservationsResponse>({
    queryKey: ["observations", id, params],
    queryFn: async () => {
      if (!id) throw new Error("Dataset ID required");
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.set("page", String(params.page));
      if (params.pageSize) searchParams.set("pageSize", String(params.pageSize));
      if (params.filterFlag) searchParams.set("filterFlag", params.filterFlag);
      if (params.startDate) searchParams.set("startDate", params.startDate);
      if (params.endDate) searchParams.set("endDate", params.endDate);
      if (params.all) searchParams.set("all", "true");

      const res = await fetch(
        `/api/datasets/${encodeURIComponent(id)}/observations?${searchParams.toString()}`
      );
      if (!res.ok) {
        throw new Error("Failed to fetch observations");
      }
      return res.json();
    },
    enabled: !!id,
  });
}

export function useImportBundled() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sourceKey: "punjab_frozen_archive" | "synthetic_demo") => {
      const res = await fetch("/api/datasets/import-bundled", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceKey }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || "Import failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["datasets"] });
    },
  });
}

export function useConfirmDataset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      datasetId: string;
      columnMapping: { date: string; new_confirmed: string; region_code?: string };
      dateRange?: [string, string];
      population?: number;
    }) => {
      const res = await fetch("/api/datasets/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || "Confirmation failed");
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["datasets"] });
      queryClient.invalidateQueries({ queryKey: ["dataset", variables.datasetId] });
      queryClient.invalidateQueries({ queryKey: ["observations", variables.datasetId] });
    },
  });
}

export function useUpdatePopulation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      datasetId,
      populationValue,
      populationGeography,
      populationReferenceYear,
      populationSourceUrl,
    }: {
      datasetId: string;
      populationValue: number;
      populationGeography: string;
      populationReferenceYear?: number;
      populationSourceUrl?: string;
    }) => {
      const res = await fetch(`/api/datasets/${encodeURIComponent(datasetId)}/population`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          populationValue,
          populationGeography,
          populationReferenceYear,
          populationSourceUrl,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || "Failed to update population");
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["datasets"] });
      queryClient.invalidateQueries({ queryKey: ["dataset", variables.datasetId] });
    },
  });
}

export function useDeleteDataset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (datasetId: string) => {
      const res = await fetch(`/api/datasets/${encodeURIComponent(datasetId)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || "Failed to delete dataset");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["datasets"] });
    },
  });
}

export function useFetchArchive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { startDate?: string; endDate?: string } = {}) => {
      const res = await fetch("/api/datasets/fetch-archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || "Failed to fetch archive");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["datasets"] });
    },
  });
}
