"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { DEFAULT_DATE_RANGE } from "@epilens/shared";

export interface DateRange {
  start: string;
  end: string;
}

export interface WorkspaceState {
  datasetId: string | null;
  datasetName: string | null;
  isSynthetic: boolean;
  dateRange: DateRange | null;
  activeRunId: string | null;
  activeRunStatus: string | null;
  lastSubmittedConfigHash: string | null;
  modelSettingsDraft: Record<string, unknown>;

  // Actions
  setDataset: (id: string | null, name: string | null, isSynthetic?: boolean) => void;
  setDateRange: (range: DateRange | null) => void;
  setActiveRun: (id: string | null, status: string | null) => void;
  setLastSubmittedConfigHash: (hash: string | null) => void;
  setModelSettingsDraft: (draft: Record<string, unknown>) => void;
  reset: () => void;
}

const initialState = {
  datasetId: null,
  datasetName: null,
  isSynthetic: false,
  dateRange: {
    start: DEFAULT_DATE_RANGE.start,
    end: DEFAULT_DATE_RANGE.end,
  },
  activeRunId: null,
  activeRunStatus: null,
  lastSubmittedConfigHash: null,
  modelSettingsDraft: {},
};

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      ...initialState,
      setDataset: (id, name, isSynthetic = false) =>
        set({ datasetId: id, datasetName: name, isSynthetic }),
      setDateRange: (dateRange) => set({ dateRange }),
      setActiveRun: (activeRunId, activeRunStatus) =>
        set({ activeRunId, activeRunStatus }),
      setLastSubmittedConfigHash: (lastSubmittedConfigHash) =>
        set({ lastSubmittedConfigHash }),
      setModelSettingsDraft: (modelSettingsDraft) =>
        set({ modelSettingsDraft }),
      reset: () => set(initialState),
    }),

    {
      name: "epilens-workspace-v1",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    }
  )
);
