/**
 * EpiLens Chart Theme Configuration
 * Strictly adheres to AGENTS.md §6 and PRD chart specification.
 */

export const CHART_THEME = {
  colors: {
    observed: "#0F172A", // ink
    sirM1: "#2563EB", // blue-600
    sirM2: "#0891B2", // cyan-600
    mean7Day: "#64748B", // slate-500
    sameWeekday: "#94A3B8", // slate-400
    intervalFill: "rgba(37, 99, 235, 0.12)",
    grid: "#E2E8F0",
    textMuted: "#64748B",
    textDark: "#0F172A",
    surface: "#FFFFFF",
  },
  lineStyles: {
    observed: { width: 2, dash: "solid" as const },
    sirM1: { width: 2.5, dash: "dash" as const },
    sirM2: { width: 2.5, dash: "dot" as const },
    mean7Day: { width: 2, dash: "dashdot" as const },
    sameWeekday: { width: 2, dash: "longdash" as const },
  },
  font: {
    family: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    size: 12,
    color: "#475569",
  },
  baseLayout: {
    autosize: true,
    margin: { t: 30, r: 20, b: 50, l: 60, pad: 4 },
    paper_bgcolor: "transparent",
    plot_bgcolor: "transparent",
    hovermode: "x unified" as const,
    hoverlabel: {
      bgcolor: "#0F172A",
      bordercolor: "#0F172A",
      font: { color: "#FFFFFF", family: "Inter, sans-serif", size: 12 },
    },
    xaxis: {
      showgrid: true,
      gridcolor: "#F1F5F9",
      linecolor: "#CBD5E1",
      tickfont: { color: "#64748B", size: 11 },
      titlefont: { color: "#0F172A", size: 12 },
      zeroline: false,
    },
    yaxis: {
      showgrid: true,
      gridcolor: "#F1F5F9",
      linecolor: "#CBD5E1",
      tickfont: { color: "#64748B", size: 11 },
      titlefont: { color: "#0F172A", size: 12 },
      zeroline: true,
      zerolinecolor: "#CBD5E1",
    },
    legend: {
      orientation: "h" as const,
      yanchor: "bottom" as const,
      y: 1.02,
      xanchor: "right" as const,
      x: 1,
      font: { size: 12, color: "#334155" },
    },
  },
};
