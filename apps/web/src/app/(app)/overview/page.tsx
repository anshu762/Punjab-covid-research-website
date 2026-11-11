"use client";

import React, { useRef, useState, useMemo } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { CoverageStrip } from "@/components/data/CoverageStrip";
import { PlotlyChart, type PlotlyChartRef } from "@/components/charts/PlotlyChart";
import { ChartToolbar } from "@/components/charts/ChartToolbar";
import { DataTable, type DataTableColumn } from "@/components/charts/DataTable";
import { CHART_THEME } from "@/components/charts/chartTheme";
import { downloadCsv } from "@/lib/downloadCsv";
import { useWorkspaceStore } from "@/store/workspace";
import { useDatasets, useDataset, useObservations } from "@/hooks/useDatasets";
import {
  calculateTrailing7DayMean,
  formatInt,
  formatDisplayDate,
} from "@epilens/shared";
import {
  LayoutDashboard,
  Calendar,
  Activity,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

export default function OverviewPage() {
  const { datasetId, isSynthetic } = useWorkspaceStore();
  const [isTableView, setIsTableView] = useState(false);
  const chartRef = useRef<PlotlyChartRef>(null);

  // Datasets query
  const { data: datasetsData, isLoading: isLoadingDatasets } = useDatasets();
  const datasets = datasetsData?.datasets || [];

  // Active dataset
  const activeDatasetId = datasetId || (datasets.length > 0 ? datasets[0].id : null);
  const { data: datasetData } = useDataset(activeDatasetId);
  const dataset = datasetData?.dataset;

  // Observations for overview chart (all points in range)
  const { data: obsData } = useObservations(activeDatasetId, {
    all: true,
  });
  const observations = useMemo(() => obsData?.observations || [], [obsData?.observations]);

  // Derived metrics
  const metrics = useMemo(() => {
    if (!observations || observations.length === 0) return null;

    let totalRawCases = 0;
    let peakCount = 0;
    let peakDate = "";

    for (const obs of observations) {
      const val = obs.new_confirmed_raw ?? 0;
      if (val > 0) {
        totalRawCases += val;
      }
      if (val > peakCount) {
        peakCount = val;
        peakDate = obs.date;
      }
    }

    // Trailing 7-day mean
    const points = observations.map((o) => ({
      date: o.date,
      value: o.new_confirmed_analysis,
    }));
    const trailing7DayMeans = calculateTrailing7DayMean(points);

    return {
      totalRawCases,
      peakCount,
      peakDate,
      trailing7DayMeans,
    };
  }, [observations]);

  // Handle CSV export of chart data
  function handleDownloadChartData() {
    if (!metrics || !dataset) return;

    const headers = ["Date", "Observed Cases (Raw)", "Cleaned Cases (Analysis)", "Trailing 7-Day Mean", "Quality Flag"];
    const rows = observations.map((obs, idx) => {
      const mean = metrics.trailing7DayMeans[idx]?.mean;
      return [
        obs.date,
        obs.new_confirmed_raw ?? "",
        obs.new_confirmed_analysis ?? "",
        mean ?? "",
        obs.quality_flag,
      ];
    });

    downloadCsv(`${dataset.name}_epidemic_incidence.csv`, headers, rows);
  }

  // Plotly chart series
  const chartPlotlyData = useMemo(() => {
    if (!metrics || observations.length === 0) return [];

    const dates = observations.map((o) => o.date);
    const rawCounts = observations.map((o) => o.new_confirmed_raw);
    const meanValues = metrics.trailing7DayMeans.map((m) => m.mean);

    return [
      {
        type: "bar" as const,
        x: dates,
        y: rawCounts,
        name: "Observed Daily Cases",
        marker: {
          color: CHART_THEME.colors.observed,
        },
        hovertemplate: "<b>%{x}</b><br>Observed: %{y:,d}<extra></extra>",
      },
      {
        type: "scatter" as const,
        mode: "lines" as const,
        x: dates,
        y: meanValues,
        name: "Trailing 7-Day Mean",
        line: {
          color: CHART_THEME.colors.mean7Day,
          width: CHART_THEME.lineStyles.mean7Day.width,
          dash: CHART_THEME.lineStyles.mean7Day.dash,
        },
        hovertemplate: "<b>%{x}</b><br>7-Day Mean: %{y:.1f}<extra></extra>",
      },
    ];
  }, [metrics, observations]);

  // Chart table columns
  const tableColumns: DataTableColumn[] = [
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
      key: "raw",
      header: "Observed Cases",
      align: "right",
      render: (val) => (
        <span className="font-mono">
          {val !== null && val !== undefined ? formatInt(Number(val)) : "—"}
        </span>
      ),
    },
    {
      key: "analysis",
      header: "Cleaned Analysis",
      align: "right",
      render: (val) => (
        <span className="font-mono font-semibold text-blue-700">
          {val !== null && val !== undefined ? formatInt(Number(val)) : "—"}
        </span>
      ),
    },
    {
      key: "mean",
      header: "Trailing 7-Day Mean",
      align: "right",
      render: (val) => (
        <span className="font-mono text-slate-600">
          {val !== null && val !== undefined ? Number(val).toFixed(1) : "—"}
        </span>
      ),
    },
    {
      key: "flag",
      header: "Flag",
      align: "center",
      render: (val) => (
        <span className="inline-block px-2 py-0.5 text-[10px] font-mono rounded bg-surface-2 border border-border">
          {String(val)}
        </span>
      ),
    },
  ];

  const tableRows = useMemo(() => {
    if (!metrics) return [];
    return observations.map((obs, idx) => ({
      date: obs.date,
      raw: obs.new_confirmed_raw,
      analysis: obs.new_confirmed_analysis,
      mean: metrics.trailing7DayMeans[idx]?.mean,
      flag: obs.quality_flag,
    }));
  }, [metrics, observations]);

  // If no datasets exist in account
  if (!isLoadingDatasets && datasets.length === 0) {
    return (
      <div>
        <PageHeader
          title="Overview"
          description="Project summary, dataset status, and latest completed analysis."
        />
        <EmptyState
          icon={LayoutDashboard}
          title="No dataset loaded yet"
          explanation="To get started, select the bundled Punjab COVID-19 archive, load the synthetic demo wave, or upload your observation CSV in the Data screen."
          primaryAction={{
            label: "Open Data Screen",
            href: "/data",
          }}
          secondaryAction={{
            label: "View Documentation",
            href: "/methods",
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Overview & Epidemic Incidence"
        description="Daily incidence time series for Punjab COVID-19, trailing 7-day moving averages, and data quality indicators."
      />

      {/* Dataset Banner */}
      {dataset && (
        <div className="bg-surface rounded-2xl border border-border p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-ink">{dataset.name}</h2>
              {isSynthetic && (
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-amber-50 text-amber-700 rounded-md border border-amber-200">
                  Demo data
                </span>
              )}
              {dataset.status === "READY" ? (
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 rounded-md border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Ready
                </span>
              ) : (
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-red-50 text-red-700 rounded-md border border-red-200 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Issues Detected
                </span>
              )}
            </div>
            <p className="text-xs text-muted">
              Region: <strong>Punjab, India (PB)</strong> • Population:{" "}
              <strong className="font-mono">{formatInt(dataset.populationValue)}</strong> (Census 2011)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/data"
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-surface text-ink hover:bg-surface-2 transition"
            >
              Manage Data
            </Link>
            <Link
              href="/model"
              className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1.5 transition"
            >
              Fit SIR Models <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* 4 StatCards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Cases */}
        <div className="bg-surface p-4 rounded-xl border border-border shadow-2xs space-y-1">
          <span className="text-xs text-muted flex items-center gap-1.5 font-medium">
            <Activity className="w-3.5 h-3.5 text-blue-600" /> Total Confirmed Cases
          </span>
          <span className="text-xl font-bold font-mono text-ink block">
            {metrics ? formatInt(metrics.totalRawCases) : "—"}
          </span>
          <span className="text-[11px] text-muted block">Cumulative reported</span>
        </div>

        {/* Card 2: Peak Cases */}
        <div className="bg-surface p-4 rounded-xl border border-border shadow-2xs space-y-1">
          <span className="text-xs text-muted flex items-center gap-1.5 font-medium">
            <TrendingUp className="w-3.5 h-3.5 text-blue-600" /> Peak Daily Incidence
          </span>
          <span className="text-xl font-bold font-mono text-ink block">
            {metrics ? formatInt(metrics.peakCount) : "—"}
          </span>
          <span className="text-[11px] text-muted block">
            {metrics?.peakDate ? `Recorded on ${formatDisplayDate(metrics.peakDate)}` : "—"}
          </span>
        </div>

        {/* Card 3: Resolved Corrections */}
        <div className="bg-surface p-4 rounded-xl border border-border shadow-2xs space-y-1">
          <span className="text-xs text-muted flex items-center gap-1.5 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> Negative Adjustments
          </span>
          <span className="text-xl font-bold font-mono text-ink block">
            {dataset?.qualitySummary
              ? `${formatInt(dataset.qualitySummary.corrections.length)} events`
              : "0 events"}
          </span>
          <span className="text-[11px] text-muted block">
            {dataset?.qualitySummary
              ? `${formatInt(dataset.qualitySummary.correction_magnitude)} cases redistributed`
              : "No negative adjustments"}
          </span>
        </div>

        {/* Card 4: Temporal Continuity */}
        <div className="bg-surface p-4 rounded-xl border border-border shadow-2xs space-y-1">
          <span className="text-xs text-muted flex items-center gap-1.5 font-medium">
            <Calendar className="w-3.5 h-3.5 text-blue-600" /> Daily Continuity
          </span>
          <span className="text-xl font-bold font-mono text-ink block">
            {observations.length} days
          </span>
          <span className="text-[11px] text-muted block">
            {observations.length > 0
              ? `${formatDisplayDate(observations[0].date)} – ${formatDisplayDate(
                  observations[observations.length - 1].date
                )}`
              : "—"}
          </span>
        </div>
      </div>

      {/* Epidemic Incidence Chart & Table Alternative */}
      <div className="bg-surface p-5 rounded-2xl border border-border shadow-2xs space-y-4">
        <ChartToolbar
          title="Punjab COVID-19 Epidemic Curve"
          isTableView={isTableView}
          onToggleTableView={() => setIsTableView((v) => !v)}
          onResetZoom={() => chartRef.current?.resetZoom()}
          onDownloadCsv={handleDownloadChartData}
          hasData={observations.length > 0}
        />

        {isTableView ? (
          <DataTable
            columns={tableColumns}
            data={tableRows}
            pageSize={14}
            caption="Epidemic curve tabular data points"
          />
        ) : (
          <PlotlyChart
            ref={chartRef}
            data={chartPlotlyData}
            height={380}
            layout={{
              yaxis: {
                title: "Daily Confirmed Cases",
              },
              xaxis: {
                title: "Date",
              },
            }}
          />
        )}
      </div>

      {/* Temporal Coverage Strip */}
      <div className="bg-surface p-5 rounded-2xl border border-border shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-ink">Observation Quality & Continuity Strip</h3>
            <p className="text-xs text-muted">
              Visual audit strip tracking every daily record across the selected window.
            </p>
          </div>
        </div>
        <CoverageStrip observations={observations} />
      </div>
    </div>
  );
}
