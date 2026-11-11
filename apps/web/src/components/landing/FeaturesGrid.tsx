"use client";

import { motion } from "framer-motion";
import {
  Archive,
  BarChart2,
  FileCheck2,
  GitBranch,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import React from "react";

const FEATURES = [
  {
    icon: FileCheck2,
    title: "Data Quality Gate",
    description:
      "Server-side validation identifies duplicates, flags missing dates, and distributes historical negative corrections backward up to 14 days.",
  },
  {
    icon: BarChart2,
    title: "SIR Calibration (M1 & M2)",
    description:
      "Bounded multi-start negative binomial maximum likelihood fitting of transmission (beta), initial infections, and overdispersion (k).",
  },
  {
    icon: ShieldCheck,
    title: "Fixed Forecast Protocol",
    description:
      "Evaluates 7-day out-of-sample performance over 13 rolling origins against pre-registered 7-day-mean and same-weekday baselines.",
  },
  {
    icon: GitBranch,
    title: "Counterfactual Scenarios",
    description:
      "Simulate forward transmission alterations from -50% to +50% using identical calibrated S, I, and R states without refitting.",
  },
  {
    icon: Archive,
    title: "Reproducible Export Bundles",
    description:
      "One-click ZIP archives containing cleaned CSVs, fitted states, model diagnostics, figures, and cryptographic provenance manifests.",
  },
  {
    icon: Sparkles,
    title: "Grounded AI Narrative",
    description:
      "Context-grounded natural language summaries explain model divergence and assumptions without hallucinating numbers.",
  },
] as const;

export function FeaturesGrid() {
  return (
    <section id="features" className="py-20 md:py-28 bg-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-2">
            Research Workbench Capabilities
          </h2>
          <h3 className="text-3xl sm:text-4xl font-extrabold text-ink tracking-tight">
            Scientific rigor from raw data to export
          </h3>
          <p className="text-sm sm:text-base text-muted mt-3">
            Designed specifically to address common pitfalls in epidemic modeling: leaking future data, ignoring overdispersion, and obscuring baseline comparisons.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: idx * 0.08 }}
                className="p-6 rounded-[14px] bg-surface-2 border border-border hover:border-blue-300 hover:shadow-md transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-600 mb-4 group-hover:scale-105 transition-transform">
                  <Icon className="w-5 h-5" />
                </div>
                <h4 className="text-base font-semibold text-ink mb-2">
                  {feature.title}
                </h4>
                <p className="text-sm text-muted leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
