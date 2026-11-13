"use client";

import { ErrorState } from "@/components/common/ErrorState";
import { useEffect } from "react";
import { formatUserError } from "@/lib/error-formatter";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { message, isDeploymentSkew } = formatUserError(
    error,
    "An unexpected error occurred while loading this workspace. Please retry or refresh the page."
  );

  useEffect(() => {
    console.error("Application route error:", error.digest || error.message);
  }, [error]);

  const handleRetry = () => {
    if (isDeploymentSkew) {
      window.location.reload();
    } else {
      reset();
    }
  };

  return (
    <div className="py-12">
      <ErrorState
        message={message}
        errorReference={error.digest || (isDeploymentSkew ? "DEPLOYMENT_UPDATE" : "err_app_runtime")}
        onRetry={handleRetry}
      />
    </div>
  );
}
