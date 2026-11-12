import React from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { METHOD_SECTIONS } from "@/content/methods";
import { LatexEquation } from "@/components/methods/LatexEquation";
import { MethodsTableOfContents } from "@/components/methods/MethodsTableOfContents";
import { MethodsQaCard } from "@/components/methods/MethodsQaCard";
import { ExternalLink, ShieldCheck, AlertTriangle } from "lucide-react";
import { METHODS_SOURCE_URL, DEFAULT_POPULATION_PROVENANCE } from "@epilens/shared";

interface ParamRow {
  symbol: string;
  name: string;
  units: string;
  classification: "Fitted" | "Assumed" | "Fixed Provenance";
  defaultVal: string;
  rangeOrBounds: string;
}

const PARAMETER_TABLE_ROWS: ParamRow[] = [
  {
    symbol: "β (beta)",
    name: "Transmission rate",
    units: "day⁻¹",
    classification: "Fitted",
    defaultVal: "0.20",
    rangeOrBounds: "[0.01, 2.00]",
  },
  {
    symbol: "γ (gamma)",
    name: "Recovery rate (1/D)",
    units: "day⁻¹",
    classification: "Assumed",
    defaultVal: "0.1429 (D = 7d)",
    rangeOrBounds: "D ∈ [3, 21] days",
  },
  {
    symbol: "ρ (rho)",
    name: "Reporting fraction",
    units: "dimensionless",
    classification: "Assumed",
    defaultVal: "0.20 (20%)",
    rangeOrBounds: "[0.01, 1.00]",
  },
  {
    symbol: "f_s",
    name: "Initially susceptible fraction",
    units: "dimensionless",
    classification: "Assumed",
    defaultVal: "0.95 (95%)",
    rangeOrBounds: "[0.01, 0.999]",
  },
  {
    symbol: "I_initial",
    name: "Initial infectious individuals",
    units: "persons",
    classification: "Fitted",
    defaultVal: "100",
    rangeOrBounds: "[1, min(10⁶, N - S_initial)]",
  },
  {
    symbol: "k",
    name: "Negative binomial overdispersion",
    units: "dimensionless",
    classification: "Fitted",
    defaultVal: "10.0",
    rangeOrBounds: "[0.05, 1000.0]",
  },
  {
    symbol: "N",
    name: "Total population",
    units: "persons",
    classification: "Fixed Provenance",
    defaultVal: DEFAULT_POPULATION_PROVENANCE.value.toLocaleString("en-IN"),
    rangeOrBounds: "Census baseline",
  },
  {
    symbol: "τ (tau)",
    name: "Change-point date (Model M2)",
    units: "calendar date",
    classification: "Fitted",
    defaultVal: "Grid search",
    rangeOrBounds: "Every 7d, ≥21d margin",
  },
];

export default function MethodsPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      <PageHeader
        title="Methods & Scientific Protocol"
        description="Mathematical equations, parameter definitions, data provenance, optimization heuristics, and scientific limitations."
      />

      {/* Two-Column Layout */}
      <div className="flex flex-col md:flex-row gap-8 items-start">
        {/* Sticky Table of Contents */}
        <MethodsTableOfContents />

        {/* Main Content Body */}
        <main className="flex-1 min-w-0 space-y-8" id="methods-content">
          {/* Methods QA Box */}
          <MethodsQaCard />

          {/* Section 1: Purpose and Scope */}
          <section id="purpose" className="p-6 bg-surface rounded-xl border border-border shadow-xs scroll-mt-24">
            <h2 className="text-base font-bold text-ink mb-2">1. Purpose and Scope</h2>
            <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
              {METHOD_SECTIONS[0]?.content.map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </div>
          </section>

          {/* Section 2: Data Provenance */}
          <section id="data" className="p-6 bg-surface rounded-xl border border-border shadow-xs scroll-mt-24">
            <h2 className="text-base font-bold text-ink mb-2">2. Data Provenance</h2>
            <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
              {METHOD_SECTIONS[1]?.content.map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </div>
            <div className="mt-4 p-3 bg-surface-2 rounded-lg border border-border flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-ink block">Archive Documentation Link:</span>
                <span className="text-[11px] text-muted font-mono">{METHODS_SOURCE_URL}</span>
              </div>
              <a
                href={METHODS_SOURCE_URL}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
              >
                <span>View Archive Docs</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </section>

          {/* Section 3: Data Cleaning Rules */}
          <section id="cleaning" className="p-6 bg-surface rounded-xl border border-border shadow-xs scroll-mt-24">
            <h2 className="text-base font-bold text-ink mb-2">3. Data Cleaning Rules</h2>
            <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
              {METHOD_SECTIONS[2]?.content.map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </div>
          </section>

          {/* Section 4: Model Equations */}
          <section id="model" className="p-6 bg-surface rounded-xl border border-border shadow-xs scroll-mt-24">
            <h2 className="text-base font-bold text-ink mb-2">4. Model Equations & Observation Mapping</h2>
            <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
              <p>{METHOD_SECTIONS[3]?.content[0]}</p>
              <p>{METHOD_SECTIONS[3]?.content[1]}</p>

              {/* KaTeX Equations */}
              {METHOD_SECTIONS[3]?.latexEquations?.map((eq, idx) => (
                <LatexEquation key={idx} label={eq.label} latex={eq.latex} plainText={eq.plainText} />
              ))}

              <p>{METHOD_SECTIONS[3]?.content[2]}</p>
              <p className="font-medium text-ink bg-blue-50/50 p-2.5 rounded-lg border border-blue-100">
                {METHOD_SECTIONS[3]?.content[3]}
              </p>
              <p>{METHOD_SECTIONS[3]?.content[4]}</p>
            </div>
          </section>

          {/* Section 5: Parameter Definitions */}
          <section id="parameters" className="p-6 bg-surface rounded-xl border border-border shadow-xs scroll-mt-24">
            <h2 className="text-base font-bold text-ink mb-2">5. Parameter Definitions</h2>
            <p className="text-xs text-muted mb-4">{METHOD_SECTIONS[4]?.summary}</p>

            <div className="overflow-x-auto border border-border rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-surface-2 border-b border-border text-[11px] font-semibold text-ink">
                    <th className="py-2.5 px-3">Symbol</th>
                    <th className="py-2.5 px-3">Parameter Name</th>
                    <th className="py-2.5 px-3">Units</th>
                    <th className="py-2.5 px-3">Classification</th>
                    <th className="py-2.5 px-3">Default Value</th>
                    <th className="py-2.5 px-3">Bounds / Allowed Range</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {PARAMETER_TABLE_ROWS.map((row, idx) => (
                    <tr key={idx} className="hover:bg-surface-2/60 transition-colors">
                      <td className="py-2 px-3 font-mono font-medium text-blue-700">{row.symbol}</td>
                      <td className="py-2 px-3 text-ink">{row.name}</td>
                      <td className="py-2 px-3 text-muted">{row.units}</td>
                      <td className="py-2 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                            row.classification === "Fitted"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : row.classification === "Assumed"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}
                        >
                          {row.classification}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-mono text-[11px] text-slate-800">{row.defaultVal}</td>
                      <td className="py-2 px-3 font-mono text-[11px] text-muted">{row.rangeOrBounds}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 6: Likelihood & Fitting */}
          <section id="fitting" className="p-6 bg-surface rounded-xl border border-border shadow-xs scroll-mt-24">
            <h2 className="text-base font-bold text-ink mb-2">6. Likelihood & Optimization</h2>
            <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
              <p>{METHOD_SECTIONS[5]?.content[0]}</p>

              {/* Likelihood KaTeX */}
              {METHOD_SECTIONS[5]?.latexEquations?.map((eq, idx) => (
                <LatexEquation key={idx} label={eq.label} latex={eq.latex} plainText={eq.plainText} />
              ))}

              <p>{METHOD_SECTIONS[5]?.content[1]}</p>
              <p>{METHOD_SECTIONS[5]?.content[2]}</p>

              <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-200 text-xs text-slate-800">
                <span className="font-semibold text-blue-900 block mb-1">Truth in Engineering — Optimization Shortcuts Disclosed:</span>
                {METHOD_SECTIONS[5]?.content[3]}
              </div>
            </div>
          </section>

          {/* Section 7: Change-Point Model */}
          <section id="changepoint" className="p-6 bg-surface rounded-xl border border-border shadow-xs scroll-mt-24">
            <h2 className="text-base font-bold text-ink mb-2">7. One Change-Point Model (M2)</h2>
            <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
              <p>{METHOD_SECTIONS[6]?.content[0]}</p>

              {METHOD_SECTIONS[6]?.latexEquations?.map((eq, idx) => (
                <LatexEquation key={idx} label={eq.label} latex={eq.latex} plainText={eq.plainText} />
              ))}

              <p>{METHOD_SECTIONS[6]?.content[1]}</p>
              <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 text-xs">
                <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                <span>{METHOD_SECTIONS[6]?.content[2]}</span>
              </div>
            </div>
          </section>

          {/* Section 8: Forecast Evaluation Protocol */}
          <section id="evaluation" className="p-6 bg-surface rounded-xl border border-border shadow-xs scroll-mt-24">
            <h2 className="text-base font-bold text-ink mb-2">8. Forecast Evaluation Protocol</h2>
            <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
              {METHOD_SECTIONS[7]?.content.map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </div>
          </section>

          {/* Section 9: Uncertainty */}
          <section id="uncertainty" className="p-6 bg-surface rounded-xl border border-border shadow-xs scroll-mt-24">
            <h2 className="text-base font-bold text-ink mb-2">9. Uncertainty and Parametric Bootstrap</h2>
            <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
              {METHOD_SECTIONS[8]?.content.map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </div>
          </section>

          {/* Section 10: Scenarios */}
          <section id="scenarios" className="p-6 bg-surface rounded-xl border border-border shadow-xs scroll-mt-24">
            <h2 className="text-base font-bold text-ink mb-2">10. Scenario Explorer</h2>
            <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
              {METHOD_SECTIONS[9]?.content.map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </div>
          </section>

          {/* Section 11: Sensitivity */}
          <section id="sensitivity" className="p-6 bg-surface rounded-xl border border-border shadow-xs scroll-mt-24">
            <h2 className="text-base font-bold text-ink mb-2">11. Parameter Sensitivity Analysis</h2>
            <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
              {METHOD_SECTIONS[10]?.content.map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </div>
          </section>

          {/* Section 12: Reproducibility */}
          <section id="reproducibility" className="p-6 bg-surface rounded-xl border border-border shadow-xs scroll-mt-24">
            <h2 className="text-base font-bold text-ink mb-2">12. Reproducibility Standards</h2>
            <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
              {METHOD_SECTIONS[11]?.content.map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </div>
          </section>

          {/* Section 13: Limitations */}
          <section id="limitations" className="p-6 bg-surface rounded-xl border border-border shadow-xs scroll-mt-24">
            <h2 className="text-base font-bold text-ink mb-2">13. Scientific Limitations</h2>
            <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
              {METHOD_SECTIONS[12]?.content.map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </div>
          </section>

          {/* Section 14: AI Explainer */}
          <section id="ai" className="p-6 bg-surface rounded-xl border border-border shadow-xs scroll-mt-24">
            <h2 className="text-base font-bold text-ink mb-2">14. AI Plain-Language Explainer</h2>
            <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
              {METHOD_SECTIONS[13]?.content.map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </div>
          </section>

          {/* Bottom Scientific Notice */}
          <div className="p-4 bg-surface-2 rounded-xl border border-border text-xs text-muted flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-ink">EpiLens Scientific Integrity Commitment</p>
              <p>
                All models are computational approximations of biological realities. In accordance with open science practices,
                EpiLens reports optimization limits, parameter uncertainties, sensitivity reversals, and data provenance openly.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
