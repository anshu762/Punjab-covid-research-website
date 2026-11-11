import "server-only";
import { HttpError } from "./http";
import { logger } from "./logger";

const COMPUTE_URL = process.env.COMPUTE_URL || "http://localhost:8000";
const COMPUTE_SHARED_SECRET =
  process.env.COMPUTE_SHARED_SECRET || "epilens-local-internal-compute-secret";

export interface ComputeFetchOptions extends RequestInit {
  userId?: string;
}

export async function computeFetch(
  path: string,
  options: ComputeFetchOptions = {}
): Promise<Response> {
  const url = `${COMPUTE_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
  const headers = new Headers(options.headers);

  headers.set("X-Internal-Secret", COMPUTE_SHARED_SECRET);
  if (options.userId) {
    headers.set("X-User-Id", options.userId);
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(url, {
      ...options,
      headers,
      signal: options.signal ?? controller.signal,
    });
    clearTimeout(timeout);

    return res;
  } catch (error: unknown) {
    logger.warn("Compute fetch failed", {
      path,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new HttpError(
      502,
      "COMPUTE_UNAVAILABLE",
      "Compute engine is currently unreachable. Please try again shortly."
    );
  }
}

export async function wakeWorker(): Promise<void> {
  try {
    const url = `${COMPUTE_URL.replace(/\/$/, "")}/internal/jobs/wake`;
    await fetch(url, {
      method: "POST",
      headers: {
        "X-Internal-Secret": COMPUTE_SHARED_SECRET,
      },
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    // Fire-and-forget: never throws
  }
}
