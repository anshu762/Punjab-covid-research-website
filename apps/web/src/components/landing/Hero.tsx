"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, CheckCircle2, Shield, Sparkles } from "lucide-react";
import React, { useState } from "react";
import { startDemoSession } from "@/actions/auth";
import { useAuthModal } from "@/components/auth/AuthModalProvider";

export function LandingHero() {
  const { openAuthModal } = useAuthModal();
  const shouldReduceMotion = useReducedMotion();
  const [demoLoading, setDemoLoading] = useState(false);

  const handleStartDemo = async () => {
    setDemoLoading(true);
    try {
      await startDemoSession();
    } catch {
      setDemoLoading(false);
    }
  };

  // Bar heights for the mock product curve
  const bars = [14, 22, 34, 45, 62, 78, 92, 110, 118, 126, 120, 108, 90, 72, 58, 44];

  return (
    <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px]">
      {/* Soft gradient ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-blue-100/50 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Copy & Actions */}
          <motion.div
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-6 space-y-6 text-center lg:text-left"
          >
            {/* Tag Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              Private research workbench &middot; Punjab, India
            </div>

            {/* H1 */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-ink tracking-tight leading-[1.12]">
              Model Punjab&apos;s COVID-19 epidemic. <span className="text-blue-600">Honestly.</span>
            </h1>

            {/* Sub-copy */}
            <p className="text-base sm:text-lg text-muted max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal">
              Fit SIR models, validate 7-day forecasts against transparent baselines, and explore hypothetical transmission scenarios — with every mathematical assumption on the table.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
              <button
                type="button"
                disabled={demoLoading}
                onClick={handleStartDemo}
                className="w-full sm:w-auto px-6 py-3.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-75 rounded-xl shadow-md transition-all hover:shadow-lg focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 flex items-center justify-center gap-2 cursor-pointer"
              >
                {demoLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Preparing Demo Environment...</span>
                  </>
                ) : (
                  <>
                    <span>Try the demo</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => openAuthModal("signin")}
                className="w-full sm:w-auto px-6 py-3.5 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-border rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                Sign In
              </button>
            </div>

            {/* Trust Chips */}
            <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs text-muted">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <span>Observed &ne; simulated</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-emerald-600" />
                <span>Reproducible exports</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>Pre-registered evaluation rules</span>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Animated Product Window Mockup */}
          <motion.div
            initial={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-6 relative"
          >
            {/* Outer Browser Frame */}
            <div className="relative rounded-[14px] bg-surface border border-slate-300 shadow-2xl overflow-hidden">
              {/* Window Header */}
              <div className="h-10 px-4 bg-slate-100 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                </div>
                <div className="px-3 py-0.5 rounded-md bg-white border border-slate-200 text-[11px] font-mono text-slate-500 shadow-2xs">
                  epilens.local/results/run_pb_m1
                </div>
                <div className="w-10" />
              </div>

              {/* Chart Mock Interior */}
              <div className="p-6 bg-white relative min-h-[320px]">
                {/* Micro Toolbar */}
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                  <div className="text-xs font-semibold text-ink">
                    M1 Constant SIR vs Reported Cases
                  </div>
                  <div className="text-[11px] font-mono text-muted bg-slate-100 px-2 py-0.5 rounded">
                    R_0 = 1.42 &middot; 7d MAE = 34.2
                  </div>
                </div>

                {/* SVG Visual Display */}
                <div className="relative h-48 w-full flex items-end">
                  {/* Confidence Interval Shaded Area */}
                  <motion.svg
                    className="absolute inset-0 w-full h-full"
                    viewBox="0 0 320 180"
                    preserveAspectRatio="none"
                  >
                    {/* Horizontal Threshold Reference Line */}
                    <line
                      x1="10"
                      y1="110"
                      x2="310"
                      y2="110"
                      stroke="#94a3b8"
                      strokeWidth="1"
                      strokeDasharray="4,3"
                      strokeOpacity="0.5"
                    />

                    <motion.path
                      d="M 10 160 Q 90 120 150 50 Q 210 30 260 80 Q 300 120 310 140 L 310 165 Q 260 110 210 70 Q 150 80 90 140 Z"
                      fill="#93c5fd"
                      fillOpacity={0.25}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 1, delay: 0.5 }}
                    />

                    {/* Dashed Model Line */}
                    <motion.path
                      d="M 10 160 Q 90 130 150 60 Q 210 40 260 90 Q 300 130 310 150"
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth="2.5"
                      strokeDasharray="5,4"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1.2, delay: 0.3, ease: "easeInOut" }}
                    />
                  </motion.svg>

                  {/* Staggered Observed Incidence Bars */}
                  <div className="relative z-10 w-full h-full flex items-end justify-between px-2">
                    {bars.map((h, idx) => (
                      <motion.div
                        key={idx}
                        className="w-2.5 sm:w-3 bg-slate-900 rounded-t-xs hover:bg-blue-600 transition-colors"
                        style={{ height: `${(h / 140) * 100}%` }}
                        initial={{ scaleY: 0 }}
                        animate={{ scaleY: 1 }}
                        transition={{
                          duration: 0.4,
                          delay: shouldReduceMotion ? 0 : 0.05 * idx,
                          ease: "easeOut",
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Floating Indicator Chip 1: Forecast Origin */}
                <motion.div
                  animate={
                    shouldReduceMotion
                      ? {}
                      : { y: [-3, 3, -3] }
                  }
                  transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute top-14 right-6 z-20 px-2.5 py-1 rounded-md bg-navy-900/95 text-white text-[10px] font-mono shadow-md border border-slate-600 backdrop-blur-xs pointer-events-none flex items-center gap-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <span>Origin: 31 Aug &rarr; 7-day test</span>
                </motion.div>

                {/* Floating Indicator Chip 2: R_eff Threshold Line (Elevated above bars with z-20) */}
                <motion.div
                  animate={
                    shouldReduceMotion
                      ? {}
                      : { y: [3, -3, 3] }
                  }
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                  className="absolute top-14 left-6 z-20 px-2.5 py-1 rounded-md bg-blue-600/95 text-white text-[10px] font-mono shadow-md border border-blue-400/30 backdrop-blur-xs pointer-events-none flex items-center gap-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                  <span>R_eff = 1.0 (Threshold line)</span>
                </motion.div>
              </div>

              {/* Bottom Honesty Label */}
              <div className="px-4 py-2 bg-slate-50 border-t border-border text-[11px] text-muted text-center font-medium">
                Illustrative visual — not Punjab data
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
