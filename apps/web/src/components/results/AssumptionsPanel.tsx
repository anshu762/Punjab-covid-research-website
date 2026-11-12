"use client";

import React, { useState } from "react";
import { formatInt, formatNumber } from "@epilens/shared";
import type { FitResultPayload } from "@epilens/shared";
import { ChevronDown, ChevronUp, ExternalLink, ShieldAlert } from "lucide-react";

interface AssumptionsPanelProps {
  payload: FitResultPayload;
}

export function AssumptionsPanel({ payload }: AssumptionsPanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  const assumptions = payload.assumptions;
  const pop = assumptions.population;
  const D = assumptions.infectiousDurationDays;
  const gamma = assumptions.gamma;
  const rho = assumptions.reportingFraction;
  const sFrac = assumptions.susceptibleFraction;
  const sInitial = assumptions.sInitial;
  const rInitial = assumptions.rInitial;

  return (
    <div className="bg-surface rounded-2xl border border-border shadow-2xs overflow-hidden transition-all">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls="assumptions-content"
        className="w-full flex items-center justify-between px-5 py-3.5 bg-surface hover:bg-surface-2 transition text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-ink uppercase tracking-wider">
            Model Assumptions & Provenance
          </span>
          <span className="px-2 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-700 rounded-md border border-blue-200">
            Fixed prior to fitting
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted">
          <span>{isOpen ? "Hide assumptions" : "Inspect assumptions"}</span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {isOpen && (
        <div id="assumptions-content" className="p-5 border-t border-border space-y-4 text-xs">
          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex items-start gap-2.5 text-amber-900 leading-relaxed text-[11px]">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">PRD Scientific Honesty Note:</span> Reporting fraction (
              {formatNumber(rho * 100, 1)}%) and susceptible fraction ({formatNumber(sFrac * 100, 1)}
              %) are <strong>user-specified assumptions</strong>, not estimated parameters. Model
              trajectories and transmission metrics ($\beta/\gamma$) are conditional on these values.
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Infectious Duration & Gamma */}
            <div className="p-3 bg-surface-2 rounded-xl border border-border space-y-1">
              <span className="text-muted block text-[11px] font-medium">Infectious Duration (D)</span>
              <span className="text-sm font-bold text-ink font-mono">{D} days</span>
              <span className="text-[11px] text-muted block">
                Implied removal rate $\gamma = 1/D = {formatNumber(gamma, 4)}$ / day
              </span>
            </div>

            {/* Reporting Fraction */}
            <div className="p-3 bg-surface-2 rounded-xl border border-border space-y-1">
              <span className="text-muted block text-[11px] font-medium flex items-center justify-between">
                <span>Reporting Fraction ($\rho$)</span>
                <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded">
                  Assumed
                </span>
              </span>
              <span className="text-sm font-bold text-ink font-mono">
                {formatNumber(rho, 2)} ({formatNumber(rho * 100, 1)}%)
              </span>
              <span className="text-[11px] text-muted block">
                $\mu_d = \rho \cdot \Delta C_d$ (expected reported incidence)
              </span>
            </div>

            {/* Susceptibility & S0 */}
            <div className="p-3 bg-surface-2 rounded-xl border border-border space-y-1">
              <span className="text-muted block text-[11px] font-medium flex items-center justify-between">
                <span>Susceptible Fraction ($S_0/N$)</span>
                <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded">
                  Assumed
                </span>
              </span>
              <span className="text-sm font-bold text-ink font-mono">
                {formatNumber(sFrac * 100, 1)}% ({formatInt(sInitial)} persons)
              </span>
              <span className="text-[11px] text-muted block">
                Initially susceptible population S_initial
              </span>
            </div>

            {/* Inferred R0 */}
            <div className="p-3 bg-surface-2 rounded-xl border border-border space-y-1">
              <span className="text-muted block text-[11px] font-medium flex items-center justify-between">
                <span>Initial Removed (R_0)</span>
                <span className="text-[10px] font-semibold text-blue-700 bg-blue-100 px-1.5 py-0.2 rounded">
                  Inferred
                </span>
              </span>
              <span className="text-sm font-bold text-ink font-mono font-semibold">
                {formatInt(rInitial)} persons
              </span>
              <span className="text-[11px] text-muted block">
                R_initial = N - S_initial - I_initial
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/60">
            {/* Population Provenance */}
            <div className="space-y-1">
              <span className="text-muted block text-[11px] font-medium">Population Provenance</span>
              <div className="flex flex-wrap items-center gap-2 text-ink">
                <span className="font-bold font-mono text-xs">{formatInt(pop.value)} persons</span>
                <span className="text-muted">•</span>
                <span>{pop.geography}</span>
                <span className="text-muted">•</span>
                <span className="text-muted">Ref. Year {pop.referenceYear}</span>
                {pop.sourceUrl && (
                  <a
                    href={pop.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:underline text-[11px]"
                  >
                    <span>Source</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>

            {/* Numerical Engine Tolerances */}
            <div className="space-y-1 sm:text-right">
              <span className="text-muted block text-[11px] font-medium">Numerical Solver & Likelihood</span>
              <div className="text-slate-700 text-[11px]">
                ODE Solver: <span className="font-mono font-medium">LSODA / RK45</span> · rtol:{" "}
                <span className="font-mono">1e-8</span>, atol: <span className="font-mono">1e-8</span> ·
                Likelihood: <span className="font-mono">Negative Binomial</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
