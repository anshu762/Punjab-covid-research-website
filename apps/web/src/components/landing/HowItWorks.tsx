"use client";

import { motion } from "framer-motion";
import { Check, Database, Sliders, Play, Download } from "lucide-react";
import React from "react";

const STEPS = [
  {
    step: "01",
    title: "Load & Validate Data",
    desc: "Ingest the frozen Punjab 2020 COVID archive or upload custom CSV series. Negative counts and anomalies are audited automatically.",
    icon: Database,
  },
  {
    step: "02",
    title: "Calibrate Assumptions",
    desc: "Set fixed epidemiological priors: infectious duration (1/gamma), reporting fraction (rho), and initial susceptible ratio.",
    icon: Sliders,
  },
  {
    step: "03",
    title: "Execute Optimization",
    desc: "Asynchronous worker solves ODE system via solve_ivp and fits transmission parameters with negative binomial log-likelihood.",
    icon: Play,
  },
  {
    step: "04",
    title: "Scenarios & Bundle Export",
    desc: "Simulate counterfactual interventions and download complete reproducibility bundles containing code versions, manifests, and charts.",
    icon: Download,
  },
] as const;

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 md:py-28 bg-surface-2 border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-2">
            System Workflow
          </h2>
          <h3 className="text-3xl sm:text-4xl font-extrabold text-ink tracking-tight">
            How EpiLens executes reproducible research
          </h3>
          <p className="text-sm sm:text-base text-muted mt-3">
            Every analysis follows an immutable pipeline where results remain strictly reproducible and auditable.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="relative p-6 rounded-[14px] bg-surface border border-border shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                      Step {step.step}
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-slate-700">
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                  <h4 className="text-base font-semibold text-ink mb-2">
                    {step.title}
                  </h4>
                  <p className="text-xs sm:text-sm text-muted leading-relaxed">
                    {step.desc}
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-1.5 text-[11px] font-medium text-emerald-700">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Automated audit trail</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
