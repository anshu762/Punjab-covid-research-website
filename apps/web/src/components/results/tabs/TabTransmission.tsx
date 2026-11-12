"use client";

import React, { useRef, useMemo } from "react";
import { formatNumber } from "@epilens/shared";
import type { FitResultPayload } from "@epilens/shared";
import { PlotlyChart, type PlotlyChartRef } from "@/components/charts/PlotlyChart";
import { ChartCard } from "@/components/charts/ChartCard";
import { DataTable, type DataTableColumn } from "@/components/charts/DataTable";
import { CHART_THEME } from "@/components/charts/chartTheme";
import { exportFigure } from "@/components/charts/figureExport";
import { downloadCsv } from "@/lib/downloadCsv";
import { ShieldAlert } from "lucide-react";

interface TabTransmissionProps {
  payload: FitResultPayload;
}

export function TabTransmission({ payload }: TabTransmissionProps) {
  const chartRef = useRef<PlotlyChartRef>(null);
  const series = payload.series;
  const isM2 = payload.run.modelType === "M2";
  const changePoint = payload.changePoint;

  const dates = useMemo(() => series.map((s) => s.date), [series]);
  const betaSeries = useMemo(() => series.map((s) => s.beta), [series]);
  const rEffSeries = useMemo(() => series.map((s) => s.rEff), [series]);

  // Build 2-row subplot traces
  const traces = useMemo(() => {
    const data: unknown[] = [
      // Subplot 1: Beta(t) step line
      {
        type: "scatter",
        mode: "lines",
        name: isM2 ? "Transmission rate β(t) (Change-point)" : "Transmission rate β(t) (Constant)",
        x: dates,
        y: betaSeries,
        line: {
          color: isM2 ? "#0891B2" : "#2563EB",
          width: 2.5,
          shape: "hv", // step line
        },
        yaxis: "y",
        hovertemplate: "<b>%{x}</b><br>β(t): %{y:.4f} day⁻¹<extra></extra>",
      },
      // Subplot 2: R_eff(t) line
      {
        type: "scatter",
        mode: "lines",
        name: "Effective reproduction number R_eff(t)",
        x: dates,
        y: rEffSeries,
        line: {
          color: "#0F172A",
          width: 2,
        },
        yaxis: "y2",
        hovertemplate: "<b>%{x}</b><br>R_eff(t): %{y:.2f}<extra></extra>",
      },
    ];

    return data;
  }, [dates, betaSeries, rEffSeries, isM2]);

  // Layout with 2 stacked subplots sharing date axis
  const layout = useMemo(() => {
    const shapes: unknown[] = [
      // Horizontal R_eff = 1 reference line on yaxis2
      {
        type: "line",
        xref: "paper",
        yref: "y2",
        x0: 0,
        x1: 1,
        y0: 1.0,
        y1: 1.0,
        line: { color: "#DC2626", width: 1.5, dash: "dot" },
      },
    ];

    const annotations: unknown[] = [
      // Label for R_eff = 1
      {
        xref: "paper",
        yref: "y2",
        x: 1.0,
        y: 1.0,
        xanchor: "right",
        yanchor: "bottom",
        text: "R_eff = 1.0 (Epidemic threshold)",
        showarrow: false,
        font: { size: 10, color: "#DC2626", family: "Inter, sans-serif" },
      },
    ];

    // Change-point vertical line for M2
    if (isM2 && changePoint) {
      shapes.push({
        type: "line",
        xref: "x",
        yref: "y",
        x0: changePoint.date,
        x1: changePoint.date,
        y0: 0,
        y1: 1,
        line: { color: "#0891B2", width: 1.5, dash: "dash" },
      });

      annotations.push({
        x: changePoint.date,
        y: 1.05,
        xref: "x",
        yref: "y",
        text: `Change Date: ${changePoint.date}`,
        showarrow: false,
        font: { size: 10, color: "#0891B2", family: "Inter, sans-serif" },
      });
    }

    return {
      grid: { rows: 2, columns: 1, pattern: "independent", roworder: "top to bottom" },
      xaxis: {
        ...CHART_THEME.baseLayout.xaxis,
        title: "Date",
      },
      yaxis: {
        ...CHART_THEME.baseLayout.yaxis,
        title: "β(t) (day⁻¹)",
        domain: [0.55, 1.0],
      },
      yaxis2: {
        ...CHART_THEME.baseLayout.yaxis,
        title: "R_eff(t)",
        domain: [0.0, 0.45],
      },
      shapes,
      annotations,
      legend: {
        ...CHART_THEME.baseLayout.legend,
      },
    };
  }, [isM2, changePoint]);

  // Table alternative
  const tableColumns: DataTableColumn[] = [
    { key: "date", header: "Date" },
    {
      key: "beta",
      header: "Transmission Rate β(t)",
      align: "right",
      render: (v) => <span className="font-mono text-cyan-700 font-semibold">{formatNumber(Number(v), 4)}</span>,
    },
    {
      key: "rEff",
      header: "Effective Reproduction Number R_eff(t)",
      align: "right",
      render: (v) => {
        const val = Number(v);
        return (
          <span className={`font-mono font-bold ${val >= 1.0 ? "text-rose-700" : "text-emerald-700"}`}>
            {formatNumber(val, 2)}
          </span>
        );
      },
    },
  ];

  const tableRows = useMemo(() => {
    return series.map((s) => ({
      date: s.date,
      beta: s.beta,
      rEff: s.rEff,
    }));
  }, [series]);

  function handleDownloadCsv() {
    const headers = ["Date", "Transmission Rate beta(t)", "Effective R (R_eff)"];
    const rows = series.map((s) => [s.date, formatNumber(s.beta, 4), formatNumber(s.rEff, 4)]);
    downloadCsv(`epilens_${payload.run.id.slice(0, 8)}_transmission.csv`, headers, rows);
  }

  async function handleExport(format: "png" | "svg") {
    const div = chartRef.current?.getDiv();
    if (!div) return;
    await exportFigure(div, {
      format,
      title: "Transmission Dynamics: β(t) and R_eff(t)",
      filename: `epilens_${payload.run.id.slice(0, 8)}_transmission`,
      caption:
        "Daily transmission rate β(t) and implied effective reproduction number R_eff(t). Horizontal dotted line marks R_eff=1 threshold.",
      period: `${dates[0]} to ${dates[dates.length - 1]}`,
      assumptions: `γ = ${formatNumber(payload.assumptions.gamma, 4)}, ρ = ${formatNumber(
        payload.assumptions.reportingFraction * 100,
        1
      )}%`,
    });
  }

  return (
    <div className="space-y-4">
      {/* Callout Banner strictly per PRD §3 */}
      <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl flex items-start gap-3 text-xs text-amber-900 leading-relaxed">
        <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-semibold block">Epidemiological Interpretation Callout:</span>
          <p>
            Estimates depend on the assumed reporting fraction ({formatNumber(payload.assumptions.reportingFraction * 100, 1)}%)
            and initial susceptibility ({formatNumber(payload.assumptions.susceptibleFraction * 100, 1)}%);{" "}
            <strong>$\beta/\gamma$ is an assumption-dependent model ratio</strong>. R_eff(t) represents
            model-implied transmission under the fitted parameters.
          </p>
          {isM2 && changePoint && (
            <p className="text-[11px] text-amber-800 font-mono pt-1">
              Note: The change-point on {changePoint.date} (Day {changePoint.dayIndex}) represents a statistical model change, not a verified policy event.
            </p>
          )}
        </div>
      </div>

      {/* Main Transmission Chart */}
      <ChartCard
        title="Transmission Rate & Effective R"
        subtitle="Step transmission trajectory β(t) and reproduction threshold R_eff(t)"
        caption="Top panel: step transmission rate β(t). Bottom panel: effective reproduction number R_eff(t) with R_eff = 1 threshold line."
        onDownloadCsv={handleDownloadCsv}
        onExportPng={() => handleExport("png")}
        onExportSvg={() => handleExport("svg")}
        tableAlternative={<DataTable columns={tableColumns} data={tableRows} defaultPageSize={15} />}
        footer={
          <>
            <span>Run {payload.run.id.slice(0, 8)}</span>
            <span>R_eff Threshold = 1.0</span>
            <span>{isM2 ? "Change-point SIR (M2)" : "Constant SIR (M1)"}</span>
          </>
        }
      >
        <PlotlyChart ref={chartRef} data={traces} layout={layout} height={420} />
      </ChartCard>
    </div>
  );
}
