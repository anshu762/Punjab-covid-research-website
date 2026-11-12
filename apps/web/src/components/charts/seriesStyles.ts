/**
 * EpiLens Chart Series Styles
 * Strictly adhering to AGENTS.md §6 and PRD specifications.
 * Color, dash, marker, and legend names are fixed across the entire application.
 */

export const SERIES_STYLES = {
  observed: {
    name: "Observed daily cases",
    color: "#0F172A", // ink
    line: { color: "#0F172A", width: 2, dash: "solid" as const },
    marker: { color: "#0F172A", size: 5, symbol: "circle" },
    bar: { color: "#0F172A", opacity: 0.85 },
  },
  m1: {
    name: "SIR constant (M1)",
    color: "#2563EB", // blue-600
    line: { color: "#2563EB", width: 2.5, dash: "dash" as const },
    marker: { color: "#2563EB", size: 6, symbol: "diamond" },
  },
  m2: {
    name: "SIR change-point (M2)",
    color: "#0891B2", // cyan-600
    line: { color: "#0891B2", width: 2.5, dash: "dot" as const },
    marker: { color: "#0891B2", size: 6, symbol: "square" },
  },
  baselineMean: {
    name: "7-day mean baseline",
    color: "#64748B", // slate-500
    line: { color: "#64748B", width: 2, dash: "dashdot" as const },
    marker: { color: "#64748B", size: 5, symbol: "triangle-up" },
  },
  baselineWeekday: {
    name: "Same-weekday baseline",
    color: "#94A3B8", // slate-400
    line: { color: "#94A3B8", width: 2, dash: "longdash" as const },
    marker: { color: "#94A3B8", size: 5, symbol: "cross" },
  },
  interval: (colorKey: "blue" | "cyan" | "slate" = "blue", name = "95% bootstrap interval") => {
    const colors = {
      blue: "rgba(37, 99, 235, 0.16)",
      cyan: "rgba(8, 145, 178, 0.16)",
      slate: "rgba(100, 116, 139, 0.16)",
    };
    return {
      name,
      fill: "tonexty" as const,
      fillcolor: colors[colorKey],
      line: { color: "transparent", width: 0 },
      showlegend: true,
    };
  },
};
