"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { FolderDown, Layers, DownloadCloud } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { RunsTable } from "@/components/runs/RunsTable";
import { RunCompareModal } from "@/components/runs/RunCompareModal";
import { DownloadsCentre } from "@/components/runs/DownloadsCentre";
import { useRunsTable } from "@/hooks/useRuns";
import type { RunItem } from "@/hooks/useRuns";

export default function RunsPage() {
  const searchParams = useSearchParams();
  const urlTab = searchParams.get("tab");
  const urlRunId = searchParams.get("run") || undefined;

  const [activeTab, setActiveTab] = useState<"runs" | "downloads">(
    urlTab === "downloads" ? "downloads" : "runs"
  );

  // Filter and pagination state
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [modeFilter, setModeFilter] = useState("ALL");
  const [modelFilter, setModelFilter] = useState("ALL");
  const [page, setPage] = useState(1);

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to page 1 on new search
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Query runs table
  const { data: runsData, isLoading } = useRunsTable({
    search: debouncedSearch || undefined,
    mode: modeFilter !== "ALL" ? (modeFilter as "FIT" | "EVALUATE") : undefined,
    modelType: modelFilter !== "ALL" ? (modelFilter as "M1" | "M2") : undefined,
    page,
    limit: 10,
  });

  const runs = runsData?.runs || [];
  const total = runsData?.total || 0;
  const totalPages = runsData?.totalPages || 1;

  // Comparison selection (max 3 runs)
  const [selectedRunIds, setSelectedRunIds] = useState<string[]>([]);
  const [isCompareOpen, setIsCompareOpen] = useState(false);

  function handleToggleSelectRun(id: string) {
    setSelectedRunIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((r) => r !== id);
      }
      if (prev.length >= 3) {
        return prev;
      }
      return [...prev, id];
    });
  }

  function handleClearSelection() {
    setSelectedRunIds([]);
  }

  const selectedRunObjects: RunItem[] = selectedRunIds
    .map((id) => runs.find((r) => r.id === id))
    .filter((r): r is RunItem => Boolean(r));

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Saved runs and compare"
        description="Reopen historical results, compare compatible models side-by-side, duplicate configurations, and download reproducibility bundles."
      />

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab("runs")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === "runs"
              ? "border-blue-600 text-blue-600 font-bold"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Saved Runs ({total})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("downloads")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === "downloads"
              ? "border-blue-600 text-blue-600 font-bold"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          <DownloadCloud className="w-4 h-4" />
          <span>Download Centre</span>
        </button>
      </div>

      {activeTab === "runs" ? (
        total === 0 && !isLoading && !debouncedSearch ? (
          <EmptyState
            icon={FolderDown}
            title="No saved runs found"
            explanation="Every submitted fit, evaluation, and scenario is automatically saved here with full configuration parameters, SHA-256 data checksums, and downloadable ZIP export bundles."
            primaryAction={{
              label: "Start New Model Run",
              href: "/model",
            }}
            secondaryAction={{
              label: "View Methodology",
              href: "/methods",
            }}
          />
        ) : (
          <>
            <RunsTable
              runs={runs}
              total={total}
              page={page}
              totalPages={totalPages}
              search={search}
              onSearchChange={setSearch}
              modeFilter={modeFilter}
              onModeFilterChange={(m) => {
                setModeFilter(m);
                setPage(1);
              }}
              modelFilter={modelFilter}
              onModelFilterChange={(m) => {
                setModelFilter(m);
                setPage(1);
              }}
              onPageChange={setPage}
              selectedRunIds={selectedRunIds}
              onToggleSelectRun={handleToggleSelectRun}
              onClearSelection={handleClearSelection}
              onOpenCompare={() => setIsCompareOpen(true)}
              isLoading={isLoading}
            />

            {/* Side-by-side Multi-run Compare Modal */}
            <RunCompareModal
              isOpen={isCompareOpen}
              onClose={() => setIsCompareOpen(false)}
              selectedRuns={selectedRunObjects}
            />
          </>
        )
      ) : (
        <DownloadsCentre runs={runs} defaultRunId={urlRunId} />
      )}
    </div>
  );
}
