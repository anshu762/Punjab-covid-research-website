import { RUN_STATUSES, type RunStatusKey } from "@epilens/shared";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock,
  Loader2,
  PlayCircle,
  Sparkles,
} from "lucide-react";
import React from "react";

interface RunStatusPillProps {
  status: RunStatusKey | string | null | undefined;
  className?: string;
}

export function RunStatusPill({ status, className = "" }: RunStatusPillProps) {
  if (!status) {
    return (
      <span
        aria-live="polite"
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 ${className}`}
      >
        <Clock className="w-3.5 h-3.5 text-slate-400" />
        <span>No run</span>
      </span>
    );
  }

  const key = status.toUpperCase() as RunStatusKey;
  const def = RUN_STATUSES[key];
  const label = def?.label || status;

  switch (key) {
    case "COMPLETED":
      return (
        <span
          aria-live="polite"
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 ${className}`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>{label}</span>
        </span>
      );
    case "FAILED":
      return (
        <span
          aria-live="polite"
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-800 border border-red-200 ${className}`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
          <span>{label}</span>
        </span>
      );
    case "CANCELLED":
      return (
        <span
          aria-live="polite"
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 ${className}`}
        >
          <Ban className="w-3.5 h-3.5 text-slate-500" />
          <span>{label}</span>
        </span>
      );
    case "QUEUED":
      return (
        <span
          aria-live="polite"
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-800 border border-blue-200 ${className}`}
        >
          <Clock className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
          <span>{label}</span>
        </span>
      );
    case "FITTING":
    case "EVALUATING":
    case "VALIDATING":
    case "EXPORTING":
      return (
        <span
          aria-live="polite"
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-800 border border-blue-300 ${className}`}
        >
          <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" />
          <span>{label}</span>
        </span>
      );
    case "ESTIMATING_UNCERTAINTY":
      return (
        <span
          aria-live="polite"
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-800 border border-purple-200 ${className}`}
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-600 animate-spin" />
          <span>{label}</span>
        </span>
      );
    default:
      return (
        <span
          aria-live="polite"
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 ${className}`}
        >
          <PlayCircle className="w-3.5 h-3.5 text-slate-500" />
          <span>{label}</span>
        </span>
      );
  }
}
