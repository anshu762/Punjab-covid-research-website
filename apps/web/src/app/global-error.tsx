"use client";

import { useEffect } from "react";
import { formatUserError } from "@/lib/error-formatter";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { message, isDeploymentSkew } = formatUserError(error);

  useEffect(() => {
    console.error("Global fatal error:", error.digest || error.message);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-slate-900">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl p-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mx-auto mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>

          <h2 className="text-xl font-bold text-slate-900 mb-2">
            {isDeploymentSkew ? "Website Updated" : "Something went wrong"}
          </h2>

          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            {message}
          </p>

          <button
            type="button"
            onClick={() => (isDeploymentSkew ? window.location.reload() : reset())}
            className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors shadow-xs"
          >
            {isDeploymentSkew ? "Refresh Page" : "Try Again"}
          </button>
        </div>
      </body>
    </html>
  );
}
