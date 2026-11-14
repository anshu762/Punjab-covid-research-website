"use client";

import React, { useState } from "react";
import type { QualityFlag } from "@epilens/shared";

interface CoverageObservation {
  date: string;
  quality_flag: QualityFlag;
  new_confirmed_raw?: number | null;
  new_confirmed_analysis?: number | null;
}

interface CoverageStripProps {
  observations: CoverageObservation[];
  className?: string;
}

const FLAG_CONFIG: Record<
  QualityFlag,
  { label: string; color: string; border: string; bgClass: string }
> = {
  OK: {
    label: "Valid",
    color: "#10B981",
    border: "#059669",
    bgClass: "bg-emerald-500",
  },
  CORRECTED: {
    label: "Adjusted",
    color: "#3B82F6",
    border: "#2563EB",
    bgClass: "bg-blue-500",
  },
  CORRECTION_DAY: {
    label: "Correction Day (0)",
    color: "#F59E0B",
    border: "#D97706",
    bgClass: "bg-amber-500",
  },
  MISSING: {
    label: "Missing / Blank",
    color: "#EF4444",
    border: "#DC2626",
    bgClass: "bg-red-500",
  },
  DUPLICATE: {
    label: "Duplicate Date",
    color: "#E11D48",
    border: "#BE123C",
    bgClass: "bg-rose-600",
  },
  UNRESOLVED_CORRECTION: {
    label: "Unresolved Negative",
    color: "#9333EA",
    border: "#7E22CE",
    bgClass: "bg-purple-600",
  },
};

export function CoverageStrip({ observations, className = "" }: CoverageStripProps) {
  const [hoveredObs, setHoveredObs] = useState<CoverageObservation | null>(null);

  if (!observations || observations.length === 0) {
    return (
      <div className="p-3 text-xs text-muted bg-surface-2 rounded-lg border border-border text-center">
        No observation coverage data available
      </div>
    );
  }

  // Count flags for summary metrics
  const flagCounts: Partial<Record<QualityFlag, number>> = {};
  for (const o of observations) {
    flagCounts[o.quality_flag] = (flagCounts[o.quality_flag] || 0) + 1;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Strip bar */}
      <div className="relative">
        <div
          role="img"
          aria-label={`Data coverage strip for ${observations.length} consecutive days`}
          className="flex w-full h-7 rounded-lg overflow-hidden border border-border shadow-2xs bg-surface-2 p-0.5 gap-px"
        >
          {observations.map((obs) => {
            const config = FLAG_CONFIG[obs.quality_flag] || FLAG_CONFIG.OK;
            return (
              <div
                key={obs.date}
                onMouseEnter={() => setHoveredObs(obs)}
                onMouseLeave={() => setHoveredObs(null)}
                className={`flex-1 h-full cursor-pointer transition-transform hover:scale-y-125 hover:z-10 ${config.bgClass}`}
                title={`${obs.date}: ${config.label} (Cases: ${obs.new_confirmed_raw ?? "—"})`}
              />
            );
          })}
        </div>

        {/* Hover detail tooltip */}
        {hoveredObs && (
          <div className="mt-1.5 p-2 bg-navy-900 text-white text-xs rounded-md shadow-md flex flex-wrap items-center justify-between gap-2 animate-in fade-in duration-100">
            <span className="font-mono font-medium">{hoveredObs.date}</span>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <span className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor:
                      FLAG_CONFIG[hoveredObs.quality_flag]?.color || "#10B981",
                  }}
                />
                <span>{FLAG_CONFIG[hoveredObs.quality_flag]?.label}</span>
              </span>
              <span className="text-slate-300">
                Raw:{" "}
                <span className="font-mono text-white font-semibold">
                  {hoveredObs.new_confirmed_raw !== null &&
                  hoveredObs.new_confirmed_raw !== undefined
                    ? hoveredObs.new_confirmed_raw
                    : "Missing"}
                </span>
              </span>
              <span className="text-slate-300">
                Analysis:{" "}
                <span className="font-mono text-white font-semibold">
                  {hoveredObs.new_confirmed_analysis !== null &&
                  hoveredObs.new_confirmed_analysis !== undefined
                    ? hoveredObs.new_confirmed_analysis
                    : "None"}
                </span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted pt-1">
        {(Object.keys(FLAG_CONFIG) as QualityFlag[]).map((flag) => {
          const config = FLAG_CONFIG[flag];
          const count = flagCounts[flag] || 0;
          return (
            <div key={flag} className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-sm"
                style={{ backgroundColor: config.color }}
              />
              <span>{config.label}</span>
              <span className="text-slate-400 font-mono">({count})</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
