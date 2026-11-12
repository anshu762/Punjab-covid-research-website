"use client";

import React, { useRef, useMemo } from "react";
import { formatNumber, formatInt } from "@epilens/shared";
import type { FitResultPayload } from "@epilens/shared";
import { PlotlyChart, type PlotlyChartRef } from "@/components/charts/PlotlyChart";
import { ChartCard } from "@/components/charts/ChartCard";
import { DataTable, type DataTableColumn } from "@/components/charts/DataTable";
import { CHART_THEME } from "@/components/charts/chartTheme";
import { SERIES_STYLES } from "@/components/charts/seriesStyles";
import { exportFigure } from "@/components/charts/figureExport";
import { downloadCsv } from "@/lib/downloadCsv";

interface TabObservedFittedProps {
  payload: FitResultPayload;
}

export function TabObservedFitted({ payload }: TabObservedFittedProps) {
  const chartRef = useRef<PlotlyChartRef>(null);
  const series = payload.series;
  const isEvaluate = payload.run.mode === "EVALUATE" && Boolean(payload.evaluation);
  const isM2 = payload.run.modelType === "M2";

  const dates = useMemo(() => series.map((s) => s.date), [series]);
  const observed = useMemo(() => series.map((s) => s.observed), [series]);
  const expected = useMemo(() => series.map((s) => s.expected), [series]);

  const hasInterval = useMemo(() => {
    return series.some((s) => s.lower !== null && s.upper !== null);
  }, [series]);

  const lower = useMemo(() => series.map((s) => s.lower), [series]);
  const upper = useMemo(() => series.map((s) => s.upper), [series]);

  // Forecast target period cutoff
  const evalOrigin = isEvaluate && payload.evaluation?.origins[0] ? payload.evaluation.origins[0] : null;

  // Build Plotly traces
  const traces = useMemo(() => {
    const modelStyle = isM2 ? SERIES_STYLES.m2 : SERIES_STYLES.m1;

    const data: unknown[] = [
      // 1. Observed Cases (Bars)
      {
        type: "bar",
        name: "Observed daily cases",
        x: dates,
        y: observed,
        marker: {
          color: SERIES_STYLES.observed.color,
          opacity: 0.75,
        },
        hovertemplate: "<b>%{x}</b><br>Observed: %{y}<extra></extra>",
      },
      // 2. Expected Incidence Line
      {
        type: "scatter",
        mode: "lines",
        name: isM2 ? "Change-point SIR expected (μ_d)" : "Constant SIR expected (μ_d)",
        x: dates,
        y: expected,
        line: {
          color: modelStyle.color,
          width: 2.5,
          dash: modelStyle.line.dash,
        },
        hovertemplate: "<b>%{x}</b><br>Expected: %{y:.1f}<extra></extra>",
      },
    ];

    // Bootstrap interval band
    if (hasInterval) {
      data.push(
        {
          type: "scatter",
          mode: "lines",
          name: "95% bootstrap upper",
          x: dates,
          y: upper,
          line: { color: "transparent", width: 0 },
          showlegend: false,
          hoverinfo: "skip",
        },
        {
          type: "scatter",
          mode: "lines",
          name: "95% bootstrap interval (expected cases)",
          x: dates,
          y: lower,
          fill: "tonexty",
          fillcolor: isM2 ? "rgba(8, 145, 178, 0.16)" : "rgba(37, 99, 235, 0.16)",
          line: { color: "transparent", width: 0 },
          hovertemplate: "<b>%{x}</b><br>95% Interval: [%{y:.1f} – " + upper[0] + "]<extra></extra>",
        }
      );
    } else {
      // Explanatory unavailable legend entry
      data.push({
        type: "scatter",
        mode: "lines",
        name: "Interval unavailable — uncertainty off",
        x: [null],
        y: [null],
        line: { color: "#94A3B8", dash: "dot", width: 1.5 },
      });
    }

    return data;
  }, [dates, observed, expected, hasInterval, lower, upper, isM2]);

  // Layout with shaded forecast evaluation region if evaluate mode
  const layout = useMemo(() => {
    const shapes: unknown[] = [];
    const annotations: unknown[] = [];

    if (evalOrigin && dates.length > 0) {
      shapes.push({
        type: "rect",
        xref: "x",
        yref: "paper",
        x0: evalOrigin,
        x1: dates[dates.length - 1],
        y0: 0,
        y1: 1,
        fillcolor: "rgba(100, 116, 139, 0.08)",
        line: { width: 1, dash: "dot", color: "#94A3B8" },
      });

      annotations.push({
        x: evalOrigin,
        y: 1.04,
        xref: "x",
        yref: "paper",
        text: "Held-out forecast evaluation period",
        showarrow: false,
        font: { size: 10, color: "#64748B" },
      });
    }

    return {
      shapes,
      annotations,
      xaxis: {
        ...CHART_THEME.baseLayout.xaxis,
        title: "Date",
      },
      yaxis: {
        ...CHART_THEME.baseLayout.yaxis,
        title: "Daily Reported Cases",
      },
      legend: {
        ...CHART_THEME.baseLayout.legend,
      },
    };
  }, [evalOrigin, dates]);

  // Table alternative
  const tableColumns: DataTableColumn[] = [
    { key: "date", header: "Date" },
    {
      key: "observed",
      header: "Observed Cases",
      align: "right",
      render: (v) => (
        <span className="font-mono">{v !== null && v !== undefined ? formatInt(Number(v)) : "—"}</span>
      ),
    },
    {
      key: "expected",
      header: "Expected Cases (μ_d)",
      align: "right",
      render: (v) => (
        <span className="font-mono text-blue-700 font-semibold">
          {v !== null && v !== undefined ? formatNumber(Number(v), 1) : "—"}
        </span>
      ),
    },
    {
      key: "lower",
      header: "95% Lower",
      align: "right",
      render: (v) => (
        <span className="font-mono text-muted">
          {v !== null && v !== undefined ? formatNumber(Number(v), 1) : "—"}
        </span>
      ),
    },
    {
      key: "upper",
      header: "95% Upper",
      align: "right",
      render: (v) => (
        <span className="font-mono text-muted">
          {v !== null && v !== undefined ? formatNumber(Number(v), 1) : "—"}
        </span>
      ),
    },
  ];

  const tableRows = useMemo(() => {
    return series.map((s) => ({
      date: s.date,
      observed: s.observed,
      expected: s.expected,
      lower: s.lower,
      upper: s.upper,
    }));
  }, [series]);

  // Export handlers
  function handleDownloadCsv() {
    const headers = ["Date", "Observed Cases", "Expected Cases (mu_d)", "Lower 95%", "Upper 95%"];
    const rows = series.map((s) => [
      s.date,
      s.observed ?? "",
      s.expected,
      s.lower ?? "",
      s.upper ?? "",
    ]);
    downloadCsv(`epilens_${payload.run.id.slice(0, 8)}_observed_fitted.csv`, headers, rows);
  }

  async function handleExport(format: "png" | "svg") {
    const div = chartRef.current?.getDiv();
    if (!div) return;
    const periodStr = `${series[0]?.date || ""} to ${series[series.length - 1]?.date || ""}`;
    const assumptionsStr = `D=${payload.assumptions.infectiousDurationDays}d, rho=${formatNumber(
      payload.assumptions.reportingFraction * 100,
      1
    )}%, sFrac=${formatNumber(payload.assumptions.susceptibleFraction * 100, 1)}%`;

    await exportFigure(div, {
      format,
      title: "Observed & Fitted Daily Cases",
      filename: `epilens_${payload.run.id.slice(0, 8)}_observed_fitted`,
      caption:
        "Daily observed COVID-19 cases in Punjab alongside model-expected reported incidence (mu_d). Shaded band denotes 95% bootstrap interval when uncertainty is enabled.",
      period: periodStr,
      assumptions: assumptionsStr,
    });
  }

  const periodCaption = isEvaluate
    ? "Fitting and held-out forecast periods are visually distinguished. Note: the displayed trajectory is the final fit across all selected dates."
    : "Model fit across the selected period. Solid dark bars show observed counts; dashed line depicts expected reported incidence.";

  return (
    <ChartCard
      title="Observed & Fitted Incidence"
      subtitle="Reported COVID-19 cases vs. model-expected daily reported incidence"
      caption={periodCaption}
      onDownloadCsv={handleDownloadCsv}
      onExportPng={() => handleExport("png")}
      onExportSvg={() => handleExport("svg")}
      tableAlternative={<DataTable columns={tableColumns} data={tableRows} pageSize={15} />}
      footer={
        <>
          <span>Run {payload.run.id.slice(0, 8)}</span>
          <span>{dates[0]} – {dates[dates.length - 1]}</span>
          <span>{payload.run.modelType} ({payload.run.mode})</span>
        </>
      }
    >
      <PlotlyChart ref={chartRef} data={traces} layout={layout} height={400} />
    </ChartCard>
  );
}
