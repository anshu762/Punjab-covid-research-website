"use client";

import React, { useState } from "react";
import katex from "katex";
import { Copy, Check } from "lucide-react";

interface LatexEquationProps {
  label: string;
  latex: string;
  plainText: string;
}

export function LatexEquation({ label, latex, plainText }: LatexEquationProps) {
  const [copied, setCopied] = useState(false);

  let html = "";
  try {
    html = katex.renderToString(latex, {
      throwOnError: false,
      displayMode: true,
    });
  } catch (err) {
    html = `<span class="text-danger font-mono text-xs">Failed to render LaTeX: ${String(err)}</span>`;
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(latex);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      setCopied(false);
    }
  };

  return (
    <div className="relative my-4 p-4 rounded-xl border border-border bg-surface-2 group">
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-border/60">
        <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">
          {label}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={`Copy LaTeX source for ${label}`}
          title="Copy LaTeX source"
          className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-md text-slate-600 hover:text-ink hover:bg-surface border border-transparent hover:border-border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-success" />
              <span className="text-[11px] text-success">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span className="text-[11px]">Copy LaTeX</span>
            </>
          )}
        </button>
      </div>

      <div
        className="overflow-x-auto py-2 text-center text-ink"
        aria-label={plainText}
        role="region"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
