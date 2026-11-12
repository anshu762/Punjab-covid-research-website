"use client";

import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from "react";
import { CHART_THEME } from "./chartTheme";

export interface PlotlyChartRef {
  resetZoom: () => void;
  relayout: (update: Record<string, unknown>) => void;
  getDiv: () => HTMLDivElement | null;
  getPlotlyInstance: () => any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

interface PlotlyChartProps {
  data: unknown[];
  layout?: Record<string, unknown>;
  config?: Record<string, unknown>;
  className?: string;
  height?: number;
}

export const PlotlyChart = forwardRef<PlotlyChartRef, PlotlyChartProps>(function PlotlyChart(
  { data, layout, config, className = "", height = 380 },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [plotlyInstance, setPlotlyInstance] = useState<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [isLoading, setIsLoading] = useState(true);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    resetZoom: () => {
      if (plotlyInstance && containerRef.current) {
        plotlyInstance.relayout(containerRef.current, {
          "xaxis.autorange": true,
          "yaxis.autorange": true,
        });
      }
    },
    relayout: (update: Record<string, unknown>) => {
      if (plotlyInstance && containerRef.current) {
        plotlyInstance.relayout(containerRef.current, update);
      }
    },
    getDiv: () => containerRef.current,
    getPlotlyInstance: () => plotlyInstance,
  }));

  // Dynamically load Plotly in browser
  useEffect(() => {
    let mounted = true;

    async function loadPlotly() {
      try {
        const Plotly = await import("plotly.js-basic-dist-min");
        if (mounted) {
          setPlotlyInstance(Plotly.default || Plotly);
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Failed to dynamically load Plotly", err);
      }
    }

    loadPlotly();

    return () => {
      mounted = false;
    };
  }, []);

  // Render or update chart
  useEffect(() => {
    if (!plotlyInstance || !containerRef.current) return;

    const el = containerRef.current;

    const mergedLayout = {
      ...CHART_THEME.baseLayout,
      height,
      ...layout,
    };

    const mergedConfig = {
      responsive: true,
      displayModeBar: false, // We use our custom accessible toolbar
      scrollZoom: false,
      ...config,
    };

    plotlyInstance.react(el, data, mergedLayout, mergedConfig);

    const resizeObserver = new ResizeObserver(() => {
      if (el) {
        plotlyInstance.Plots.resize(el);
      }
    });

    resizeObserver.observe(el);

    return () => {
      resizeObserver.disconnect();
    };
  }, [plotlyInstance, data, layout, config, height]);

  // Purge on unmount
  useEffect(() => {
    const el = containerRef.current;
    return () => {
      if (el && plotlyInstance) {
        plotlyInstance.purge(el);
      }
    };
  }, [plotlyInstance]);

  return (
    <div className={`relative w-full ${className}`} style={{ minHeight: `${height}px` }}>
      {isLoading && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-surface/50 rounded-xl animate-pulse"
          style={{ minHeight: `${height}px` }}
        >
          <div className="flex flex-col items-center gap-2 text-muted text-xs">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span>Loading visualization...</span>
          </div>
        </div>
      )}
      <div ref={containerRef} className="w-full" style={{ minHeight: `${height}px` }} />
    </div>
  );
});
