"use client";

import { Table, BarChart3, RotateCcw } from "lucide-react";
import React, { useId, useMemo, useState } from "react";
import { simulateIllustrativeSir } from "@/lib/illustrative-sir";

export function InteractiveSirPlayground() {
  const [r0, setR0] = useState<number>(2.2);
  const [duration, setDuration] = useState<number>(7);
  const [showTable, setShowTable] = useState<boolean>(false);

  const r0Id = useId();
  const durationId = useId();

  const handleReset = () => {
    setR0(2.2);
    setDuration(7);
  };

  const trajectory = useMemo(() => {
    return simulateIllustrativeSir({
      r0,
      infectiousDurationDays: duration,
      population: 1_000_000,
      initialInfected: 25,
      days: 90,
    });
  }, [r0, duration]);

  // Compute peak value & day
  const { peakInfected, peakDay } = useMemo(() => {
    let maxI = 0;
    let maxD = 0;
    for (const pt of trajectory) {
      if (pt.i > maxI) {
        maxI = pt.i;
        maxD = pt.day;
      }
    }
    return { peakInfected: maxI, peakDay: maxD };
  }, [trajectory]);

  // Generate SVG path for infectious curve (I)
  const svgPathD = useMemo(() => {
    const width = 600;
    const height = 240;
    const maxVal = Math.max(150_000, peakInfected * 1.15);

    const points = trajectory.map((pt) => {
      const x = (pt.day / 90) * width;
      const y = height - (pt.i / maxVal) * (height - 20) - 10;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    const linePart = `M ${points.join(" L ")}`;
    const areaPart = `${linePart} L ${width},${height} L 0,${height} Z`;

    return { linePart, areaPart };
  }, [trajectory, peakInfected]);

  return (
    <section id="playground" className="py-20 md:py-28 bg-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-2">
            Mathematical Playground
          </h2>
          <h3 className="text-3xl sm:text-4xl font-extrabold text-ink tracking-tight">
            Interactive RK4 SIR Simulation
          </h3>
          <p className="text-sm sm:text-base text-muted mt-3">
            Explore continuous-time Kermack–McKendrick transmission dynamics. Adjust basic reproduction number (R_0) and duration to observe epidemic velocity.
          </p>
        </div>

        <div className="bg-surface-2 border border-border rounded-[14px] p-6 lg:p-8 shadow-xs">
          {/* Controls Header */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end pb-6 border-b border-border">
            {/* R0 Slider */}
            <div className="md:col-span-5 space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor={r0Id} className="text-xs font-semibold text-ink">
                  Basic Reproduction Number (R<sub>0</sub>):
                </label>
                <span className="font-mono text-sm font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  {r0.toFixed(1)}
                </span>
              </div>
              <input
                id={r0Id}
                type="range"
                min="1.0"
                max="4.0"
                step="0.1"
                value={r0}
                onChange={(e) => setR0(parseFloat(e.target.value))}
                aria-label="Basic reproduction number R0"
                className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-muted font-mono">
                <span>1.0 (Endemic / Flat)</span>
                <span>4.0 (Rapid Surge)</span>
              </div>
            </div>

            {/* Infectious Duration Slider */}
            <div className="md:col-span-5 space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor={durationId} className="text-xs font-semibold text-ink">
                  Infectious Duration (1/&gamma;):
                </label>
                <span className="font-mono text-sm font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  {duration} days
                </span>
              </div>
              <input
                id={durationId}
                type="range"
                min="3"
                max="21"
                step="1"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value, 10))}
                aria-label="Infectious duration in days"
                className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-muted font-mono">
                <span>3 days (&gamma; = 0.33)</span>
                <span>21 days (&gamma; = 0.048)</span>
              </div>
            </div>

            {/* Toolbar Buttons */}
            <div className="md:col-span-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleReset}
                title="Reset simulation defaults"
                className="p-2 text-slate-600 hover:text-ink hover:bg-slate-200 rounded-lg transition-colors border border-border"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setShowTable(!showTable)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-surface hover:bg-slate-50 border border-border rounded-lg shadow-2xs transition-colors"
              >
                {showTable ? (
                  <>
                    <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
                    <span>View Chart</span>
                  </>
                ) : (
                  <>
                    <Table className="w-3.5 h-3.5 text-slate-500" />
                    <span>View Table</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Simulation Output Area */}
          <div className="pt-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-4 text-xs font-mono">
                <div>
                  <span className="text-muted">Peak Infectious: </span>
                  <span className="font-bold text-ink">
                    {peakInfected.toLocaleString("en-IN")} persons
                  </span>
                </div>
                <div>
                  <span className="text-muted">Peak Day: </span>
                  <span className="font-bold text-blue-600">Day {peakDay}</span>
                </div>
              </div>
              <div className="px-2.5 py-1 rounded bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold">
                Illustrative simulation — not Punjab data
              </div>
            </div>

            {showTable ? (
              <div className="max-h-[300px] overflow-y-auto border border-border rounded-lg bg-surface">
                <table className="w-full text-xs text-left font-mono">
                  <thead className="bg-slate-100 text-slate-700 uppercase sticky top-0 border-b border-border">
                    <tr>
                      <th className="px-4 py-2">Day</th>
                      <th className="px-4 py-2">Susceptible (S)</th>
                      <th className="px-4 py-2">Infectious (I)</th>
                      <th className="px-4 py-2">Removed (R)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {trajectory.filter((_, idx) => idx % 5 === 0).map((pt) => (
                      <tr key={pt.day} className="hover:bg-slate-50">
                        <td className="px-4 py-1.5">{pt.day}</td>
                        <td className="px-4 py-1.5">{pt.s.toLocaleString("en-IN")}</td>
                        <td className="px-4 py-1.5 text-blue-600 font-semibold">
                          {pt.i.toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-1.5">{pt.r.toLocaleString("en-IN")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="relative w-full h-[260px] bg-white rounded-xl border border-border p-4 flex flex-col justify-between">
                <svg
                  className="w-full h-full overflow-visible"
                  viewBox="0 0 600 240"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563EB" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#2563EB" stopOpacity="0.02" />
                    </linearGradient>
                  </defs>

                  {/* Shaded Area */}
                  <path d={svgPathD.areaPart} fill="url(#curveGradient)" />

                  {/* Solid Curve Line */}
                  <path
                    d={svgPathD.linePart}
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>

                <div className="flex justify-between items-center text-[10px] text-muted font-mono pt-2 border-t border-slate-100">
                  <span>Day 0 (Initial infections = 25)</span>
                  <span>Day 45</span>
                  <span>Day 90 Horizon</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
