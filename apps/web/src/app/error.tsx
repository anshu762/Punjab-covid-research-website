"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import { formatUserError } from "@/lib/error-formatter";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { message, isDeploymentSkew } = formatUserError(error);

  useEffect(() => {
    // Log sanitized error in dev/monitoring
    console.error("Root uncaught error caught by boundary:", error.digest || error.message);
  }, [error]);

  const handleAction = () => {
    if (isDeploymentSkew) {
      window.location.reload();
    } else {
      reset();
    }
  };

  return (
    <div className="min-h-screen bg-surface-2 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface border border-border rounded-2xl shadow-xl p-6 sm:p-8 text-center animate-in fade-in duration-200">
        <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mx-auto mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>

        <h2 className="text-xl font-bold text-ink mb-2">
          {isDeploymentSkew ? "Update Available" : "Unable to Complete Request"}
        </h2>

        <p className="text-sm text-muted mb-6 leading-relaxed">
          {message}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleAction}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium shadow-xs transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>{isDeploymentSkew ? "Refresh Page" : "Try Again"}</span>
          </button>

          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border hover:bg-surface-2 text-ink text-sm font-medium transition-colors"
          >
            <Home className="w-4 h-4 text-muted" />
            <span>Go to Home</span>
          </Link>
        </div>

        {error.digest && (
          <p className="text-[11px] font-mono text-muted/60 mt-6 pt-4 border-t border-border">
            Reference: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
