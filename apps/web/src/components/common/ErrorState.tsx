import { AlertOctagon, RotateCcw } from "lucide-react";
import React from "react";
import { CopyButton } from "./CopyButton";

interface ErrorStateProps {
  message?: string;
  errorReference?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  message = "An unexpected error occurred while loading this view.",
  errorReference,
  onRetry,
  className = "",
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center text-center p-8 md:p-10 border border-red-200 rounded-[14px] bg-red-50/50 ${className}`}
    >
      <div className="w-11 h-11 rounded-xl bg-red-100 border border-red-200 flex items-center justify-center text-danger mb-3">
        <AlertOctagon className="w-5 h-5" />
      </div>
      <h3 className="text-base font-semibold text-ink mb-1">
        Unable to load data
      </h3>
      <p className="text-sm text-muted max-w-md mb-4">{message}</p>
      {errorReference && (
        <div className="flex items-center gap-2 mb-5 px-3 py-1.5 rounded-md bg-white border border-border text-xs text-muted">
          <span>Error Reference:</span>
          <span className="font-mono text-ink font-semibold">{errorReference}</span>
          <CopyButton value={errorReference} label="Copy ID" />
        </div>
      )}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Retry</span>
        </button>
      )}
    </div>
  );
}
