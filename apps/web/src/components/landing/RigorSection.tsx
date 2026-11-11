"use client";

import { motion } from "framer-motion";
import { AlertCircle, Eye, GitCommit, Scale } from "lucide-react";
import React from "react";

const PILLARS = [
  {
    icon: Scale,
    title: "Observed &ne; Simulated",
    desc: "Observed reported cases are never overlaid on latent model infections (I) as if equivalent. Daily incidence is mapped via mu_d = rho * delta_C.",
  },
  {
    icon: Eye,
    title: "Every Assumption Visible",
    desc: "Assumed reporting fractions (rho) and initial susceptibility are displayed alongside every fitted parameter. No hidden heuristic tuning.",
  },
  {
    icon: AlertCircle,
    title: "Pre-Registered Evaluation Rules",
    desc: "Rules are frozen before testing final blocks. Models must beat the simple 7-day-mean baseline by at least 10% MAE to claim improvement.",
  },
  {
    icon: GitCommit,
    title: "Traceable to Run ID",
    desc: "Every metric, confidence interval, and chart is linked to an immutable run ID, dataset version, and git code revision in the manifest.",
  },
] as const;

export function RigorSection() {
  return (
    <section id="rigor" className="py-20 md:py-28 bg-surface-2 border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-2">
            Scientific Integrity
          </h2>
          <h3 className="text-3xl sm:text-4xl font-extrabold text-ink tracking-tight">
            Built to not mislead
          </h3>
          <p className="text-sm sm:text-base text-muted mt-3">
            Mathematical modeling carries ethical responsibility. EpiLens is designed with strict guardrails to prevent exaggerated policy claims.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {PILLARS.map((pillar, idx) => {
            const Icon = pillar.icon;
            return (
              <motion.div
                key={pillar.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: idx * 0.08 }}
                className="p-6 rounded-[14px] bg-surface border border-border shadow-xs flex items-start gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-600 shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-semibold text-ink mb-1.5">
                    {pillar.title}
                  </h4>
                  <p className="text-xs sm:text-sm text-muted leading-relaxed">
                    {pillar.desc}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Equations Teaser Banner */}
        <div className="p-6 bg-navy-900 text-white rounded-[14px] border border-navy-800 shadow-md">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-blue-400 font-semibold mb-1">
                Continuous-Time Formulation
              </div>
              <h4 className="text-lg font-bold">Kermack–McKendrick Governing System</h4>
              <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                Solved numerically with Runge–Kutta (solve_ivp) at daily boundaries with strict parameter bounds and negative binomial dispersion.
              </p>
            </div>
            <div className="bg-navy-800/80 p-3.5 rounded-lg border border-slate-700 font-mono text-xs text-blue-200 space-y-1">
              <div>dS/dt = &minus;&beta; &times; S &times; I / N</div>
              <div>dI/dt = &beta; &times; S &times; I / N &minus; &gamma; &times; I</div>
              <div>dR/dt = &gamma; &times; I</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
