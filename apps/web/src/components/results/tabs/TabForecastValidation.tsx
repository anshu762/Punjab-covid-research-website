"use client";

import React, { useRef, useState, useMemo } from "react";
import { formatNumber, formatDisplayDate, formatInt } from "@epilens/shared";
import type { FitResultPayload } from "@epilens/shared";
import type { ForecastRowItem } from "@/hooks/useRuns";
import { PlotlyChart, type PlotlyChartRef } from "@/components/charts/PlotlyChart";
import { ChartCard } from "@/components/charts/ChartCard";
import { DataTable, type DataTableColumn } from "@/components/charts/DataTable";
import { CHART_THEME } from "@/components/charts/chartTheme";
import { SERIES_STYLES } from "@/components/charts/seriesStyles";
import { exportFigure } from "@/components/charts/figureExport";
import { downloadCsv } from "@/lib/downloadCsv";
import { EmptyState } from "@/components/common/EmptyState";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
} from "lucide-react";

interface TabForecastValidationProps {
  payload: FitResultPayload;
  forecastRows: ForecastRowItem[];
}

export function TabForecastValidation({ payload, forecastRows }: TabForecastValidationProps) {
  const chartRef = useRef<PlotlyChartRef>(null);
  const evaluation = payload.evaluation;
  const isEvaluate = payload.run.mode === "EVALUATE" && Boolean(evaluation);

  const origins = useMemo(() => evaluation?.origins || [], [evaluation]);
  const [selectedOriginIndex, setSelectedOriginIndex] = useState(0);
  const [showOtherSir, setShowOtherSir] = useState(false);

  const selectedOrigin = origins[selectedOriginIndex] || origins[0] || "";
  const selectedSirModel = evaluation?.selection?.selectedSir || "M1";
  const alternateSirModel = selectedSirModel === "M1" ? "M2" : "M1";

  // Filter forecast rows for the active origin
  const originRows = useMemo(() => {
    return forecastRows.filter((r) => r.originDate === selectedOrigin);
  }, [forecastRows, selectedOrigin]);

  // Extract block metrics for selected origin
  const activeBlock = useMemo(() => {
    return evaluation?.blocks.find((b) => b.origin === selectedOrigin);
  }, [evaluation, selectedOrigin]);

  // Training history up to the cutoff date from stored payload series
  const trainingSeries = useMemo(() => {
    return payload.series.filter((s) => s.date <= selectedOrigin);
  }, [payload.series, selectedOrigin]);

  // Model-specific 7-day forecasts
  const sirForecastRows = useMemo(() => {
    return originRows.filter((r) => r.model === selectedSirModel);
  }, [originRows, selectedSirModel]);

  const altSirForecastRows = useMemo(() => {
    return originRows.filter((r) => r.model === alternateSirModel);
  }, [originRows, alternateSirModel]);

  const meanBaselineRows = useMemo(() => {
    return originRows.filter((r) => r.model === "baseline_mean");
  }, [originRows]);

  const weekdayBaselineRows = useMemo(() => {
    return originRows.filter((r) => r.model === "baseline_weekday");
  }, [originRows]);

  // 7 target dates and actual observations
  const targetDates = useMemo(() => {
    return sirForecastRows.map((r) => r.targetDate);
  }, [sirForecastRows]);

  const actualObserved = useMemo(() => {
    return sirForecastRows.map((r) => r.actual);
  }, [sirForecastRows]);

  // Predictive interval availability
  const hasPredictiveInterval = useMemo(() => {
    return sirForecastRows.some((r) => r.lower !== null && r.upper !== null);
  }, [sirForecastRows]);

  const intervalReason = sirForecastRows[0]?.intervalUnavailableReason || "uncertainty off";

  // Build Plotly traces
  const traces = useMemo(() => {
    if (!isEvaluate || !selectedOrigin) return [];

    const data: unknown[] = [
      // 1. Training history line
      {
        type: "scatter",
        mode: "lines",
        name: "Training history (observed)",
        x: trainingSeries.map((s) => s.date),
        y: trainingSeries.map((s) => s.observed),
        line: { color: SERIES_STYLES.observed.color, width: 2 },
        hovertemplate: "<b>%{x}</b><br>Training Actual: %{y}<extra></extra>",
      },
      // 2. Next 7 actual observed counts (Hollow circles)
      {
        type: "scatter",
        mode: "markers",
        name: "Observed test targets (7 days)",
        x: targetDates,
        y: actualObserved,
        marker: {
          color: SERIES_STYLES.observed.color,
          symbol: "circle-open",
          size: 9,
          line: { width: 2, color: SERIES_STYLES.observed.color },
        },
        hovertemplate: "<b>%{x}</b><br>Observed Test: %{y}<extra></extra>",
      },
      // 3. Selected SIR forecast line
      {
        type: "scatter",
        mode: "lines+markers",
        name: `${selectedSirModel === "M1" ? "Constant SIR (M1)" : "Change-point SIR (M2)"} forecast`,
        x: targetDates,
        y: sirForecastRows.map((r) => r.estimate),
        line: {
          color: selectedSirModel === "M1" ? SERIES_STYLES.m1.color : SERIES_STYLES.m2.color,
          width: 2.5,
          dash: selectedSirModel === "M1" ? SERIES_STYLES.m1.line.dash : SERIES_STYLES.m2.line.dash,
        },
        marker: { size: 6 },
        hovertemplate: "<b>%{x}</b><br>SIR Forecast: %{y:.1f}<extra></extra>",
      },
    ];

    // Optional alternate SIR trace
    if (showOtherSir && altSirForecastRows.length > 0) {
      data.push({
        type: "scatter",
        mode: "lines+markers",
        name: `${alternateSirModel === "M1" ? "Constant SIR (M1)" : "Change-point SIR (M2)"} forecast`,
        x: targetDates,
        y: altSirForecastRows.map((r) => r.estimate),
        line: {
          color: alternateSirModel === "M1" ? SERIES_STYLES.m1.color : SERIES_STYLES.m2.color,
          width: 2,
          dash: "dot",
        },
        marker: { size: 5 },
        hovertemplate: "<b>%{x}</b><br>Alt SIR Forecast: %{y:.1f}<extra></extra>",
      });
    }

    // 4. 7-Day Mean Baseline
    if (meanBaselineRows.length > 0) {
      data.push({
        type: "scatter",
        mode: "lines",
        name: "7-day mean baseline",
        x: targetDates,
        y: meanBaselineRows.map((r) => r.estimate),
        line: {
          color: SERIES_STYLES.baselineMean.color,
          width: 2,
          dash: SERIES_STYLES.baselineMean.line.dash,
        },
        hovertemplate: "<b>%{x}</b><br>7d Mean: %{y:.1f}<extra></extra>",
      });
    }

    // 5. Same-Weekday Baseline
    if (weekdayBaselineRows.length > 0) {
      data.push({
        type: "scatter",
        mode: "lines",
        name: "Same-weekday baseline",
        x: targetDates,
        y: weekdayBaselineRows.map((r) => r.estimate),
        line: {
          color: SERIES_STYLES.baselineWeekday.color,
          width: 2,
          dash: SERIES_STYLES.baselineWeekday.line.dash,
        },
        hovertemplate: "<b>%{x}</b><br>Weekday: %{y:.1f}<extra></extra>",
      });
    }

    // Predictive interval if available
    if (hasPredictiveInterval) {
      const uppers = sirForecastRows.map((r) => r.upper);
      const lowers = sirForecastRows.map((r) => r.lower);
      data.push(
        {
          type: "scatter",
          mode: "lines",
          name: "95% predictive upper",
          x: targetDates,
          y: uppers,
          line: { color: "transparent", width: 0 },
          showlegend: false,
          hoverinfo: "skip",
        },
        {
          type: "scatter",
          mode: "lines",
          name: "95% predictive interval",
          x: targetDates,
          y: lowers,
          fill: "tonexty",
          fillcolor: "rgba(37, 99, 235, 0.15)",
          line: { color: "transparent", width: 0 },
          hovertemplate: "<b>%{x}</b><br>95% Predictive Interval<extra></extra>",
        }
      );
    } else {
      data.push({
        type: "scatter",
        mode: "lines",
        name: `Predictive interval unavailable: ${intervalReason}`,
        x: [null],
        y: [null],
        line: { color: "#94A3B8", dash: "dot", width: 1.5 },
      });
    }

    return data;
  }, [
    isEvaluate,
    selectedOrigin,
    trainingSeries,
    targetDates,
    actualObserved,
    selectedSirModel,
    alternateSirModel,
    sirForecastRows,
    altSirForecastRows,
    meanBaselineRows,
    weekdayBaselineRows,
    hasPredictiveInterval,
    intervalReason,
    showOtherSir,
  ]);

  // Layout with vertical cutoff line
  const layout = useMemo(() => {
    if (!selectedOrigin) return {};

    return {
      shapes: [
        {
          type: "line",
          xref: "x",
          yref: "paper",
          x0: selectedOrigin,
          x1: selectedOrigin,
          y0: 0,
          y1: 1,
          line: { color: "#475569", width: 1.5, dash: "dot" },
        },
      ],
      annotations: [
        {
          x: selectedOrigin,
          y: 1.05,
          xref: "x",
          yref: "paper",
          text: `Cutoff: ${selectedOrigin}`,
          showarrow: false,
          font: { size: 11, color: "#0F172A", family: "Inter, sans-serif" },
        },
      ],
      xaxis: {
        ...CHART_THEME.baseLayout.xaxis,
        title: "Date",
      },
      yaxis: {
        ...CHART_THEME.baseLayout.yaxis,
        title: "Daily Cases",
      },
      legend: {
        ...CHART_THEME.baseLayout.legend,
      },
    };
  }, [selectedOrigin]);

  // If Fit-only run, display clean explanatory EmptyState
  if (!isEvaluate || origins.length === 0) {
    return (
      <div className="bg-surface rounded-2xl border border-border p-6 shadow-2xs">
        <EmptyState
          icon={Calendar}
          title="Forecast performance not evaluated"
          explanation="This analysis was executed in Fit-only mode. Rolling seven-day forecast validation across 13 origins requires launching an Evaluation run from the Model setup screen."
          primaryAction={{
            label: "Configure Forecast Evaluation",
            href: "/model",
          }}
        />
      </div>
    );
  }

  // Mini table rows comparing 7 target days
  const miniTableRows = targetDates.map((date, idx) => {
    const actual = actualObserved[idx];
    const sirEst = sirForecastRows[idx]?.estimate;
    const meanEst = meanBaselineRows[idx]?.estimate;
    const weekEst = weekdayBaselineRows[idx]?.estimate;
    return {
      date,
      actual,
      sir: sirEst,
      mean: meanEst,
      weekday: weekEst,
    };
  });

  const tableColumns: DataTableColumn[] = [
    { key: "date", header: "Target Date" },
    {
      key: "actual",
      header: "Observed Actual",
      align: "right",
      render: (v) => <span className="font-mono font-bold text-ink">{formatInt(Number(v))}</span>,
    },
    {
      key: "sir",
      header: `${selectedSirModel} Forecast`,
      align: "right",
      render: (v) => (
        <span className="font-mono font-semibold text-blue-700">
          {v !== null && v !== undefined ? formatNumber(Number(v), 1) : "—"}
        </span>
      ),
    },
    {
      key: "mean",
      header: "7-Day Mean Baseline",
      align: "right",
      render: (v) => (
        <span className="font-mono text-slate-600">
          {v !== null && v !== undefined ? formatNumber(Number(v), 1) : "—"}
        </span>
      ),
    },
    {
      key: "weekday",
      header: "Same-Weekday Baseline",
      align: "right",
      render: (v) => (
        <span className="font-mono text-slate-500">
          {v !== null && v !== undefined ? formatNumber(Number(v), 1) : "—"}
        </span>
      ),
    },
  ];

  function handleDownloadCsv() {
    const headers = [
      "Target Date",
      "Observed Actual",
      `${selectedSirModel} Forecast`,
      "7-Day Mean Baseline",
      "Same-Weekday Baseline",
    ];
    const rows = miniTableRows.map((r) => [
      r.date,
      r.actual,
      r.sir !== undefined ? formatNumber(r.sir, 1) : "",
      r.mean !== undefined ? formatNumber(r.mean, 1) : "",
      r.weekday !== undefined ? formatNumber(r.weekday, 1) : "",
    ]);
    downloadCsv(`epilens_${payload.run.id.slice(0, 8)}_origin_${selectedOrigin}.csv`, headers, rows);
  }

  async function handleExport(format: "png" | "svg") {
    const div = chartRef.current?.getDiv();
    if (!div) return;
    await exportFigure(div, {
      format,
      title: `Forecast Validation (Origin ${selectedOrigin})`,
      filename: `epilens_${payload.run.id.slice(0, 8)}_forecast_${selectedOrigin}`,
      caption: `Seven-day forecast validation for origin ${selectedOrigin}. Vertical dotted line marks cutoff between training history and test horizon.`,
      period: `Cutoff ${selectedOrigin}`,
      assumptions: `Selected SIR: ${selectedSirModel}`,
    });
  }

  return (
    <div className="space-y-4">
      {/* Origin Selector Bar */}
      <div className="bg-surface rounded-2xl border border-border p-3.5 sm:p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-blue-600" /> Origin:
          </span>

          <label htmlFor="origin-select" className="sr-only">
            Select evaluation origin
          </label>
          <select
            id="origin-select"
            value={selectedOriginIndex}
            onChange={(e) => setSelectedOriginIndex(Number(e.target.value))}
            className="text-xs font-semibold text-ink bg-surface-2 border border-border rounded-lg px-2.5 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            {origins.map((orig, idx) => {
              const split = idx < 9 ? "Dev" : "Final";
              return (
                <option key={orig} value={idx}>
                  Block {idx + 1}: {orig} [{split}]
                </option>
              );
            })}
          </select>

          {/* Prev / Next Buttons */}
          <div className="inline-flex items-center gap-1">
            <button
              type="button"
              disabled={selectedOriginIndex === 0}
              onClick={() => setSelectedOriginIndex((i) => Math.max(0, i - 1))}
              aria-label="Previous forecast origin"
              className="p-1 rounded-md border border-border bg-surface text-slate-700 hover:bg-surface-2 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={selectedOriginIndex === origins.length - 1}
              onClick={() => setSelectedOriginIndex((i) => Math.min(origins.length - 1, i + 1))}
              aria-label="Next forecast origin"
              className="p-1 rounded-md border border-border bg-surface text-slate-700 hover:bg-surface-2 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <span
            className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${
              selectedOriginIndex >= 9
                ? "bg-purple-50 text-purple-700 border-purple-200"
                : "bg-slate-100 text-slate-700 border-slate-200"
            }`}
          >
            {selectedOriginIndex >= 9 ? "Final Block" : "Development Block"}
          </span>
        </div>

        {/* Alternate SIR Toggle */}
        <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showOtherSir}
            onChange={(e) => setShowOtherSir(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-border text-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600"
          />
          <span>Also show {alternateSirModel} forecast</span>
        </label>
      </div>

      {/* Main Validation Chart Card */}
      <ChartCard
        title={`Forecast Validation: Cutoff ${selectedOrigin}`}
        subtitle={`Training history, 7-day targets (${targetDates[0]} – ${targetDates[targetDates.length - 1]}), and baseline comparisons`}
        caption="Solid line shows training history up to cutoff; hollow markers represent actual test targets. Dashed line denotes SIR forecast; slate lines depict 7-day mean and same-weekday baselines."
        onDownloadCsv={handleDownloadCsv}
        onExportPng={() => handleExport("png")}
        onExportSvg={() => handleExport("svg")}
        tableAlternative={<DataTable columns={tableColumns} data={miniTableRows} defaultPageSize={7} />}
        footer={
          <>
            <span>Run {payload.run.id.slice(0, 8)}</span>
            <span>Origin: {selectedOrigin}</span>
            <span>Block {selectedOriginIndex + 1} of 13</span>
          </>
        }
      >
        <PlotlyChart ref={chartRef} data={traces} layout={layout} height={400} />
      </ChartCard>

      {/* Mini Block Scorecard */}
      {activeBlock && (
        <div className="bg-surface rounded-2xl border border-border p-4 shadow-2xs space-y-2">
          <div className="text-xs font-semibold text-ink flex items-center justify-between">
            <span>Block {activeBlock.index} Evaluation Scores</span>
            <span className="text-[11px] text-muted">
              Target Period: {formatDisplayDate(activeBlock.targetStart)} – {formatDisplayDate(activeBlock.targetEnd)}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 bg-surface-2 rounded-xl border border-border">
              <span className="text-[11px] text-muted block">Selected SIR ({selectedSirModel}) MAE</span>
              <span className="text-base font-bold font-mono text-blue-700">
                {activeBlock.mae[selectedSirModel] !== null && activeBlock.mae[selectedSirModel] !== undefined
                  ? formatNumber(activeBlock.mae[selectedSirModel]!, 1)
                  : "—"}
              </span>
            </div>

            <div className="p-2.5 bg-surface-2 rounded-xl border border-border">
              <span className="text-[11px] text-muted block">7-Day Mean Baseline MAE</span>
              <span className="text-base font-bold font-mono text-slate-700">
                {activeBlock.mae.baseline_mean !== null && activeBlock.mae.baseline_mean !== undefined
                  ? formatNumber(activeBlock.mae.baseline_mean, 1)
                  : "—"}
              </span>
            </div>

            <div className="p-2.5 bg-surface-2 rounded-xl border border-border">
              <span className="text-[11px] text-muted block">Same-Weekday Baseline MAE</span>
              <span className="text-base font-bold font-mono text-slate-700">
                {activeBlock.mae.baseline_weekday !== null && activeBlock.mae.baseline_weekday !== undefined
                  ? formatNumber(activeBlock.mae.baseline_weekday, 1)
                  : "—"}
              </span>
            </div>

            <div className="p-2.5 bg-surface-2 rounded-xl border border-border">
              <span className="text-[11px] text-muted block">Total 7-Day Error</span>
              <span className="text-base font-bold font-mono text-ink">
                {activeBlock.totalError[selectedSirModel] !== null &&
                activeBlock.totalError[selectedSirModel] !== undefined
                  ? formatNumber(activeBlock.totalError[selectedSirModel]!, 1)
                  : "—"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
