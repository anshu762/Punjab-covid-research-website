import { AlertTriangle } from "lucide-react";
import React from "react";

interface StaleBannerProps {
  message?: string;
  className?: string;
}

export function StaleBanner({
  message = "Settings changed — rerun required",
  className = "",
}: StaleBannerProps) {
  return (
    <div
      role="status"
      className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium ${className}`}
    >
      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
      <span>{message}</span>
    </div>
  );
}
