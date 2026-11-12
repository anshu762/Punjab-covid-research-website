"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  ExternalLink,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Check,
  X,
  Loader2,
  GitCompare,
} from "lucide-react";
import { toast } from "sonner";
import type { RunItem } from "@/hooks/useRuns";
import { useRenameRun, useDeleteRun } from "@/hooks/useRuns";
import { useWorkspaceStore } from "@/store/workspace";
import { formatDisplayDate } from "@epilens/shared";
import { RunStatusPill } from "@/components/common/RunStatusPill";
import { DemoBadge } from "@/components/common/DemoBadge";
import { CopyButton } from "@/components/common/CopyButton";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import Link from "next/link";

interface RunsTableProps {
  runs: RunItem[];
  total: number;
  page: number;
  totalPages: number;
  search: string;
  onSearchChange: (val: string) => void;
  modeFilter: string;
  onModeFilterChange: (val: string) => void;
  modelFilter: string;
  onModelFilterChange: (val: string) => void;
  onPageChange: (newPage: number) => void;
  selectedRunIds: string[];
  onToggleSelectRun: (id: string) => void;
  onClearSelection: () => void;
  onOpenCompare: () => void;
  isLoading?: boolean;
}

export function RunsTable({
  runs,
  total,
  page,
  totalPages,
  search,
  onSearchChange,
  modeFilter,
  onModeFilterChange,
  modelFilter,
  onModelFilterChange,
  onPageChange,
  selectedRunIds,
  onToggleSelectRun,
  onClearSelection,
  onOpenCompare,
  isLoading = false,
}: RunsTableProps) {
  const router = useRouter();
  const { setModelSettingsDraft } = useWorkspaceStore();

  // Rename modal/inline state
  const [editingRunId, setEditingRunId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const renameMutation = useRenameRun();

  // Delete modal state
  const [runToDelete, setRunToDelete] = useState<RunItem | null>(null);
  const deleteMutation = useDeleteRun();

  function startRename(run: RunItem) {
    setEditingRunId(run.id);
    setEditingName(run.displayName);
  }

  async function handleSaveRename(runId: string) {
    if (!editingName.trim()) {
      toast.error("Run display name cannot be empty");
      return;
    }
    try {
      await renameMutation.mutateAsync({
        runId,
        displayName: editingName.trim(),
      });
      toast.success("Run renamed successfully");
      setEditingRunId(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to rename run");
    }
  }

  function handleDuplicateSettings(run: RunItem) {
    if (run.config) {
      setModelSettingsDraft(run.config as unknown as Record<string, unknown>);
      toast.success("Settings copied into model draft");
      router.push("/model");
    } else {
      toast.error("No saved configuration found for this run");
    }
  }

  async function handleConfirmDelete() {
    if (!runToDelete) return;
    try {
      await deleteMutation.mutateAsync(runToDelete.id);
      toast.success("Run and associated assets deleted");
      if (selectedRunIds.includes(runToDelete.id)) {
        onToggleSelectRun(runToDelete.id);
      }
      setRunToDelete(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete run");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Search and Filters Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-surface border border-border rounded-[14px] shadow-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[240px] max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search runs by name…"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs font-medium text-ink bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 transition-shadow"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Mode Filter */}
          <select
            value={modeFilter}
            onChange={(e) => onModeFilterChange(e.target.value)}
            className="text-xs font-medium text-ink bg-surface border border-border rounded-lg px-2.5 py-2 focus:ring-2 focus:ring-blue-600 focus:outline-none"
          >
            <option value="ALL">All Modes</option>
            <option value="FIT">Fit-only</option>
            <option value="EVALUATE">Evaluate</option>
          </select>

          {/* Model Filter */}
          <select
            value={modelFilter}
            onChange={(e) => onModelFilterChange(e.target.value)}
            className="text-xs font-medium text-ink bg-surface border border-border rounded-lg px-2.5 py-2 focus:ring-2 focus:ring-blue-600 focus:outline-none"
          >
            <option value="ALL">All Models</option>
            <option value="M1">SIR Constant (M1)</option>
            <option value="M2">SIR Change-Point (M2)</option>
          </select>

          <span className="text-xs text-muted font-mono ml-1">
            {total} {total === 1 ? "run" : "runs"}
          </span>
        </div>
      </div>

      {/* Main Table */}
      <div className="border border-border rounded-[14px] bg-surface overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-surface-2 text-muted uppercase tracking-wider border-b border-border font-semibold">
              <tr>
                <th className="py-3 px-4 w-10 text-center">
                  <span className="sr-only">Select</span>
                </th>
                <th className="py-3 px-4">Run Name & ID</th>
                <th className="py-3 px-4">Model & Mode</th>
                <th className="py-3 px-4">Dataset</th>
                <th className="py-3 px-4">Dates</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Created</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
                    <span>Loading saved runs…</span>
                  </td>
                </tr>
              ) : runs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted">
                    No runs found matching your filters.
                  </td>
                </tr>
              ) : (
                runs.map((run) => {
                  const isSelected = selectedRunIds.includes(run.id);
                  const canSelect = isSelected || selectedRunIds.length < 3;
                  const isEditing = editingRunId === run.id;

                  return (
                    <tr
                      key={run.id}
                      className={`hover:bg-surface-2/60 transition-colors ${
                        isSelected ? "bg-blue-50/40" : ""
                      }`}
                    >
                      {/* Checkbox for compare */}
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={!canSelect}
                          onChange={() => onToggleSelectRun(run.id)}
                          title={
                            !canSelect
                              ? "Maximum 3 runs can be selected for comparison"
                              : "Select for comparison"
                          }
                          className="rounded border-border text-blue-600 focus:ring-blue-600 cursor-pointer disabled:opacity-40"
                        />
                      </td>

                      {/* Run Name & ID */}
                      <td className="py-3 px-4 min-w-[200px]">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              className="text-xs px-2 py-1 border border-blue-600 rounded font-medium text-ink bg-surface focus:outline-none"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveRename(run.id)}
                              disabled={renameMutation.isPending}
                              title="Save name"
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingRunId(null)}
                              title="Cancel"
                              className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-ink">
                                {run.displayName}
                              </span>
                              <button
                                type="button"
                                onClick={() => startRename(run)}
                                title="Rename run"
                                className="text-slate-400 hover:text-slate-600 p-0.5"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            </div>
                            <div className="flex items-center gap-1 text-[11px] font-mono text-muted">
                              <span>{run.id.slice(0, 8)}</span>
                              <CopyButton value={run.id} label="Copy ID" />
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Model & Mode */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded font-mono font-medium text-[11px] bg-surface-2 border border-border text-slate-800">
                            {run.modelType}
                          </span>
                          <span className="px-2 py-0.5 rounded font-sans text-[11px] bg-slate-100 text-slate-700">
                            {run.mode}
                          </span>
                        </div>
                      </td>

                      {/* Dataset */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="text-ink font-medium">
                            {run.dataset?.name || "Dataset"}
                          </span>
                          <span className="font-mono text-[10px] text-muted">
                            v{run.dataset?.version || 1}
                          </span>
                          {run.dataset?.isSynthetic && <DemoBadge />}
                        </div>
                      </td>

                      {/* Dates */}
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-700">
                        {formatDisplayDate(
                          run.config?.dateRange?.start || "2020-07-01"
                        )}{" "}
                        →{" "}
                        {formatDisplayDate(
                          run.config?.dateRange?.end || "2020-11-30"
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <RunStatusPill status={run.status} />
                      </td>

                      {/* Created */}
                      <td className="py-3 px-4 text-muted text-[11px]">
                        {formatDisplayDate(run.createdAt.slice(0, 10))}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Reopen without refit */}
                          <Link
                            href={`/results?run=${run.id}`}
                            title="Reopen results without refitting"
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>

                          {/* Duplicate settings */}
                          <button
                            type="button"
                            onClick={() => handleDuplicateSettings(run)}
                            title="Duplicate settings to model draft"
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => setRunToDelete(run)}
                            title="Delete run"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between px-4 py-3 bg-surface-2 border-t border-border text-xs text-muted">
          <div>
            Showing Page <span className="font-semibold text-ink">{page}</span> of{" "}
            <span className="font-semibold text-ink">{totalPages}</span> ({total}{" "}
            total runs)
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1 || isLoading}
              className="p-1.5 rounded-lg border border-border bg-surface hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages || isLoading}
              className="p-1.5 rounded-lg border border-border bg-surface hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Floating Compare Action Bar */}
      {selectedRunIds.length > 0 && (
        <div className="sticky bottom-4 z-40 flex items-center justify-between p-3.5 bg-navy-900 text-white rounded-[14px] shadow-lg animate-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600/40 flex items-center justify-center text-blue-300">
              <GitCompare className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-semibold">
                {selectedRunIds.length} of 3 runs selected for comparison
              </span>
              <p className="text-[11px] text-slate-400">
                {selectedRunIds.length < 2
                  ? "Select at least 2 runs to evaluate side-by-side"
                  : "Ready to compare metrics and evaluation conditions"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClearSelection}
              className="px-3 py-1.5 text-xs text-slate-300 hover:text-white transition-colors"
            >
              Clear
            </button>

            <button
              type="button"
              onClick={onOpenCompare}
              disabled={selectedRunIds.length < 2}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors"
            >
              <GitCompare className="w-3.5 h-3.5" />
              <span>Compare selected ({selectedRunIds.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(runToDelete)}
        title="Delete Saved Run?"
        description={`Are you sure you want to delete "${runToDelete?.displayName}"? This will permanently delete the model run, fitted parameter states, forecast rows, scenarios, and any exported figure bundles.`}
        confirmLabel="Delete permanently"
        cancelLabel="Keep run"
        isDestructive={true}
        isLoading={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setRunToDelete(null)}
      />
    </div>
  );
}
