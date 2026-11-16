/**
 * Format any application error into a user-friendly, non-technical message.
 * Sanitizes internal stack traces, Prisma errors, compute exceptions, and Next.js Server Action skew hashes.
 */
export function formatUserError(
  error: unknown,
  fallback = "An unexpected error occurred. Please refresh the page or try again."
): { message: string; isDeploymentSkew: boolean } {
  if (!error) {
    return { message: fallback, isDeploymentSkew: false };
  }

  const raw = error instanceof Error ? error.message : String(error);

  // Check for deployment skew / stale server action hash
  if (
    raw.includes("Server Action") ||
    raw.includes("failed-to-find-server-action") ||
    raw.includes("was not found on the server") ||
    raw.includes("Loading chunk") ||
    raw.includes("Failed to fetch dynamically imported module")
  ) {
    return {
      message:
        "A new version of the workbench was deployed. Please refresh your page to load the latest research session.",
      isDeploymentSkew: true,
    };
  }

  // Check for database / network temporary issues
  if (
    raw.includes("Can't reach database") ||
    raw.includes("Database connection unavailable") ||
    raw.includes("ETIMEDOUT") ||
    raw.includes("ECONNREFUSED") ||
    raw.includes("P1001") ||
    raw.includes("fetch failed")
  ) {
    return {
      message:
        "The serverless database is currently waking up from idle. Please wait a few moments and try again.",
      isDeploymentSkew: false,
    };
  }

  // Compute microservice internal errors / 500 references
  if (
    raw.includes("Compute internal error") ||
    raw.includes("INTERNAL_SERVER_ERROR") ||
    raw.includes("COMPUTE_UNAVAILABLE")
  ) {
    return {
      message:
        "The compute engine is currently busy or re-initializing. Please try your request again in a few seconds.",
      isDeploymentSkew: false,
    };
  }

  // Model optimization failures
  if (
    raw.includes("optimiser could not find a valid fit") ||
    raw.includes("OptimizationFailed")
  ) {
    return {
      message:
        "The optimiser could not find a valid fit within the specified bounds. Try widening the transmission rate (β) bounds, reducing infectious duration, or changing the random seed.",
      isDeploymentSkew: false,
    };
  }

  // Population provenance
  if (raw.includes("population_provenance_missing")) {
    return {
      message:
        "Empirical fitting is blocked because population provenance is missing. Please configure the population count and source URL in the Data screen.",
      isDeploymentSkew: false,
    };
  }

  // Cryptic computational error reference mapping
  if (
    raw.includes("Unexpected computational error") ||
    raw.includes("Quote reference ERR-")
  ) {
    return {
      message:
        "A computational calculation error occurred during model fitting. Please verify that your date range contains sufficient continuous data and adjust parameter bounds if needed.",
      isDeploymentSkew: false,
    };
  }

  // Clean, short user-facing validation messages
  if (
    raw.length < 160 &&
    !raw.includes("at ") &&
    !raw.includes("http://") &&
    !raw.includes("https://") &&
    !raw.includes("node_modules") &&
    !raw.includes("PrismaClient") &&
    !raw.includes("digest:") &&
    !raw.includes("ERR-")
  ) {
    return { message: raw, isDeploymentSkew: false };
  }

  return { message: fallback, isDeploymentSkew: false };
}
