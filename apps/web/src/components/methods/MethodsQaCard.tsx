"use client";

import React, { useState } from "react";
import { Sparkles, Send, Loader2, ShieldCheck, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const SUGGESTED_QUESTIONS = [
  "Why is reporting delay not modeled explicitly?",
  "What are the 13 forecast evaluation origins?",
  "What are the frozen model selection rules?",
  "How are negative corrections resolved?",
];

const VERIFIED_METHODS_ANSWERS: Record<string, string> = {
  "Why is reporting delay not modeled explicitly?":
    "Punjab COVID-19 surveillance data only records public reporting dates, not clinical symptom-onset dates. Explicitly adding unobserved incubation (E) or reporting delay compartments without individual-level onset-to-confirmation linelists would induce severe parameter non-identifiability. In accordance with epidemiological best practices, EpiLens fits daily reported incidence directly with a Negative Binomial dispersion parameter to capture observation variance.",

  "What are the 13 forecast evaluation origins?":
    "The 13 rolling evaluation origins span consecutive 7-day cutoff boundaries from July through October 2020. Origins 1 through 9 serve as the development set (used for tuning multi-start bounds and diagnostic heuristics), while Origins 10 through 13 serve as the held-out final test set. Each origin projects forward 7 days to rigorously compare SIR forecasts against persistent 7-day moving averages and weekday baselines.",

  "What are the frozen model selection rules?":
    "The one change-point SIR model (M2) is preferred over constant SIR (M1) only when all three criteria are satisfied:\n1. Rolling 7-day out-of-sample forecast RMSE is strictly lower across evaluation origins;\n2. Penalized in-sample likelihood metrics (AIC and BIC) justify the additional degrees of freedom (new transmission rate β₂ and change date τ);\n3. The estimated change date τ corresponds to documented intervention shifts (such as localized lockdowns or testing policy adjustments).",

  "How are negative corrections resolved?":
    "Negative values in the Punjab archive arise from historical deduplications and data reconciliations by health authorities. EpiLens uses a backward-smoothing redistribution algorithm: negative counts are subtracted from the nearest preceding non-zero reported counts within a bounded window. This preserves the cumulative case tally exactly while guaranteeing non-negative daily series required for ODE likelihood estimation.",
};

export function MethodsQaCard() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [isGrounded, setIsGrounded] = useState<boolean | null>(null);

  const handleSelectSuggested = (sq: string) => {
    setQuestion(sq);
    const precomputed = VERIFIED_METHODS_ANSWERS[sq];
    if (precomputed) {
      setAnswer(precomputed);
      setIsGrounded(true);
      setLoading(false);
    } else {
      handleSubmit(sq);
    }
  };

  const handleSubmit = async (qToSubmit: string) => {
    const trimmed = qToSubmit.trim();
    if (!trimmed) return;
    setLoading(true);
    setAnswer(null);

    try {
      const res = await fetch("/api/ai/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "methods_qa",
          refId: "methods",
          question: trimmed,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error?.message || "Failed to generate answer");
      }

      const data = await res.json();
      setAnswer(data.content);
      setIsGrounded(data.grounded !== false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error contacting methods assistant");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-5 bg-surface rounded-xl border border-border shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink">Ask About Methodology</h3>
            <p className="text-[11px] text-muted">
              Grounded AI assistant referencing verified equations, parameters, and protocol rules
            </p>
          </div>
        </div>
        <span className="px-2 py-0.5 text-[10px] font-medium bg-surface-2 border border-border rounded text-muted">
          AI Explainer
        </span>
      </div>

      {/* Suggested question chips */}
      <div className="flex flex-wrap gap-1.5">
        {SUGGESTED_QUESTIONS.map((sq) => (
          <button
            key={sq}
            type="button"
            onClick={() => handleSelectSuggested(sq)}
            disabled={loading}
            className="text-[11px] px-2.5 py-1 rounded-full bg-surface-2 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-border hover:border-blue-200 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {sq}
          </button>
        ))}
      </div>

      {/* Input box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit(question);
        }}
        className="flex gap-2"
      >
        <label htmlFor="methods-qa-input" className="sr-only">
          Ask a question about methods
        </label>
        <input
          id="methods-qa-input"
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. How does the 14-day negative correction window work?"
          disabled={loading}
          className="flex-1 px-3 py-2 text-xs rounded-lg border border-border bg-surface text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 rounded-lg flex items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
          <span>Ask</span>
        </button>
      </form>

      {/* Answer Output */}
      {answer && (
        <div className="pt-3 border-t border-border space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1 text-slate-600 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-success" />
              <span>Grounded Methods Answer</span>
            </div>
            {isGrounded === false && (
              <span className="flex items-center gap-1 text-[10px] text-warning">
                <AlertCircle className="w-3 h-3" />
                <span>Ungrounded tokens flagged</span>
              </span>
            )}
          </div>
          <div className="p-3 bg-surface-2 rounded-lg text-xs text-slate-800 leading-relaxed border border-border whitespace-pre-line">
            {answer}
          </div>
          <p className="text-[10px] text-muted italic">
            Notice: AI-generated summary strictly restating stored methodology text. Verify against primary reference below.
          </p>
        </div>
      )}
    </div>
  );
}
