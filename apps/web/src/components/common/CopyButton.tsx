"use client";

import { Check, Copy } from "lucide-react";
import React, { useState } from "react";

interface CopyButtonProps {
  value: string;
  label?: string;
  className?: string;
}

export function CopyButton({ value, label, className = "" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={label || "Copy to clipboard"}
      title={label || "Copy to clipboard"}
      className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-mono rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 ${className}`}
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-success" />
          <span>Copied</span>
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5 text-muted" />
          <span>{label || "Copy"}</span>
        </>
      )}
    </button>
  );
}
