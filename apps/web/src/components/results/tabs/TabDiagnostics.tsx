"use client";

import React, { useRef, useMemo } from "react";
import { formatNumber } from "@epilens/shared";
import type { FitResultPayload } from "@epilens/shared";
import { PlotlyChart, type PlotlyChartRef } from "@/components/charts/PlotlyChart";
import { ChartCard } from "@/components/charts/ChartCard";
import { DataTable, type DataTableColumn } from "@/components/charts/DataTable";
import { CHART_THEME } from "@/components/charts/chartTheme";
import { downloadCsv } from "@/lib/downloadCsv";
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
} from "lucide-react";

interface TabDiagnosticsProps {
  payload: FitResultPayload;
}

export function TabDiagnostics({ payload }: TabDiagnosticsProps) {
  const chartRefResiduals = useRef<PlotlyChartRef>(null);
  const chartRefAcf = useRef<PlotlyChartRef>(null);

  const { diagnostics } = payload;
  const residuals = diagnostics.residuals;
  const acf = diagnostics.acf;
  const acfLimit = diagnostics.acfLimit;
  const profiles = diagnostics.profiles;
  const warnings = diagnostics.warnings;
  const status = diagnostics.status;

  // 1. Residuals over time trace
  const residualDates = useMemo(() => residuals.map((r) => r.date), [residuals]);
  const rawResiduals = useMemo(() => residuals.map((r) => r.raw), [residuals]);
  const pearsonResiduals = useMemo(() => residuals.map((r) => r.pearson), [residuals]);

  const residualTraces = useMemo(() => {
    return [
      {
        type: "scatter",
        mode: "markers",
        name: "Raw residuals (Observed − Expected)",
        x: residualDates,
        y: rawResiduals,
        marker: { color: "#2563EB", size: 5, opacity: 0.8 },
        hovertemplate: "<b>%{x}</b><br>Residual: %{y:.1f}<extra></extra>",
      },
    ];
  }, [residualDates, rawResiduals]);

  const residualLayout = useMemo(() => {
    return {
      xaxis: { ...CHART_THEME.baseLayout.xaxis, title: "Date" },
      yaxis: {
        ...CHART_THEME.baseLayout.yaxis,
        title: "Residual (Cases)",
        zeroline: true,
        zerolinecolor: "#0F172A",
        zerolinewidth: 1.5,
      },
      legend: { ...CHART_THEME.baseLayout.legend },
    };
  }, []);

  // 2. Pearson residual histogram (binned bar chart computed in TS)
  const binnedPearson = useMemo(() => {
    if (pearsonResiduals.length === 0) return { bins: [], counts: [] };
    const minVal = Math.min(...pearsonResiduals);
    const maxVal = Math.max(...pearsonResiduals);
    const nBins = 12;
    const step = (maxVal - minVal) / nBins || 1;

    const binCenters: number[] = [];
    const counts = new Array(nBins).fill(0);

    for (let i = 0; i < nBins; i++) {
      binCenters.push(minVal + (i + 0.5) * step);
    }

    for (const v of pearsonResiduals) {
      const idx = Math.min(nBins - 1, Math.max(0, Math.floor((v - minVal) / step)));
      counts[idx]++;
    }

    return { bins: binCenters, counts };
  }, [pearsonResiduals]);

  const pearsonTraces = useMemo(() => {
    return [
      {
        type: "bar",
        name: "Pearson residuals distribution",
        x: binnedPearson.bins,
        y: binnedPearson.counts,
        marker: { color: "#64748B", opacity: 0.8 },
        hovertemplate: "Bin center: %{x:.2f}<br>Count: %{y}<extra></extra>",
      },
    ];
  }, [binnedPearson]);

  const pearsonLayout = useMemo(() => {
    return {
      xaxis: { ...CHART_THEME.baseLayout.xaxis, title: "Pearson Residual (Normalized)" },
      yaxis: { ...CHART_THEME.baseLayout.yaxis, title: "Frequency" },
    };
  }, []);

  // 3. Lag Autocorrelation (ACF) bars with +/- acfLimit lines
  const acfLags = useMemo(() => acf.map((a) => a.lag), [acf]);
  const acfValues = useMemo(() => acf.map((a) => a.value), [acf]);

  const acfTraces = useMemo(() => {
    return [
      {
        type: "bar",
        name: "Autocorrelation r_k",
        x: acfLags,
        y: acfValues,
        marker: {
          color: acfValues.map((v) => (Math.abs(v) > acfLimit ? "#E11D48" : "#2563EB")),
        },
        hovertemplate: "Lag %{x}: %{y:.3f}<extra></extra>",
      },
    ];
  }, [acfLags, acfValues, acfLimit]);

  const acfLayout = useMemo(() => {
    return {
      xaxis: { ...CHART_THEME.baseLayout.xaxis, title: "Lag (Days)", dtick: 1 },
      yaxis: {
        ...CHART_THEME.baseLayout.yaxis,
        title: "Autocorrelation",
        zeroline: true,
        zerolinecolor: "#0F172A",
        range: [-1, 1],
      },
      shapes: [
        {
          type: "line",
          xref: "paper",
          yref: "y",
          x0: 0,
          x1: 1,
          y0: acfLimit,
          y1: acfLimit,
          line: { color: "#DC2626", width: 1.5, dash: "dot" },
        },
        {
          type: "line",
          xref: "paper",
          yref: "y",
          x0: 0,
          x1: 1,
          y0: -acfLimit,
          y1: -acfLimit,
          line: { color: "#DC2626", width: 1.5, dash: "dot" },
        },
      ],
      annotations: [
        {
          xref: "paper",
          yref: "y",
          x: 1,
          y: acfLimit,
          xanchor: "right",
          yanchor: "bottom",
          text: `+2/√n threshold (${formatNumber(acfLimit, 2)})`,
          showarrow: false,
          font: { size: 9, color: "#DC2626" },
        },
      ],
    };
  }, [acfLimit]);

  // Profile plots
  const profileKeys = Object.keys(profiles);

  // Table alternative
  const tableColumns: DataTableColumn[] = [
    { key: "date", header: "Date" },
    {
      key: "raw",
      header: "Raw Residual (Cases)",
      align: "right",
      render: (v) => <span className="font-mono">{formatNumber(Number(v), 1)}</span>,
    },
    {
      key: "pearson",
      header: "Pearson Residual",
      align: "right",
      render: (v) => <span className="font-mono text-muted">{formatNumber(Number(v), 2)}</span>,
    },
  ];

  function handleDownloadResidualsCsv() {
    const headers = ["Date", "Raw Residual", "Pearson Residual"];
    const rows = residuals.map((r) => [r.date, r.raw, r.pearson]);
    downloadCsv(`epilens_${payload.run.id.slice(0, 8)}_residuals.csv`, headers, rows);
  }

  async function handleExportResiduals(format: "png" | "svg") {
    const div = chartRefResiduals.current?.getDiv();
    if (!div) return;
    await exportFigure(div, {
      format,
      title: "Daily Residuals Over Time",
      filename: `epilens_${payload.run.id.slice(0, 8)}_residuals`,
      caption: "Observed daily cases minus expected reported incidence (y - mu_d).",
      period: `${residuals[0]?.date || ""} to ${residuals[residuals.length - 1]?.date || ""}`,
      assumptions: `k=${formatNumber(payload.parameters.dispersion, 1)}`,
    });
  }

  async function handleExportAcf(format: "png" | "svg") {
    const div = chartRefAcf.current?.getDiv();
    if (!div) return;
    await exportFigure(div, {
      format,
      title: "Residual Autocorrelation (ACF)",
      filename: `epilens_${payload.run.id.slice(0, 8)}_acf`,
      caption: "Lag autocorrelation r_k for lags 1 through 14 with threshold limits.",
      period: `Lags 1..14`,
      assumptions: `Limit: ±${formatNumber(acfLimit, 3)}`,
    });
  }

  return (
    <div className="space-y-6">
      {/* Diagnostics Status Header */}
      <div className="bg-surface rounded-2xl border border-border p-4 sm:p-5 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {status === "ok" ? (
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          ) : status === "warnings" ? (
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
              <AlertTriangle className="w-5 h-5" />
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200">
              <AlertCircle className="w-5 h-5" />
            </div>
          )}

          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-ink">
                Diagnostic Health: {status === "ok" ? "All Checks Passed" : status === "warnings" ? "Optimization Warnings Flagged" : "Numerical Convergence Problems"}
              </h4>
            </div>
            <p className="text-xs text-muted mt-0.5">
              Residual independence, lag autocorrelation thresholds, and likelihood profile curvature.
            </p>
          </div>
        </div>

        <div className="text-xs font-mono text-muted">
          {warnings.length === 0 ? "0 active warnings" : `${warnings.length} active warning(s)`}
        </div>
      </div>

      {/* Warnings List */}
      {warnings.length > 0 ? (
        <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2 text-xs text-amber-900">
          <span className="font-bold flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Convergence & Fit Warnings
          </span>
          <ul className="list-disc list-inside space-y-1 font-mono text-[11px]">
            {warnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="p-3 bg-surface rounded-xl border border-border flex items-center gap-2 text-xs text-muted">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>No convergence or optimization warnings flagged for this run.</span>
        </div>
      )}

      {/* 2-Column Grid: Residuals & ACF */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Residuals over time */}
        <ChartCard
          title="Daily Residuals Over Time"
          subtitle="Observed daily cases minus expected reported incidence (y − μ_d)"
          caption="Unbiased fits should scatter symmetrically around the zero line without persistent temporal clustering."
          onDownloadCsv={handleDownloadResidualsCsv}
          onExportPng={() => handleExportResiduals("png")}
          onExportSvg={() => handleExportResiduals("svg")}
          tableAlternative={<DataTable columns={tableColumns} data={residuals} defaultPageSize={10} />}
        >
          <PlotlyChart ref={chartRefResiduals} data={residualTraces} layout={residualLayout} height={320} />
        </ChartCard>

        {/* Lag Autocorrelation */}
        <ChartCard
          title="Residual Autocorrelation (ACF)"
          subtitle="Autocorrelation at lags 1 through 14 with ±2/√n significance limits"
          caption="Bars extending outside the horizontal dotted lines indicate unmodelled temporal correlation or reporting lags."
          onExportPng={() => handleExportAcf("png")}
          onExportSvg={() => handleExportAcf("svg")}
        >
          <PlotlyChart ref={chartRefAcf} data={acfTraces} layout={acfLayout} height={320} />
        </ChartCard>
      </div>

      {/* Pearson Residuals Distribution */}
      <ChartCard
        title="Pearson Residual Distribution"
        subtitle="Histogram of standardized residuals: (y − μ) / √(μ + μ²/k)"
        caption="Normalized dispersion distribution. Under the negative binomial likelihood, Pearson residuals cluster around mean 0."
      >
        <PlotlyChart data={pearsonTraces} layout={pearsonLayout} height={280} />
      </ChartCard>

      {/* Parameter Profile Plots */}
      {profileKeys.length > 0 && (
        <div className="bg-surface rounded-2xl border border-border p-5 shadow-2xs space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-ink">Likelihood Profile Scans</h4>
            <p className="text-xs text-muted mt-0.5">
              Negative log-likelihood profiles around fitted MLE parameter values. Horizontal line indicates the approximate 95% profile likelihood confidence region (min + 1.92).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {profileKeys.map((paramKey) => {
              const points = profiles[paramKey];
              if (!points || points.length === 0) return null;

              const xVals = points.map((p) => p.value);
              const yVals = points.map((p) => p.nll);
              const minNll = Math.min(...yVals);
              const threshold = minNll + 1.92;

              const profileTraces = [
                {
                  type: "scatter",
                  mode: "lines+markers",
                  name: `NLL profile (${paramKey})`,
                  x: xVals,
                  y: yVals,
                  line: { color: "#2563EB", width: 2 },
                  marker: { size: 5, color: "#2563EB" },
                  hovertemplate: `${paramKey}: %{x:.4f}<br>NLL: %{y:.2f}<extra></extra>`,
                },
              ];

              const profileLayout = {
                ...CHART_THEME.baseLayout,
                height: 240,
                xaxis: {
                  ...CHART_THEME.baseLayout.xaxis,
                  title: paramKey,
                },
                yaxis: {
                  ...CHART_THEME.baseLayout.yaxis,
                  title: "NLL",
                },
                shapes: [
                  {
                    type: "line",
                    xref: "paper",
                    yref: "y",
                    x0: 0,
                    x1: 1,
                    y0: threshold,
                    y1: threshold,
                    line: { color: "#DC2626", width: 1.5, dash: "dot" },
                  },
                ],
                annotations: [
                  {
                    xref: "paper",
                    yref: "y",
                    x: 1,
                    y: threshold,
                    xanchor: "right",
                    yanchor: "bottom",
                    text: "approx. 95% (min + 1.92)",
                    showarrow: false,
                    font: { size: 8, color: "#DC2626" },
                  },
                ],
              };

              return (
                <div key={paramKey} className="p-3 bg-surface-2 rounded-xl border border-border space-y-1">
                  <span className="text-xs font-mono font-bold text-ink uppercase">{paramKey}</span>
                  <PlotlyChart data={profileTraces} layout={profileLayout} height={220} />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
