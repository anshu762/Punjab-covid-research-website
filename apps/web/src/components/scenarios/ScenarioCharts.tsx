"use client";

import React, { useRef, useState } from "react";
import type { ScenarioDailyOutput, ScenarioSummary } from "@epilens/shared";
import { formatNumber, formatDisplayDate } from "@epilens/shared";
import { ChartCard } from "@/components/charts/ChartCard";
import { PlotlyChart, type PlotlyChartRef } from "@/components/charts/PlotlyChart";
import { DataTable, type DataTableColumn } from "@/components/charts/DataTable";
import { exportFigure } from "@/components/charts/figureExport";
import { ChevronDown, ChevronUp, RotateCcw } from "lucide-react";

interface ScenarioChartsProps {
  dailyOutputs: ScenarioDailyOutput[];
  summary: ScenarioSummary;
  runDisplayName?: string;
  runId: string;
}

export function ScenarioCharts({
  dailyOutputs,
  summary,
  runDisplayName,
  runId,
}: ScenarioChartsProps) {
  const casesChartRef = useRef<PlotlyChartRef>(null);
  const infectionsChartRef = useRef<PlotlyChartRef>(null);
  const [showInfections, setShowInfections] = useState(false);

  const dates = dailyOutputs.map((d) => d.date);
  const baselineCases = dailyOutputs.map((d) => d.baselineExpectedCases);
  const scenarioCases = dailyOutputs.map((d) => d.scenarioExpectedCases);

  const hasCasesInterval = dailyOutputs.some((d) => d.casesInterval);
  const casesLower = hasCasesInterval
    ? dailyOutputs.map((d) => d.casesInterval?.lower ?? d.scenarioExpectedCases)
    : [];
  const casesUpper = hasCasesInterval
    ? dailyOutputs.map((d) => d.casesInterval?.upper ?? d.scenarioExpectedCases)
    : [];

  const baselineInfections = dailyOutputs.map((d) => d.baselineInfections);
  const scenarioInfections = dailyOutputs.map((d) => d.scenarioInfections);

  const hasInfectionsInterval = dailyOutputs.some((d) => d.infectionsInterval);
  const infectionsLower = hasInfectionsInterval
    ? dailyOutputs.map((d) => d.infectionsInterval?.lower ?? d.scenarioInfections)
    : [];
  const infectionsUpper = hasInfectionsInterval
    ? dailyOutputs.map((d) => d.infectionsInterval?.upper ?? d.scenarioInfections)
    : [];

  // Cases Traces
  const casesTraces: unknown[] = [];

  // Interval band first (drawn behind)
  if (hasCasesInterval) {
    casesTraces.push({
      x: [...dates, ...dates.slice().reverse()],
      y: [...casesUpper, ...casesLower.slice().reverse()],
      fill: "toself",
      fillcolor: "rgba(8, 145, 178, 0.16)",
      line: { color: "transparent" },
      name: "95% Paired interval (conditional on assumptions)",
      type: "scatter",
      mode: "lines",
      hoverinfo: "skip",
      showlegend: true,
    });
  }

  // Baseline trace: solid blue (#2563EB)
  casesTraces.push({
    x: dates,
    y: baselineCases,
    type: "scatter",
    mode: "lines",
    name: "Baseline (fitted β)",
    line: { color: "#2563EB", width: 2.5 },
    hovertemplate: "<b>Baseline</b>: %{y:.1f} cases<br>%{x}<extra></extra>",
  });

  // Scenario trace: dashed teal (#0891B2)
  const signStr =
    summary.percentChange > 0 ? `+${summary.percentChange}%` : `${summary.percentChange}%`;
  casesTraces.push({
    x: dates,
    y: scenarioCases,
    type: "scatter",
    mode: "lines",
    name: `Scenario (${signStr} transmission)`,
    line: { color: "#0891B2", width: 2.5, dash: "dot" },
    hovertemplate: "<b>Scenario</b>: %{y:.1f} cases<br>%{x}<extra></extra>",
  });

  const casesLayout = {
    title: false,
    xaxis: {
      title: "Date",
      showgrid: true,
      gridcolor: "#F1F5F9",
      tickfont: { size: 10, color: "#64748B" },
    },
    yaxis: {
      title: "Expected Daily Reported Cases",
      showgrid: true,
      gridcolor: "#F1F5F9",
      tickfont: { size: 10, color: "#64748B" },
      rangemode: "tozero",
    },
    legend: {
      orientation: "h",
      x: 0,
      y: 1.14,
      font: { size: 11, color: "#0F172A" },
    },
    margin: { t: 40, b: 40, l: 60, r: 20 },
    hovermode: "x unified",
    paper_bgcolor: "transparent",
    plot_bgcolor: "transparent",
  };

  // Infections Traces
  const infectionsTraces: unknown[] = [];
  if (hasInfectionsInterval) {
    infectionsTraces.push({
      x: [...dates, ...dates.slice().reverse()],
      y: [...infectionsUpper, ...infectionsLower.slice().reverse()],
      fill: "toself",
      fillcolor: "rgba(8, 145, 178, 0.16)",
      line: { color: "transparent" },
      name: "95% Paired interval (conditional on assumptions)",
      type: "scatter",
      mode: "lines",
      hoverinfo: "skip",
      showlegend: true,
    });
  }

  infectionsTraces.push({
    x: dates,
    y: baselineInfections,
    type: "scatter",
    mode: "lines",
    name: "Baseline model infections",
    line: { color: "#2563EB", width: 2.5 },
    hovertemplate: "<b>Baseline Inf</b>: %{y:.1f}<br>%{x}<extra></extra>",
  });

  infectionsTraces.push({
    x: dates,
    y: scenarioInfections,
    type: "scatter",
    mode: "lines",
    name: `Scenario model infections (${signStr})`,
    line: { color: "#0891B2", width: 2.5, dash: "dot" },
    hovertemplate: "<b>Scenario Inf</b>: %{y:.1f}<br>%{x}<extra></extra>",
  });

  const infectionsLayout = {
    title: false,
    xaxis: {
      title: "Date",
      showgrid: true,
      gridcolor: "#F1F5F9",
      tickfont: { size: 10, color: "#64748B" },
    },
    yaxis: {
      title: "Daily Model Infections (ΔC persons)",
      showgrid: true,
      gridcolor: "#F1F5F9",
      tickfont: { size: 10, color: "#64748B" },
      rangemode: "tozero",
    },
    legend: {
      orientation: "h",
      x: 0,
      y: 1.14,
      font: { size: 11, color: "#0F172A" },
    },
    margin: { t: 40, b: 40, l: 60, r: 20 },
    hovermode: "x unified",
    paper_bgcolor: "transparent",
    plot_bgcolor: "transparent",
  };

  // Table Data
  const tableData: Record<string, unknown>[] = dailyOutputs.map((d) => ({
    date: d.date,
    baselineCases: d.baselineExpectedCases,
    scenarioCases: d.scenarioExpectedCases,
    casesDiff: d.scenarioExpectedCases - d.baselineExpectedCases,
    baselineInfections: d.baselineInfections,
    scenarioInfections: d.scenarioInfections,
    infectionsDiff: d.scenarioInfections - d.baselineInfections,
  }));

  const tableColumns: DataTableColumn[] = [
    {
      key: "date",
      header: "Date",
      render: (v) => (
        <span className="font-mono text-xs">{formatDisplayDate(v as string)}</span>
      ),
    },
    {
      key: "baselineCases",
      header: "Baseline Cases",
      align: "right",
      render: (v) => (
        <span className="font-mono text-xs">{formatNumber(v as number, 1)}</span>
      ),
    },
    {
      key: "scenarioCases",
      header: "Scenario Cases",
      align: "right",
      render: (v) => (
        <span className="font-mono text-xs">{formatNumber(v as number, 1)}</span>
      ),
    },
    {
      key: "casesDiff",
      header: "Diff (Cases)",
      align: "right",
      render: (v) => {
        const num = v as number;
        return (
          <span
            className={`font-mono text-xs font-medium ${
              num < 0
                ? "text-emerald-700"
                : num > 0
                ? "text-amber-700"
                : "text-slate-600"
            }`}
          >
            {num > 0 ? `+${formatNumber(num, 1)}` : formatNumber(num, 1)}
          </span>
        );
      },
    },
    {
      key: "baselineInfections",
      header: "Baseline Infections",
      align: "right",
      render: (v) => (
        <span className="font-mono text-xs">{formatNumber(v as number, 0)}</span>
      ),
    },
    {
      key: "scenarioInfections",
      header: "Scenario Infections",
      align: "right",
      render: (v) => (
        <span className="font-mono text-xs">{formatNumber(v as number, 0)}</span>
      ),
    },
  ];

  function handleDownloadCsv() {
    const headers = [
      "date",
      "baseline_expected_cases",
      "scenario_expected_cases",
      "cases_diff",
      "cases_lower_95",
      "cases_upper_95",
      "baseline_infections",
      "scenario_infections",
      "infections_diff",
    ];

    const rows = dailyOutputs.map((d) => [
      d.date,
      d.baselineExpectedCases.toFixed(2),
      d.scenarioExpectedCases.toFixed(2),
      (d.scenarioExpectedCases - d.baselineExpectedCases).toFixed(2),
      d.casesInterval ? d.casesInterval.lower.toFixed(2) : "",
      d.casesInterval ? d.casesInterval.upper.toFixed(2) : "",
      d.baselineInfections.toFixed(1),
      d.scenarioInfections.toFixed(1),
      (d.scenarioInfections - d.baselineInfections).toFixed(1),
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `epilens_${runId.slice(0, 8)}_scenario_${signStr}_${summary.horizonDays}d.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleExportFigure(chartRef: React.RefObject<PlotlyChartRef | null>, format: "png" | "svg", title: string) {
    const div = chartRef.current?.getDiv();
    if (!div) return;

    await exportFigure(div, {
      format,
      title,
      filename: `epilens_${runId.slice(0, 8)}_scenario_${signStr}_${summary.horizonDays}d`,
      caption: `Forward scenario: ${signStr} transmission change for ${summary.horizonDays} days starting ${summary.startDate}`,
      period: `Start: ${summary.startDate} (${summary.horizonDays} days)`,
      assumptions: `Fitted β: ${summary.baselineBeta.toFixed(4)} → Scenario β: ${summary.scenarioBeta.toFixed(4)}`,
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Primary Chart: Expected Daily Reported Cases */}
      <ChartCard
        title="Expected daily reported cases"
        subtitle={`${runDisplayName ? `${runDisplayName} · ` : ""}Forward simulation: baseline vs ${signStr} transmission change over ${summary.horizonDays} days`}
        onDownloadCsv={handleDownloadCsv}
        onExportPng={() => handleExportFigure(casesChartRef, "png", "Expected Daily Reported Cases - Scenario Simulation")}
        onExportSvg={() => handleExportFigure(casesChartRef, "svg", "Expected Daily Reported Cases - Scenario Simulation")}
        toolbar={
          <div className="flex items-center gap-1 border-r border-border pr-1 mr-1">
            <button
              type="button"
              onClick={() => casesChartRef.current?.resetZoom()}
              title="Reset Zoom"
              className="p-1.5 text-muted hover:text-ink rounded hover:bg-surface-2 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        }
        tableAlternative={
          <DataTable
            columns={tableColumns}
            data={tableData}
            pageSize={10}
            caption={`Scenario Data: ${signStr} transmission change`}
          />
        }
      >
        <PlotlyChart
          ref={casesChartRef}
          data={casesTraces}
          layout={casesLayout}
          height={380}
        />
      </ChartCard>

      {/* Collapsible Secondary Chart: Latent Model Infections */}
      <div className="border border-border rounded-[14px] bg-surface overflow-hidden shadow-xs">
        <button
          type="button"
          onClick={() => setShowInfections((prev) => !prev)}
          className="w-full flex items-center justify-between px-5 py-4 bg-surface hover:bg-surface-2/50 transition-colors text-left"
        >
          <div>
            <h4 className="text-sm font-semibold text-ink">
              Latent model infections (ΔC persons per day)
            </h4>
            <p className="text-xs text-muted mt-0.5">
              Unreported plus reported new infections generated by the transmission process
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <span>{showInfections ? "Hide chart" : "Show chart"}</span>
            {showInfections ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </button>

        {showInfections && (
          <div className="p-4 border-t border-border">
            <ChartCard
              title="Latent Model Infections"
              subtitle="Daily unobserved new infections (persons/day)"
              onDownloadCsv={handleDownloadCsv}
              onExportPng={() =>
                handleExportFigure(
                  infectionsChartRef,
                  "png",
                  "Latent Model Infections - Scenario Simulation"
                )
              }
              onExportSvg={() =>
                handleExportFigure(
                  infectionsChartRef,
                  "svg",
                  "Latent Model Infections - Scenario Simulation"
                )
              }
              tableAlternative={
                <DataTable
                  columns={tableColumns}
                  data={tableData}
                  pageSize={10}
                  caption="Latent Model Infections Data"
                />
              }
            >
              <PlotlyChart
                ref={infectionsChartRef}
                data={infectionsTraces}
                layout={infectionsLayout}
                height={320}
              />
            </ChartCard>
          </div>
        )}
      </div>
    </div>
  );
}
