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

const BASE_PILL_CLASS = "h-6 inline-flex items-center gap-1.5 px-2.5 text-xs font-medium rounded-full border shrink-0";

export function RunStatusPill({ status, className = "" }: RunStatusPillProps) {
  if (!status) {
    return (
      <span
        aria-live="polite"
        className={`${BASE_PILL_CLASS} bg-slate-100 text-slate-600 border-slate-200 ${className}`}
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
          className={`${BASE_PILL_CLASS} bg-emerald-50 text-emerald-800 border-emerald-200 ${className}`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>{label}</span>
        </span>
      );
    case "FAILED":
      return (
        <span
          aria-live="polite"
          className={`${BASE_PILL_CLASS} bg-rose-50 text-rose-800 border-rose-200 ${className}`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
          <span>{label}</span>
        </span>
      );
    case "CANCELLED":
      return (
        <span
          aria-live="polite"
          className={`${BASE_PILL_CLASS} bg-slate-100 text-slate-700 border-slate-200 ${className}`}
        >
          <Ban className="w-3.5 h-3.5 text-slate-500" />
          <span>{label}</span>
        </span>
      );
    case "QUEUED":
      return (
        <span
          aria-live="polite"
          className={`${BASE_PILL_CLASS} bg-amber-50 text-amber-800 border-amber-200 ${className}`}
        >
          <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
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
          className={`${BASE_PILL_CLASS} bg-blue-50 text-blue-800 border-blue-200 ${className}`}
        >
          <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" />
          <span>{label}</span>
        </span>
      );
    case "ESTIMATING_UNCERTAINTY":
      return (
        <span
          aria-live="polite"
          className={`${BASE_PILL_CLASS} bg-cyan-50 text-cyan-800 border-cyan-200 ${className}`}
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-600 animate-spin" />
          <span>{label}</span>
        </span>
      );
    default:
      return (
        <span
          aria-live="polite"
          className={`${BASE_PILL_CLASS} bg-slate-100 text-slate-700 border-slate-200 ${className}`}
        >
          <PlayCircle className="w-3.5 h-3.5 text-slate-500" />
          <span>{label}</span>
        </span>
      );
  }
}
