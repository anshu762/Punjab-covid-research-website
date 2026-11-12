"use client";

import React, { useRef, useState, useMemo } from "react";
import { formatInt, formatNumber } from "@epilens/shared";
import type { FitResultPayload } from "@epilens/shared";
import { PlotlyChart, type PlotlyChartRef } from "@/components/charts/PlotlyChart";
import { ChartCard } from "@/components/charts/ChartCard";
import { DataTable, type DataTableColumn } from "@/components/charts/DataTable";
import { CHART_THEME } from "@/components/charts/chartTheme";
import { exportFigure } from "@/components/charts/figureExport";
import { downloadCsv } from "@/lib/downloadCsv";
import { Info, Sparkles } from "lucide-react";

interface TabSirStatesProps {
  payload: FitResultPayload;
}

export function TabSirStates({ payload }: TabSirStatesProps) {
  const chartRef = useRef<PlotlyChartRef>(null);
  const series = payload.series;
  const N = payload.assumptions.population.value;

  // Visibility toggles: S hidden by default because S can dominate the scale
  const [showS, setShowS] = useState(false);
  const [showI, setShowI] = useState(true);
  const [showR, setShowR] = useState(true);

  // Unit toggle: Persons vs Per 100,000
  const [unitMode, setUnitMode] = useState<"persons" | "per100k">("persons");

  const dates = useMemo(() => series.map((s) => s.date), [series]);

  // Scaled arrays
  const multiplier = unitMode === "per100k" ? 100000 / N : 1;
  const unitLabel = unitMode === "per100k" ? "Per 100,000 population" : "Persons";

  const sSeries = useMemo(() => series.map((s) => s.S * multiplier), [series, multiplier]);
  const iSeries = useMemo(() => series.map((s) => s.I * multiplier), [series, multiplier]);
  const rSeries = useMemo(() => series.map((s) => s.R * multiplier), [series, multiplier]);

  // Build Plotly traces
  const traces = useMemo(() => {
    const data: unknown[] = [];

    if (showS) {
      data.push({
        type: "scatter",
        mode: "lines",
        name: "Susceptible S(t)",
        x: dates,
        y: sSeries,
        line: { color: "#64748B", width: 2 },
        hovertemplate: `<b>%{x}</b><br>Susceptible: %{y:,.1f} ${unitMode === "per100k" ? "/ 100k" : ""}<extra></extra>`,
      });
    }

    if (showI) {
      data.push({
        type: "scatter",
        mode: "lines",
        name: "Infectious I(t)",
        x: dates,
        y: iSeries,
        line: { color: "#E11D48", width: 2.5 },
        hovertemplate: `<b>%{x}</b><br>Infectious: %{y:,.1f} ${unitMode === "per100k" ? "/ 100k" : ""}<extra></extra>`,
      });
    }

    if (showR) {
      data.push({
        type: "scatter",
        mode: "lines",
        name: "Removed R(t)",
        x: dates,
        y: rSeries,
        line: { color: "#10B981", width: 2 },
        hovertemplate: `<b>%{x}</b><br>Removed: %{y:,.1f} ${unitMode === "per100k" ? "/ 100k" : ""}<extra></extra>`,
      });
    }

    return data;
  }, [showS, showI, showR, dates, sSeries, iSeries, rSeries, unitMode]);

  const layout = useMemo(() => {
    return {
      xaxis: {
        ...CHART_THEME.baseLayout.xaxis,
        title: "Date",
      },
      yaxis: {
        ...CHART_THEME.baseLayout.yaxis,
        title: unitLabel,
      },
      legend: {
        ...CHART_THEME.baseLayout.legend,
      },
    };
  }, [unitLabel]);

  // Table alternative
  const tableColumns: DataTableColumn[] = [
    { key: "date", header: "Date" },
    ...(showS
      ? [
          {
            key: "S",
            header: `Susceptible (${unitMode === "per100k" ? "/ 100k" : "Persons"})`,
            align: "right" as const,
            render: (v: unknown) => (
              <span className="font-mono text-slate-700">
                {unitMode === "per100k" ? formatNumber(Number(v), 1) : formatInt(Math.round(Number(v)))}
              </span>
            ),
          },
        ]
      : []),
    ...(showI
      ? [
          {
            key: "I",
            header: `Infectious (${unitMode === "per100k" ? "/ 100k" : "Persons"})`,
            align: "right" as const,
            render: (v: unknown) => (
              <span className="font-mono font-bold text-rose-700">
                {unitMode === "per100k" ? formatNumber(Number(v), 1) : formatInt(Math.round(Number(v)))}
              </span>
            ),
          },
        ]
      : []),
    ...(showR
      ? [
          {
            key: "R",
            header: `Removed (${unitMode === "per100k" ? "/ 100k" : "Persons"})`,
            align: "right" as const,
            render: (v: unknown) => (
              <span className="font-mono text-emerald-700">
                {unitMode === "per100k" ? formatNumber(Number(v), 1) : formatInt(Math.round(Number(v)))}
              </span>
            ),
          },
        ]
      : []),
  ];

  const tableRows = useMemo(() => {
    return series.map((s, idx) => ({
      date: s.date,
      S: sSeries[idx],
      I: iSeries[idx],
      R: rSeries[idx],
    }));
  }, [series, sSeries, iSeries, rSeries]);

  function handleDownloadCsv() {
    const headers = [
      "Date",
      `Susceptible (${unitLabel})`,
      `Infectious (${unitLabel})`,
      `Removed (${unitLabel})`,
    ];
    const rows = series.map((s, idx) => [
      s.date,
      sSeries[idx],
      iSeries[idx],
      rSeries[idx],
    ]);
    downloadCsv(`epilens_${payload.run.id.slice(0, 8)}_sir_states_${unitMode}.csv`, headers, rows);
  }

  async function handleExport(format: "png" | "svg") {
    const div = chartRef.current?.getDiv();
    if (!div) return;
    await exportFigure(div, {
      format,
      title: "Latent SIR Model Compartments",
      filename: `epilens_${payload.run.id.slice(0, 8)}_sir_states_${unitMode}`,
      caption:
        "Model-simulated latent states S(t), I(t), and R(t). Note: I(t) represents instantaneous infectious prevalence, not daily reported new cases.",
      period: `${dates[0]} to ${dates[dates.length - 1]}`,
      assumptions: `Population N=${formatInt(N)}, Scale=${unitLabel}`,
    });
  }

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="bg-surface rounded-2xl border border-border p-3.5 sm:p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        {/* Heading Chip */}
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Latent model states — not observed data</span>
          </span>
        </div>

        {/* Visibility Toggles & Unit Switch */}
        <div className="flex flex-wrap items-center gap-4 text-xs">
          {/* Checkboxes */}
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showS}
                onChange={(e) => setShowS(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-border text-slate-600 focus-visible:ring-2 focus-visible:ring-blue-600"
              />
              <span className="text-muted">S (Susceptible)</span>
            </label>

            <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showI}
                onChange={(e) => setShowI(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-border text-rose-600 focus-visible:ring-2 focus-visible:ring-blue-600"
              />
              <span className="text-rose-700 font-medium">I (Infectious)</span>
            </label>

            <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showR}
                onChange={(e) => setShowR(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-border text-emerald-600 focus-visible:ring-2 focus-visible:ring-blue-600"
              />
              <span className="text-emerald-700 font-medium">R (Removed)</span>
            </label>
          </div>

          {/* Unit Toggle */}
          <div className="inline-flex items-center rounded-lg border border-border p-0.5 bg-surface-2">
            <button
              type="button"
              onClick={() => setUnitMode("persons")}
              className={`px-2 py-1 text-xs font-medium rounded-md transition ${
                unitMode === "persons" ? "bg-surface text-ink shadow-xs" : "text-muted hover:text-ink"
              }`}
            >
              Persons
            </button>
            <button
              type="button"
              onClick={() => setUnitMode("per100k")}
              className={`px-2 py-1 text-xs font-medium rounded-md transition ${
                unitMode === "per100k" ? "bg-surface text-ink shadow-xs" : "text-muted hover:text-ink"
              }`}
            >
              Per 100k
            </button>
          </div>
        </div>
      </div>

      {!showS && (
        <div className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-muted text-[11px] flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>
            Susceptible population (S) is hidden by default because its large magnitude ( millions) can
            dominate the vertical scale and flatten the infectious curve. Check &quot;S (Susceptible)&quot; to view.
          </span>
        </div>
      )}

      {/* Main Chart */}
      <ChartCard
        title="Latent Compartment Dynamics"
        subtitle={`Trajectory of unobserved epidemiological states (${unitLabel})`}
        caption="Latent SIR compartments integrated numerically with conservation S + I + R = N. Note: I(t) represents active infectious prevalence, not daily reported new cases."
        onDownloadCsv={handleDownloadCsv}
        onExportPng={() => handleExport("png")}
        onExportSvg={() => handleExport("svg")}
        tableAlternative={<DataTable columns={tableColumns} data={tableRows} defaultPageSize={15} />}
        footer={
          <>
            <span>Run {payload.run.id.slice(0, 8)}</span>
            <span>Total Population: {formatInt(N)}</span>
            <span>Mode: {unitLabel}</span>
          </>
        }
      >
        <PlotlyChart ref={chartRef} data={traces} layout={layout} height={400} />
      </ChartCard>
    </div>
  );
}
