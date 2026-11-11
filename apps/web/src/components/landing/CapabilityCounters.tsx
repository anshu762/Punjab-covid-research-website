"use client";

import { motion } from "framer-motion";
import React from "react";

const FACTS = [
  { value: "7", label: "Workspaces", hint: "From data cleaning to scenario modeling" },
  { value: "4", label: "Compared Forecast Models", hint: "M1, M2 & 2 pre-registered baselines" },
  { value: "13", label: "Evaluation Blocks", hint: "Fixed rolling 7-day origin cutoffs" },
  { value: "27", label: "Sensitivity Scenarios", hint: "Full 3×3×3 parameter space coverage" },
] as const;

export function CapabilityCounters() {
  return (
    <section className="py-12 bg-surface-2 border-y border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
          {FACTS.map((fact, idx) => (
            <motion.div
              key={fact.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: idx * 0.08 }}
              className="text-center sm:text-left p-2"
            >
              <div className="text-3xl sm:text-4xl font-extrabold text-ink font-mono tracking-tight">
                {fact.value}
              </div>
              <div className="text-sm font-semibold text-slate-800 mt-1">
                {fact.label}
              </div>
              <div className="text-xs text-muted mt-0.5 leading-snug">
                {fact.hint}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
