"use client";

import { Table, BarChart3, RotateCcw, Activity, Users, Info } from "lucide-react";
import React, { useId, useMemo, useState, useRef } from "react";
import { simulateIllustrativeSir } from "@/lib/illustrative-sir";

export function InteractiveSirPlayground() {
  const [r0, setR0] = useState<number>(2.2);
  const [duration, setDuration] = useState<number>(7);
  const [showTable, setShowTable] = useState<boolean>(false);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const svgContainerRef = useRef<HTMLDivElement>(null);

  const r0Id = useId();
  const durationId = useId();

  const handleReset = () => {
    setR0(2.2);
    setDuration(7);
  };

  // Run RK4 simulation
  const trajectory = useMemo(() => {
    return simulateIllustrativeSir({
      r0,
      infectiousDurationDays: duration,
      population: 1_000_000,
      initialInfected: 25,
      days: 90,
    });
  }, [r0, duration]);

  // Derived mathematical constants
  const gamma = useMemo(() => (1 / duration).toFixed(3), [duration]);
  const beta = useMemo(() => (r0 * (1 / duration)).toFixed(3), [r0, duration]);
  const herdThreshold = useMemo(() => {
    if (r0 <= 1) return 0;
    return Math.round((1 - 1 / r0) * 100);
  }, [r0]);

  // Compute peak value & day
  const { peakInfected, peakDay, totalRecovered } = useMemo(() => {
    let maxI = 0;
    let maxD = 0;
    for (const pt of trajectory) {
      if (pt.i > maxI) {
        maxI = pt.i;
        maxD = pt.day;
      }
    }
    const finalPt = trajectory[trajectory.length - 1];
    return {
      peakInfected: maxI,
      peakDay: maxD,
      totalRecovered: finalPt ? finalPt.r : 0,
    };
  }, [trajectory]);

  // Calculate SVG coordinates
  const svgWidth = 600;
  const svgHeight = 240;
  const maxVal = Math.max(120_000, peakInfected * 1.15);

  const { linePart, areaPart, peakX, peakY } = useMemo(() => {
    const points = trajectory.map((pt) => {
      const x = (pt.day / 90) * svgWidth;
      const y = svgHeight - (pt.i / maxVal) * (svgHeight - 35) - 15;
      return { x, y };
    });

    const pathString = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L ");
    const linePart = `M ${pathString}`;
    const areaPart = `${linePart} L ${svgWidth},${svgHeight} L 0,${svgHeight} Z`;

    const peakPt = points[peakDay] || points[0];

    return {
      linePart,
      areaPart,
      peakX: peakPt.x,
      peakY: peakPt.y,
    };
  }, [trajectory, peakDay, maxVal]);

  // Slider progress percentages for filled tracks
  const r0Pct = ((r0 - 1.0) / (4.0 - 1.0)) * 100;
  const durationPct = ((duration - 3) / (21 - 3)) * 100;

  // Mouse hover scrubbing across the graph
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!svgContainerRef.current) return;
    const rect = svgContainerRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const day = Math.min(90, Math.max(0, Math.round((clientX / rect.width) * 90)));
    setHoverIndex(day);
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  const activeHoverPoint = hoverIndex !== null ? trajectory[hoverIndex] : null;
  const hoverX = hoverIndex !== null ? (hoverIndex / 90) * svgWidth : null;
  const hoverY = activeHoverPoint ? svgHeight - (activeHoverPoint.i / maxVal) * (svgHeight - 35) - 15 : null;

  return (
    <section id="playground" className="py-20 md:py-28 bg-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60 mb-3 shadow-2xs">
            <Activity className="w-3.5 h-3.5 text-blue-600" />
            <span>Mathematical Playground</span>
          </div>
          <h3 className="text-3xl sm:text-4xl font-extrabold text-ink tracking-tight">
            Interactive RK4 SIR Simulation
          </h3>
          <p className="text-sm sm:text-base text-muted mt-3 leading-relaxed">
            Adjust the transmission speed (R<sub>0</sub>) and recovery duration to inspect continuous-time compartmental epidemic curves in real time.
          </p>
        </div>

        {/* Main Playground Card */}
        <div className="bg-surface-2 border border-border rounded-2xl p-6 lg:p-8 shadow-xs">
          {/* Controls Header */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start pb-6 border-b border-border">
            {/* R0 Slider Block */}
            <div className="md:col-span-5 space-y-3">
              <div className="flex items-center justify-between">
                <label htmlFor={r0Id} className="text-xs font-bold text-ink flex items-center gap-1.5">
                  <span>Basic Reproduction Number (R<sub>0</sub>)</span>
                </label>

                {/* Fine-tuning +/- buttons and badge */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setR0((prev) => Math.max(1.0, parseFloat((prev - 0.1).toFixed(1))))}
                    disabled={r0 <= 1.0}
                    aria-label="Decrease R0"
                    className="w-6 h-6 rounded-md bg-white border border-border text-slate-700 hover:text-ink hover:bg-slate-100 flex items-center justify-center text-xs font-bold transition disabled:opacity-30 cursor-pointer shadow-2xs"
                  >
                    &minus;
                  </button>
                  <span className="font-mono text-sm font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-lg min-w-[3.5rem] text-center shadow-2xs">
                    {r0.toFixed(1)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setR0((prev) => Math.min(4.0, parseFloat((prev + 0.1).toFixed(1))))}
                    disabled={r0 >= 4.0}
                    aria-label="Increase R0"
                    className="w-6 h-6 rounded-md bg-white border border-border text-slate-700 hover:text-ink hover:bg-slate-100 flex items-center justify-center text-xs font-bold transition disabled:opacity-30 cursor-pointer shadow-2xs"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Slider Track with Custom Filled Styling */}
              <input
                id={r0Id}
                type="range"
                min="1.0"
                max="4.0"
                step="0.1"
                value={r0}
                onChange={(e) => setR0(parseFloat(e.target.value))}
                aria-label="Basic reproduction number R0"
                className="w-full h-2.5 rounded-lg appearance-none cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-blue-600/40 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:hover:scale-115 [&::-webkit-slider-thumb]:transition-transform"
                style={{
                  background: `linear-gradient(to right, #2563EB ${r0Pct}%, #CBD5E1 ${r0Pct}%)`,
                }}
              />

              {/* Quick Presets for R0 */}
              <div className="flex items-center justify-between gap-1 pt-0.5">
                <span className="text-[10px] text-muted font-mono">Presets:</span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setR0(1.2)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono transition cursor-pointer ${
                      r0 === 1.2
                        ? "bg-blue-600 text-white font-bold"
                        : "bg-white hover:bg-slate-100 text-slate-600 border border-border"
                    }`}
                  >
                    1.2 (Subdued)
                  </button>
                  <button
                    type="button"
                    onClick={() => setR0(2.2)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono transition cursor-pointer ${
                      r0 === 2.2
                        ? "bg-blue-600 text-white font-bold"
                        : "bg-white hover:bg-slate-100 text-slate-600 border border-border"
                    }`}
                  >
                    2.2 (Baseline)
                  </button>
                  <button
                    type="button"
                    onClick={() => setR0(3.2)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono transition cursor-pointer ${
                      r0 === 3.2
                        ? "bg-blue-600 text-white font-bold"
                        : "bg-white hover:bg-slate-100 text-slate-600 border border-border"
                    }`}
                  >
                    3.2 (Surge)
                  </button>
                </div>
              </div>
            </div>

            {/* Infectious Duration Slider Block */}
            <div className="md:col-span-5 space-y-3">
              <div className="flex items-center justify-between">
                <label htmlFor={durationId} className="text-xs font-bold text-ink flex items-center gap-1.5">
                  <span>Infectious Duration (1/&gamma;)</span>
                </label>

                {/* Fine-tuning +/- buttons and badge */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDuration((prev) => Math.max(3, prev - 1))}
                    disabled={duration <= 3}
                    aria-label="Decrease duration"
                    className="w-6 h-6 rounded-md bg-white border border-border text-slate-700 hover:text-ink hover:bg-slate-100 flex items-center justify-center text-xs font-bold transition disabled:opacity-30 cursor-pointer shadow-2xs"
                  >
                    &minus;
                  </button>
                  <span className="font-mono text-sm font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-lg min-w-[3.5rem] text-center shadow-2xs">
                    {duration} d
                  </span>
                  <button
                    type="button"
                    onClick={() => setDuration((prev) => Math.min(21, prev + 1))}
                    disabled={duration >= 21}
                    aria-label="Increase duration"
                    className="w-6 h-6 rounded-md bg-white border border-border text-slate-700 hover:text-ink hover:bg-slate-100 flex items-center justify-center text-xs font-bold transition disabled:opacity-30 cursor-pointer shadow-2xs"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Slider Track with Custom Filled Styling */}
              <input
                id={durationId}
                type="range"
                min="3"
                max="21"
                step="1"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value, 10))}
                aria-label="Infectious duration in days"
                className="w-full h-2.5 rounded-lg appearance-none cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-blue-600/40 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:hover:scale-115 [&::-webkit-slider-thumb]:transition-transform"
                style={{
                  background: `linear-gradient(to right, #2563EB ${durationPct}%, #CBD5E1 ${durationPct}%)`,
                }}
              />

              {/* Quick Presets for Duration */}
              <div className="flex items-center justify-between gap-1 pt-0.5">
                <span className="text-[10px] text-muted font-mono">Presets:</span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDuration(5)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono transition cursor-pointer ${
                      duration === 5
                        ? "bg-blue-600 text-white font-bold"
                        : "bg-white hover:bg-slate-100 text-slate-600 border border-border"
                    }`}
                  >
                    5 days
                  </button>
                  <button
                    type="button"
                    onClick={() => setDuration(7)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono transition cursor-pointer ${
                      duration === 7
                        ? "bg-blue-600 text-white font-bold"
                        : "bg-white hover:bg-slate-100 text-slate-600 border border-border"
                    }`}
                  >
                    7 days (WHO)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDuration(14)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono transition cursor-pointer ${
                      duration === 14
                        ? "bg-blue-600 text-white font-bold"
                        : "bg-white hover:bg-slate-100 text-slate-600 border border-border"
                    }`}
                  >
                    14 days
                  </button>
                </div>
              </div>
            </div>

            {/* Action Buttons & Math Pills */}
            <div className="md:col-span-2 flex flex-col justify-between items-end gap-3 h-full">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleReset}
                  title="Reset simulation defaults"
                  className="p-2 text-slate-600 hover:text-ink hover:bg-white rounded-xl transition border border-border shadow-2xs cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowTable(!showTable)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-border rounded-xl shadow-2xs transition cursor-pointer"
                >
                  {showTable ? (
                    <>
                      <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
                      <span>Chart</span>
                    </>
                  ) : (
                    <>
                      <Table className="w-3.5 h-3.5 text-slate-500" />
                      <span>Table</span>
                    </>
                  )}
                </button>
              </div>

              {/* Real-time Math parameter chip */}
              <div className="text-[11px] font-mono bg-white px-2.5 py-1.5 rounded-lg border border-border text-slate-600 text-right space-y-0.5 w-full">
                <div>&beta; = <span className="font-bold text-ink">{beta}</span></div>
                <div>&gamma; = <span className="font-bold text-ink">{gamma}</span></div>
              </div>
            </div>
          </div>

          {/* Simulation Output Area */}
          <div className="pt-6">
            {/* Top Stat Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div className="bg-white p-3 rounded-xl border border-border shadow-2xs flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-muted font-medium">Peak Active Infectious</div>
                  <div className="text-lg font-extrabold text-blue-600 font-mono">
                    {peakInfected.toLocaleString("en-IN")}
                  </div>
                </div>
                <div className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-mono font-bold">
                  Day {peakDay}
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-border shadow-2xs flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-muted font-medium">Herd Immunity Threshold</div>
                  <div className="text-lg font-extrabold text-ink font-mono">
                    {herdThreshold}%
                  </div>
                </div>
                <div className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-mono">
                  1 &minus; 1/R<sub>0</sub>
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-border shadow-2xs flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-muted font-medium">Total Cumulative Cases</div>
                  <div className="text-lg font-extrabold text-emerald-700 font-mono">
                    {totalRecovered.toLocaleString("en-IN")}
                  </div>
                </div>
                <div className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-xs font-mono font-semibold">
                  {((totalRecovered / 1_000_000) * 100).toFixed(1)}% Pop
                </div>
              </div>
            </div>

            {/* Display: Chart vs Table */}
            {showTable ? (
              <div className="max-h-[320px] overflow-y-auto border border-border rounded-xl bg-surface shadow-2xs">
                <table className="w-full text-xs text-left font-mono">
                  <thead className="bg-slate-100 text-slate-700 uppercase sticky top-0 border-b border-border">
                    <tr>
                      <th className="px-4 py-2.5">Day</th>
                      <th className="px-4 py-2.5">Susceptible (S)</th>
                      <th className="px-4 py-2.5">Infectious (I)</th>
                      <th className="px-4 py-2.5">Removed (R)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {trajectory.filter((_, idx) => idx % 5 === 0).map((pt) => (
                      <tr key={pt.day} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-2 font-semibold text-slate-700">Day {pt.day}</td>
                        <td className="px-4 py-2 text-slate-600">{pt.s.toLocaleString("en-IN")}</td>
                        <td className="px-4 py-2 text-blue-600 font-bold">
                          {pt.i.toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-2 text-emerald-700">{pt.r.toLocaleString("en-IN")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div
                ref={svgContainerRef}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                className="relative w-full h-[280px] bg-white rounded-2xl border border-border p-4 sm:p-5 flex flex-col justify-between shadow-2xs overflow-hidden select-none cursor-crosshair group"
              >
                {/* Horizontal Reference Grid Lines */}
                <div className="absolute inset-x-5 top-5 bottom-10 flex flex-col justify-between pointer-events-none">
                  <div className="border-b border-dashed border-slate-100 w-full flex items-center justify-between">
                    <span className="text-[9px] font-mono text-slate-400">
                      {Math.round(maxVal).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="border-b border-dashed border-slate-100 w-full flex items-center justify-between">
                    <span className="text-[9px] font-mono text-slate-400">
                      {Math.round(maxVal * 0.66).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="border-b border-dashed border-slate-100 w-full flex items-center justify-between">
                    <span className="text-[9px] font-mono text-slate-400">
                      {Math.round(maxVal * 0.33).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="border-b border-slate-200 w-full flex items-center justify-between">
                    <span className="text-[9px] font-mono text-slate-400">0</span>
                  </div>
                </div>

                {/* SVG Visual Display */}
                <svg
                  className="w-full h-full overflow-visible relative z-10"
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="themeCurveGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563EB" stopOpacity="0.4" />
                      <stop offset="60%" stopColor="#0891B2" stopOpacity="0.12" />
                      <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
                    </linearGradient>
                    <filter id="curveGlow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#2563EB" floodOpacity="0.3" />
                    </filter>
                  </defs>

                  {/* Translucent Theme Shaded Area */}
                  <path d={areaPart} fill="url(#themeCurveGrad)" />

                  {/* Solid Hero Infectious Curve */}
                  <path
                    d={linePart}
                    fill="none"
                    stroke="#2563EB"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#curveGlow)"
                  />

                  {/* Peak Marker Reference Line & Dot */}
                  <line
                    x1={peakX}
                    y1={peakY}
                    x2={peakX}
                    y2={svgHeight}
                    stroke="#93C5FD"
                    strokeWidth="1.5"
                    strokeDasharray="3,3"
                  />
                  <circle
                    cx={peakX}
                    cy={peakY}
                    r="5"
                    fill="#2563EB"
                    stroke="#FFFFFF"
                    strokeWidth="2.5"
                  />
                  <circle
                    cx={peakX}
                    cy={peakY}
                    r="8"
                    fill="none"
                    stroke="#60A5FA"
                    strokeWidth="1.5"
                    className="animate-ping opacity-75"
                  />

                  {/* Hover Crosshair */}
                  {hoverX !== null && hoverY !== null && (
                    <>
                      <line
                        x1={hoverX}
                        y1={0}
                        x2={hoverX}
                        y2={svgHeight}
                        stroke="#0F172A"
                        strokeWidth="1.2"
                        strokeDasharray="2,2"
                        strokeOpacity="0.7"
                      />
                      <circle
                        cx={hoverX}
                        cy={hoverY}
                        r="5"
                        fill="#0F172A"
                        stroke="#FFFFFF"
                        strokeWidth="2"
                      />
                    </>
                  )}
                </svg>

                {/* Floating Peak Badge */}
                <div
                  className="absolute pointer-events-none z-20 transition-all duration-150"
                  style={{
                    left: `${Math.min(82, Math.max(18, (peakX / svgWidth) * 100))}%`,
                    top: `${Math.max(12, (peakY / svgHeight) * 100 - 15)}%`,
                    transform: "translate(-50%, -100%)",
                  }}
                >
                  <div className="px-2.5 py-1 rounded-lg bg-navy-900/95 text-white text-[11px] font-mono shadow-md border border-slate-700 backdrop-blur-xs flex items-center gap-1.5 whitespace-nowrap">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                    <span>Peak: Day {peakDay} &middot; {peakInfected.toLocaleString("en-IN")}</span>
                  </div>
                </div>

                {/* Floating Interactive Hover Tooltip */}
                {activeHoverPoint && hoverX !== null && (
                  <div
                    className="absolute pointer-events-none z-30 transition-all duration-75"
                    style={{
                      left: `${(hoverX / svgWidth) * 100}%`,
                      top: "20px",
                      transform: hoverX > svgWidth * 0.7 ? "translateX(-105%)" : "translateX(10px)",
                    }}
                  >
                    <div className="p-2.5 rounded-xl bg-white/95 border border-slate-200 text-ink shadow-lg backdrop-blur-md text-[11px] font-mono space-y-1 min-w-[140px]">
                      <div className="font-bold text-slate-800 pb-1 border-b border-slate-100 flex items-center justify-between">
                        <span>Day {activeHoverPoint.day}</span>
                        <span className="text-[10px] text-muted">90d sim</span>
                      </div>
                      <div className="text-blue-600 font-semibold flex items-center justify-between">
                        <span>Infectious:</span>
                        <span>{activeHoverPoint.i.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="text-slate-600 flex items-center justify-between">
                        <span>Susceptible:</span>
                        <span>{activeHoverPoint.s.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="text-emerald-700 flex items-center justify-between">
                        <span>Recovered:</span>
                        <span>{activeHoverPoint.r.toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Bottom X-Axis Guide */}
                <div className="flex justify-between items-center text-[11px] text-muted font-mono pt-2 border-t border-slate-100 relative z-10">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3 text-slate-400" />
                    <span>Day 0 (Initial: 25)</span>
                  </span>
                  <span>Day 45 (Midpoint)</span>
                  <span>Day 90 (Horizon)</span>
                </div>
              </div>
            )}

            {/* Bottom Honesty Label */}
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted">
              <div className="flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>
                  Uses 4th-order Runge-Kutta numerical integration (dt = 0.5d) on a closed 1M population.
                </span>
              </div>
              <div className="px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-semibold shrink-0">
                Illustrative simulation &mdash; not Punjab data
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
