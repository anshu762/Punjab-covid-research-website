import { PageHeader } from "@/components/layout/PageHeader";
import { METHODS_SOURCE_URL } from "@epilens/shared";
import { BookOpen, ExternalLink, ShieldCheck } from "lucide-react";

export default function MethodsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Methods"
        description="Mathematical equations, parameter definitions, data provenance, and scientific limitations."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Equations card */}
        <div className="p-6 bg-surface rounded-[14px] border border-border shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-semibold text-ink">Differential Equations (SIR)</h2>
          </div>
          <p className="text-xs text-muted leading-relaxed mb-4">
            EpiLens integrates a classical Kermack–McKendrick continuous-time compartmental model:
          </p>
          <div className="p-4 bg-surface-2 rounded-lg font-mono text-xs text-slate-800 space-y-2 border border-border">
            <p>dS/dt = &minus;&beta;(t) &times; S(t) &times; I(t) / N</p>
            <p>dI/dt = &beta;(t) &times; S(t) &times; I(t) / N &minus; &gamma; &times; I(t)</p>
            <p>dR/dt = &gamma; &times; I(t)</p>
            <p>dC/dt = &beta;(t) &times; S(t) &times; I(t) / N, &nbsp; C(0) = 0</p>
          </div>
          <p className="text-xs text-muted mt-3">
            Expected daily reported cases &mu;<sub>d</sub> = &rho; &times; [C(t<sub>d+1</sub>) &minus; C(t<sub>d</sub>)], fitted to observed incident cases with negative binomial likelihood.
          </p>
        </div>

        {/* Provenance & Limitations card */}
        <div className="p-6 bg-surface rounded-[14px] border border-border shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-semibold text-ink">Provenance & Integrity Rules</h2>
          </div>
          <p className="text-xs text-muted leading-relaxed mb-4">
            Punjab epidemiological counts are derived from the publicly documented COVID-19 India historical archive:
          </p>
          <div className="space-y-3 text-xs text-slate-700">
            <div className="p-3 bg-surface-2 rounded-lg border border-border">
              <span className="font-semibold text-ink">Primary Data Source:</span>
              <a
                href={METHODS_SOURCE_URL}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-blue-600 hover:underline mt-1 font-mono text-[11px]"
              >
                <span>data.covid19india.org/documentation/csv</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-muted leading-relaxed">
              <strong>Scientific Notice:</strong> EpiLens is a research tool for modeling methodology evaluation. It distinguishes observed reported cases from simulated latent infections and does not constitute clinical or public health policy advice.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
