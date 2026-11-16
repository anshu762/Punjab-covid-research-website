import React from "react";

interface DemoBadgeProps {
  label?: string;
  className?: string;
}

export function DemoBadge({ label = "Demo data", className = "" }: DemoBadgeProps) {
  return (
    <span
      className={`h-6 inline-flex items-center gap-1.5 px-2.5 text-xs font-medium rounded-full bg-amber-50 text-amber-800 border border-amber-200 shrink-0 ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
      {label}
    </span>
  );
}
