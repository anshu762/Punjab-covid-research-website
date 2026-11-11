"use client";

import { ErrorState } from "@/components/common/ErrorState";
import { useEffect } from "react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application route error:", error);
  }, [error]);

  return (
    <div className="py-12">
      <ErrorState
        message={error.message || "An unexpected error occurred loading this workspace."}
        errorReference={error.digest || "err_app_runtime"}
        onRetry={reset}
      />
    </div>
  );
}
