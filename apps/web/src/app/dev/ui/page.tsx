"use client";

import { Activity, Database } from "lucide-react";
import React, { useState } from "react";
import { ChartCard } from "@/components/charts/ChartCard";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { CopyButton } from "@/components/common/CopyButton";
import { DemoBadge } from "@/components/common/DemoBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { FieldHelp } from "@/components/common/FieldHelp";
import { InlineError } from "@/components/common/InlineError";
import { RunStatusPill } from "@/components/common/RunStatusPill";
import { StaleBanner } from "@/components/common/StaleBanner";
import { StatCard } from "@/components/common/StatCard";

export default function DevUiGalleryPage() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">
          EpiLens Design System & Component Gallery
        </h1>
        <p className="text-sm text-muted mt-1">
          Visual QA showcase of all UI primitives across states (default, hover, focus, disabled, loading, error).
        </p>
      </div>

      {/* Badges & Pills */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
          Status Pills & Badges
        </h2>
        <div className="flex flex-wrap items-center gap-3 p-4 bg-surface rounded-xl border border-border">
          <RunStatusPill status={null} />
          <RunStatusPill status="QUEUED" />
          <RunStatusPill status="VALIDATING" />
          <RunStatusPill status="FITTING" />
          <RunStatusPill status="EVALUATING" />
          <RunStatusPill status="ESTIMATING_UNCERTAINTY" />
          <RunStatusPill status="EXPORTING" />
          <RunStatusPill status="COMPLETED" />
          <RunStatusPill status="FAILED" />
          <RunStatusPill status="CANCELLED" />
          <DemoBadge label="Demo data" />
          <DemoBadge label="Demo account" />
        </div>
      </section>

      {/* Alerts, Banners & Inlines */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
          Banners, Helpers & Inline Errors
        </h2>
        <div className="space-y-3 p-4 bg-surface rounded-xl border border-border">
          <StaleBanner message="Settings changed — rerun required" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldHelp
                label="Infectious Duration"
                hint="Assumed mean duration before recovery"
                tooltip="Fixed parameter (1/gamma). Range 3–21 days per protocol."
                required
              />
              <input
                type="number"
                defaultValue={7}
                className="w-full px-3 py-1.5 text-sm rounded-lg border border-border bg-surface focus-visible:ring-2 focus-visible:ring-blue-600"
              />
              <InlineError message="Value must be between 3 and 21 days" />
            </div>
            <div>
              <FieldHelp label="Run Identifier" hint="Unique deterministic ID" />
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs bg-slate-100 px-3 py-2 rounded-lg border border-border">
                  run_pb_m1_2020_08_31
                </span>
                <CopyButton value="run_pb_m1_2020_08_31" label="Copy Run ID" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stat Cards */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
          Stat Cards (Normal & Loading)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Total Reported Cases"
            value="134,374"
            hint="01 Jul 2020 – 30 Nov 2020"
          />
          <StatCard
            label="7-Day Evaluation MAE"
            value="42.8"
            hint="M1 constant SIR baseline"
          />
          <StatCard
            label="Bootstrap Replicates"
            value="200"
            isLoading
          />
        </div>
      </section>

      {/* Empty & Error States */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
          Empty & Error States
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <EmptyState
            icon={Database}
            title="No dataset loaded"
            explanation="Select the bundled Punjab archive or upload a formatted CSV to inspect data."
            primaryAction={{ label: "Load Bundled Data" }}
            secondaryAction={{ label: "Upload CSV" }}
          />
          <ErrorState
            message="Database connection timed out after 15s"
            errorReference="err_db_pool_timeout_77"
            onRetry={() => alert("Retry clicked")}
          />
        </div>
      </section>

      {/* ChartCard & Table toggle */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
          Chart Container with Table Alternative
        </h2>
        <ChartCard
          title="Daily Observed vs Fitted Cases"
          subtitle="Punjab COVID-19 (01 Jul 2020 – 30 Nov 2020)"
          caption="Report dates used without delay model. M1 constant SIR fit."
          onDownloadCsv={() => alert("CSV Download")}
          tableAlternative={
            <div className="p-4 text-center text-xs text-muted font-mono bg-surface-2 rounded-lg">
              [Data table view displayed in place of chart canvas]
            </div>
          }
        >
          <div className="h-48 flex items-center justify-center bg-slate-50 border border-dashed border-slate-200 rounded-lg text-slate-400 text-sm">
            <Activity className="w-5 h-5 mr-2 text-blue-600" />
            Chart canvas placeholder (Plotly rendering)
          </div>
        </ChartCard>
      </section>

      {/* Modal Dialog */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
          Confirm Dialog
        </h2>
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-danger hover:bg-red-800 rounded-lg shadow-xs"
        >
          Open Delete Confirmation Modal
        </button>
        <ConfirmDialog
          isOpen={dialogOpen}
          title="Delete Saved Run?"
          description="Are you sure you want to permanently delete run_pb_m1_2020? This will cascade delete all scenario outcomes and cached export bundles."
          confirmLabel="Delete Run"
          isDestructive
          onConfirm={() => {
            alert("Deleted");
            setDialogOpen(false);
          }}
          onCancel={() => setDialogOpen(false)}
        />
      </section>
    </div>
  );
}
