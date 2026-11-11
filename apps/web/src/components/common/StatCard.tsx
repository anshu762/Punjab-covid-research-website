import React from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  isLoading?: boolean;
  className?: string;
}

export function StatCard({
  label,
  value,
  hint,
  isLoading = false,
  className = "",
}: StatCardProps) {
  if (isLoading) {
    return (
      <div
        className={`p-4 rounded-[14px] bg-surface border border-border shadow-xs ${className}`}
      >
        <div className="h-3.5 w-24 bg-slate-200 animate-pulse rounded mb-2" />
        <div className="h-7 w-32 bg-slate-200 animate-pulse rounded mb-1.5" />
        {hint && <div className="h-3 w-40 bg-slate-100 animate-pulse rounded" />}
      </div>
    );
  }

  return (
    <div
      className={`p-4 rounded-[14px] bg-surface border border-border shadow-xs hover:border-slate-300 transition-colors ${className}`}
    >
      <div className="text-xs font-medium text-muted uppercase tracking-wider mb-1">
        {label}
      </div>
      <div className="text-2xl font-semibold tracking-tight text-ink font-mono">
        {value}
      </div>
      {hint && <div className="text-xs text-muted mt-1">{hint}</div>}
    </div>
  );
}
