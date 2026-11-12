"use client";

import React, { useState } from "react";
import { Sparkles, Loader2, AlertTriangle, ShieldCheck, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface AiExplainerCardProps {
  kind: "results" | "scenario" | "dataset";
  refId: string;
  className?: string;
}

interface ExplanationState {
  text: string;
  model: string;
  groundingWarning: boolean;
  cached: boolean;
}

export function AiExplainerCard({ kind, refId, className = "" }: AiExplainerCardProps) {
  const [data, setData] = useState<ExplanationState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);

  async function handleRequestExplanation() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/ai/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, refId }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || "Failed to generate explanation");
      }

      const result = await res.json();
      setData(result);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load AI explanation");
    } finally {
      setIsLoading(false);
    }
  }

  function handleCopy() {
    if (!data?.text) return;
    navigator.clipboard.writeText(data.text);
    setHasCopied(true);
    toast.success("Explanation copied to clipboard");
    setTimeout(() => setHasCopied(false), 2000);
  }

  return (
    <div
      className={`p-5 rounded-[16px] bg-surface border border-border shadow-xs space-y-3.5 ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-semibold text-ink">
            Plain-Language Scientific Explanation
          </span>
        </div>

        {data ? (
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-muted bg-surface-2 px-2 py-0.5 rounded border border-border">
              {data.model}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 text-[11px] text-slate-600 hover:text-ink px-2 py-1 rounded hover:bg-surface-2 transition-colors"
            >
              {hasCopied ? (
                <Check className="w-3 h-3 text-emerald-600" />
              ) : (
                <Copy className="w-3 h-3 text-slate-400" />
              )}
              <span>{hasCopied ? "Copied" : "Copy"}</span>
            </button>
          </div>
        ) : null}
      </div>

      {!data && !isLoading ? (
        <div className="flex items-center justify-between gap-4 pt-1">
          <p className="text-xs text-muted leading-relaxed">
            Generate an objective, plain-language restatement strictly grounded in these stored parameters and calculated metrics.
          </p>
          <button
            type="button"
            onClick={handleRequestExplanation}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors shrink-0"
          >
            <Sparkles className="w-3 h-3" />
            <span>Explain in plain language</span>
          </button>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center gap-2 p-6 text-xs text-muted bg-surface-2 rounded-xl">
          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          <span>Generating grounded plain-language restatement…</span>
        </div>
      ) : data ? (
        <div className="space-y-3 pt-1">
          {/* Persistent Disclosure Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50/70 border border-blue-200/80 text-[11px] text-blue-900">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>
              AI-generated explanation · {data.model} · based only on stored results · not a research finding
            </span>
          </div>

          {/* Grounding Warning if numbers unverified */}
          {data.groundingWarning && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p>
                <strong>Grounding Notice:</strong> One or more figures in this text could not be verified
                with high precision against the stored result payload. Please cross-check against the verified tables above.
              </p>
            </div>
          )}

          {/* Explanation Text */}
          <div className="text-xs text-slate-700 leading-relaxed space-y-2 whitespace-pre-line font-sans">
            {data.text}
          </div>
        </div>
      ) : null}
    </div>
  );
}
