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

export function MethodsQaCard() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [isGrounded, setIsGrounded] = useState<boolean | null>(null);

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
            onClick={() => {
              setQuestion(sq);
              handleSubmit(sq);
            }}
            disabled={loading}
            className="text-[11px] px-2.5 py-1 rounded-full bg-surface-2 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-border transition-colors disabled:opacity-50"
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
