"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { CoverageStrip } from "@/components/data/CoverageStrip";
import { UploadStepper } from "@/components/data/UploadStepper";
import { PopulationModal } from "@/components/data/PopulationModal";
import { DemoBadge } from "@/components/common/DemoBadge";
import { DataTable, type DataTableColumn } from "@/components/charts/DataTable";
import {
  useDatasets,
  useDataset,
  useObservations,
  useImportBundled,
  useDeleteDataset,
} from "@/hooks/useDatasets";
import { useWorkspaceStore } from "@/store/workspace";
import {
  formatInt,
  formatDisplayDate,
  DEFAULT_DATE_RANGE,
  type QualityFlag,
} from "@epilens/shared";
import {
  Database,
  Upload,
  Sparkles,
  Download,
  Trash2,
  AlertOctagon,
  CheckCircle2,
  Users,
  Calendar,
  Loader2,
  FileText,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";

export default function DataPage() {
  const { datasetId, setDataset, setDateRange } = useWorkspaceStore();

  const [activeTab, setActiveTab] = useState<"bundled" | "upload" | "demo">("bundled");
  const [showUploadStepper, setShowUploadStepper] = useState(false);
  const [isPopulationModalOpen, setIsPopulationModalOpen] = useState(false);
  const [flagFilter, setFlagFilter] = useState<string>("");
  const [page, setPage] = useState(1);

  // Queries
  const { data: datasetsData } = useDatasets();
  const datasets = datasetsData?.datasets || [];

  // Active dataset
  const currentDatasetId = datasetId || (datasets.length > 0 ? datasets[0].id : null);
  const { data: currentDatasetData } = useDataset(currentDatasetId);
  const activeDataset = currentDatasetData?.dataset;

  // Observations query
  const { data: obsData, isLoading: isLoadingObs } = useObservations(currentDatasetId, {
    page,
    pageSize: 50,
    filterFlag: flagFilter || undefined,
  });

  // Observations for coverage strip (fetch all for full temporal strip)
  const { data: fullObsData } = useObservations(currentDatasetId, {
    all: true,
  });

  // Mutations
  const importMutation = useImportBundled();
  const deleteMutation = useDeleteDataset();
  const [importingSource, setImportingSource] = useState<string | null>(null);

  // Handlers
  async function handleLoadBundled(key: "punjab_frozen_archive" | "synthetic_demo") {
    setImportingSource(key);
    try {
      const res = await importMutation.mutateAsync(key);
      setDataset(res.dataset_id, res.name, res.is_synthetic);
      if (res.date_start && res.date_end) {
        setDateRange({ start: res.date_start, end: res.date_end });
      }
    } catch (err) {
      console.error("Failed to import bundled dataset", err);
    } finally {
      setImportingSource(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this dataset? This action cannot be undone.")) {
      return;
    }
    try {
      await deleteMutation.mutateAsync(id);
      if (datasetId === id) {
        const remaining = datasets.filter((d) => d.id !== id);
        if (remaining.length > 0) {
          setDataset(remaining[0].id, remaining[0].name, remaining[0].isSynthetic);
        } else {
          setDataset(null, null, false);
        }
      }
    } catch (err) {
      console.error("Failed to delete dataset", err);
    }
  }

  // Summary statistics
  const summary = activeDataset?.qualitySummary;
  const isReady = activeDataset?.status === "READY" && summary?.analysis_ready;

  // Columns for DataTable
  const columns: DataTableColumn[] = [
    {
      key: "date",
      header: "Date",
      render: (val) => (
        <span className="font-mono text-ink font-medium">
          {typeof val === "string" ? formatDisplayDate(val) : String(val)}
        </span>
      ),
    },
    {
      key: "new_confirmed_raw",
      header: "Raw Count",
      align: "right",
      render: (val) => (
        <span className="font-mono">
          {val !== null && val !== undefined ? formatInt(Number(val)) : <span className="text-muted">Missing</span>}
        </span>
      ),
    },
    {
      key: "new_confirmed_analysis",
      header: "Cleaned Analysis",
      align: "right",
      render: (val) => (
        <span className="font-mono font-semibold text-blue-700">
          {val !== null && val !== undefined ? formatInt(Number(val)) : <span className="text-muted">—</span>}
        </span>
      ),
    },
    {
      key: "quality_flag",
      header: "Quality Flag",
      align: "center",
      render: (val) => {
        const flag = String(val) as QualityFlag;
        let badgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-200";
        if (flag === "CORRECTED") badgeStyle = "bg-blue-50 text-blue-700 border-blue-200";
        if (flag === "CORRECTION_DAY") badgeStyle = "bg-amber-50 text-amber-700 border-amber-200";
        if (flag === "MISSING") badgeStyle = "bg-red-50 text-red-700 border-red-200";
        if (flag === "DUPLICATE") badgeStyle = "bg-rose-50 text-rose-700 border-rose-200";
        if (flag === "UNRESOLVED_CORRECTION") badgeStyle = "bg-purple-50 text-purple-700 border-purple-200";

        return (
          <span className={`inline-block px-2 py-0.5 text-[11px] font-medium rounded-full border ${badgeStyle}`}>
            {flag}
          </span>
        );
      },
    },
    {
      key: "source_ref",
      header: "Provenance / Row",
      render: (val) => <span className="text-muted text-xs">{val ? String(val) : "archive"}</span>,
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Dataset Management & Cleaning"
        description="Load or upload COVID-19 aggregate observations, inspect automated 14-day lookback cleaning, and verify population provenance."
      />

      {/* Top Source Tabs */}
      <div className="bg-surface rounded-2xl border border-border shadow-2xs p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab("bundled");
                setShowUploadStepper(false);
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === "bundled" && !showUploadStepper
                  ? "bg-navy-900 text-white"
                  : "text-muted hover:text-ink hover:bg-surface-2"
              }`}
            >
              <Database className="w-4 h-4" /> Bundled Punjab Archive
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("upload");
                setShowUploadStepper(true);
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                showUploadStepper ? "bg-navy-900 text-white" : "text-muted hover:text-ink hover:bg-surface-2"
              }`}
            >
              <Upload className="w-4 h-4" /> Upload CSV
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("demo");
                setShowUploadStepper(false);
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === "demo" && !showUploadStepper
                  ? "bg-navy-900 text-white"
                  : "text-muted hover:text-ink hover:bg-surface-2"
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-500" /> Synthetic Demo
            </button>
          </div>

          {/* Dataset Switcher dropdown if user has multiple datasets */}
          {datasets.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted hidden sm:inline">Active dataset:</span>
              <select
                value={currentDatasetId || ""}
                onChange={(e) => {
                  const sel = datasets.find((d) => d.id === e.target.value);
                  if (sel) {
                    setDataset(sel.id, sel.name, sel.isSynthetic);
                  }
                }}
                className="text-xs font-medium rounded-lg border border-border px-3 py-1.5 bg-surface-2 text-ink focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {datasets.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.isSynthetic ? "Synthetic" : "Archive"})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Tab 1: Bundled Archive */}
        {activeTab === "bundled" && !showUploadStepper && (
          <div className="pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-ink">Punjab COVID-19 Archive</span>
                <span className="badge badge-blue">
                  PB Official Snapshot
                </span>
              </div>
              <p className="text-xs text-muted max-w-2xl">
                Curated and frozen daily confirmed cases from covid19india.org for Punjab (PB) covering{" "}
                <span className="font-mono">2020-07-01</span> to <span className="font-mono">2020-11-30</span>. Census
                2011 population baseline: 27,743,338.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleLoadBundled("punjab_frozen_archive")}
              disabled={Boolean(importingSource)}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 transition shrink-0 shadow-xs"
            >
              {importingSource === "punjab_frozen_archive" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              <span>{importingSource === "punjab_frozen_archive" ? "Loading Archive…" : "Load Frozen Archive"}</span>
            </button>
          </div>
        )}

        {/* Tab 2: Upload Stepper */}
        {showUploadStepper && (
          <div className="pt-4">
            <UploadStepper
              onSuccess={(id, name) => {
                setShowUploadStepper(false);
                setDataset(id, name, false);
              }}
              onCancel={() => setShowUploadStepper(false)}
            />
          </div>
        )}

        {/* Tab 3: Synthetic Demo */}
        {activeTab === "demo" && !showUploadStepper && (
          <div className="pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-ink">Synthetic Punjab Demo Dataset</span>
                <DemoBadge label="Synthetic (Seed 42)" />
              </div>
              <p className="text-xs text-muted max-w-2xl">
                A deterministic, realistic bell-shaped epidemic wave with weekly reporting cycles and Poisson dispersion.
                Ideal for verifying models without network dependencies. Always marked with the &quot;Demo data&quot; badge.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleLoadBundled("synthetic_demo")}
              disabled={Boolean(importingSource)}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 flex items-center gap-2 transition shrink-0 shadow-xs"
            >
              {importingSource === "synthetic_demo" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span>{importingSource === "synthetic_demo" ? "Generating Wave…" : "Load Synthetic Demo"}</span>
            </button>
          </div>
        )}
      </div>

      {/* Active Dataset Inspection */}
      {activeDataset ? (
        <div className="space-y-6">
          {/* Metadata & Provenance Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Region & Population */}
            <div className="bg-surface p-4 rounded-xl border border-border shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-xs text-muted">
                <span className="font-medium flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-blue-600" /> Population Provenance
                </span>
                <button
                  type="button"
                  onClick={() => setIsPopulationModalOpen(true)}
                  className="text-blue-600 hover:text-blue-700 font-semibold text-[11px]"
                >
                  Edit
                </button>
              </div>
              <div className="text-xl font-bold font-mono text-ink">
                {formatInt(activeDataset.populationValue)}
              </div>
              <p className="text-[11px] text-muted">
                {activeDataset.populationGeography || "Punjab, India"} • Ref Year:{" "}
                {activeDataset.populationReferenceYear || 2011}
              </p>
            </div>

            {/* Card 2: Date Span */}
            <div className="bg-surface p-4 rounded-xl border border-border shadow-2xs space-y-2">
              <div className="text-xs font-medium text-muted flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" /> Observation Range
              </div>
              <div className="text-sm font-mono font-semibold text-ink">
                {summary?.date_start && summary?.date_end
                  ? `${formatDisplayDate(summary.date_start)} – ${formatDisplayDate(summary.date_end)}`
                  : `${formatDisplayDate(DEFAULT_DATE_RANGE.start)} – ${formatDisplayDate(DEFAULT_DATE_RANGE.end)}`}
              </div>
              <p className="text-[11px] text-muted font-mono">
                {summary?.expected_days ?? fullObsData?.observations.length ?? 0} continuous calendar days
              </p>
            </div>

            {/* Card 3: Quality Status */}
            <div className="bg-surface p-4 rounded-xl border border-border shadow-2xs space-y-2">
              <div className="text-xs font-medium text-muted flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> Analysis Readiness
              </div>
              <div className="flex items-center gap-2">
                {isReady ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Ready for Model Fitting
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                    <AlertOctagon className="w-3.5 h-3.5" /> Issues Detected (Blocked)
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted">
                {isReady
                  ? "Zero gaps or duplicates in observation series."
                  : "Resolve blocking issues below before fitting models."}
              </p>
            </div>
          </div>

          {/* 4 StatCards for Cleaning Metrics */}
          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-surface p-3.5 rounded-xl border border-border">
                <span className="text-xs text-muted block">Total Records</span>
                <span className="text-lg font-bold font-mono text-ink mt-0.5 block">
                  {formatInt(summary.record_count)}
                </span>
              </div>
              <div className="bg-surface p-3.5 rounded-xl border border-border">
                <span className="text-xs text-muted block">Resolved Corrections</span>
                <span className="text-lg font-bold font-mono text-ink mt-0.5 block">
                  {formatInt(summary.corrections.length)}{" "}
                  <span className="text-xs font-normal text-muted">
                    ({formatInt(summary.correction_magnitude)} cases)
                  </span>
                </span>
              </div>
              <div className="bg-surface p-3.5 rounded-xl border border-border">
                <span className="text-xs text-muted block">Missing Days / Gaps</span>
                <span
                  className={`text-lg font-bold font-mono mt-0.5 block ${
                    summary.missing_days.length > 0 ? "text-danger" : "text-ink"
                  }`}
                >
                  {summary.missing_days.length}
                </span>
              </div>
              <div className="bg-surface p-3.5 rounded-xl border border-border">
                <span className="text-xs text-muted block">Unresolved Negatives</span>
                <span
                  className={`text-lg font-bold font-mono mt-0.5 block ${
                    summary.unresolved.length > 0 ? "text-danger" : "text-ink"
                  }`}
                >
                  {summary.unresolved.length}
                </span>
              </div>
            </div>
          )}

          {/* Blocking Issues Breakdown */}
          {summary && summary.blocking_issues && summary.blocking_issues.length > 0 && (
            <div className="p-4 bg-red-50/70 border border-red-200 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-danger font-semibold text-sm">
                <AlertOctagon className="w-4 h-4" />
                <span>Blocking Issues Preventing SIR Fitting</span>
              </div>
              <ul className="space-y-2 text-xs text-red-950">
                {summary.blocking_issues.map((b, idx) => (
                  <li key={idx} className="bg-white/80 p-2.5 rounded-lg border border-red-200">
                    <div className="font-semibold">{b.message}</div>
                    <div className="text-[11px] text-muted mt-1 font-mono">
                      Code: {b.code} {b.dates.length > 0 && `• Dates: ${b.dates.slice(0, 5).join(", ")}`}
                      {b.dates.length > 5 && ` (+${b.dates.length - 5} more)`}
                      {b.rows.length > 0 && ` • Rows: ${b.rows.slice(0, 5).join(", ")}`}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Temporal Coverage Strip */}
          <div className="bg-surface p-5 rounded-2xl border border-border shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-ink">Continuous Temporal Coverage Strip</h3>
                <p className="text-xs text-muted">
                  Daily observation status across the timeline. Hover over any block to view exact raw and analysis
                  values.
                </p>
              </div>
            </div>
            {fullObsData?.observations && fullObsData.observations.length > 0 ? (
              <CoverageStrip observations={fullObsData.observations} />
            ) : (
              <div className="h-12 bg-surface-2 rounded-lg animate-pulse" />
            )}
          </div>

          {/* Paginated Observations Table */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-ink">Filter by Flag:</span>
                <select
                  value={flagFilter}
                  onChange={(e) => {
                    setFlagFilter(e.target.value);
                    setPage(1);
                  }}
                  className="text-xs rounded-lg border border-border px-3 py-1.5 bg-surface text-ink"
                >
                  <option value="">All Flags ({obsData?.total ?? 0})</option>
                  <option value="OK">OK / Valid</option>
                  <option value="CORRECTED">CORRECTED (Adjusted)</option>
                  <option value="CORRECTION_DAY">CORRECTION_DAY</option>
                  <option value="MISSING">MISSING (Gaps & Blanks)</option>
                  <option value="DUPLICATE">DUPLICATE</option>
                  <option value="UNRESOLVED_CORRECTION">UNRESOLVED</option>
                </select>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                <a
                  href={`/api/datasets/${activeDataset.id}/download/clean`}
                  download
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-surface text-ink hover:bg-surface-2 flex items-center gap-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5 text-blue-600" />
                  Clean CSV
                </a>
                <a
                  href={`/api/datasets/${activeDataset.id}/download/quality-log`}
                  download
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-surface text-ink hover:bg-surface-2 flex items-center gap-1.5 transition"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  Quality Log JSON
                </a>
                <button
                  type="button"
                  onClick={() => handleDelete(activeDataset.id)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-surface text-danger hover:bg-red-50 flex items-center gap-1.5 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            </div>

            {/* Observations DataTable */}
            {isLoadingObs ? (
              <div className="p-8 text-center text-xs text-muted bg-surface rounded-xl border border-border animate-pulse">
                Loading observations...
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={(obsData?.observations || []) as unknown as Record<string, unknown>[]}
                pageSize={50}
                caption={`Showing observations for ${activeDataset.name}`}
              />
            )}
          </div>

          {/* Population Provenance Modal */}
          <PopulationModal
            isOpen={isPopulationModalOpen}
            onClose={() => setIsPopulationModalOpen(false)}
            datasetId={activeDataset.id}
            currentValue={activeDataset.populationValue}
            currentGeography={activeDataset.populationGeography}
            currentYear={activeDataset.populationReferenceYear}
            currentSourceUrl={activeDataset.populationSourceUrl}
          />
        </div>
      ) : (
        /* Empty State when no datasets exist */
        <div className="p-12 text-center bg-surface rounded-2xl border border-border shadow-2xs space-y-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
            <Database className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-ink text-base">No Dataset Available</h3>
            <p className="text-xs text-muted max-w-md mx-auto">
              Get started by importing the official bundled Punjab COVID-19 archive, loading the synthetic demo wave,
              or uploading a custom observation CSV.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => handleLoadBundled("punjab_frozen_archive")}
              disabled={Boolean(importingSource)}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition flex items-center gap-2 disabled:opacity-50 shadow-xs"
            >
              {importingSource === "punjab_frozen_archive" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{importingSource === "punjab_frozen_archive" ? "Loading Archive…" : "Load Frozen Archive"}</span>
            </button>
            <button
              type="button"
              onClick={() => handleLoadBundled("synthetic_demo")}
              disabled={Boolean(importingSource)}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition flex items-center gap-2 disabled:opacity-50 shadow-xs"
            >
              {importingSource === "synthetic_demo" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{importingSource === "synthetic_demo" ? "Generating Wave…" : "Load Synthetic Demo"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
