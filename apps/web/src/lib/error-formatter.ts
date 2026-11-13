/**
 * Format any application error into a user-friendly, non-technical message.
 * Sanitizes internal stack traces, Prisma errors, and Next.js Server Action skew hashes.
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
    raw.includes("P1001")
  ) {
    return {
      message:
        "The serverless database is currently waking up from idle. Please wait a few moments and try again.",
      isDeploymentSkew: false,
    };
  }

  // Clean, short user-facing validation messages
  if (
    raw.length < 120 &&
    !raw.includes("at ") &&
    !raw.includes("http://") &&
    !raw.includes("https://") &&
    !raw.includes("node_modules") &&
    !raw.includes("PrismaClient") &&
    !raw.includes("digest:")
  ) {
    return { message: raw, isDeploymentSkew: false };
  }

  return { message: fallback, isDeploymentSkew: false };
}
