import "server-only";
import { computeFetch } from "./compute";
import { logger } from "./logger";

/**
 * Seed demo user with bundled synthetic Punjab-like epidemic dataset.
 */
export async function seedDemoData(userId: string): Promise<void> {
  try {
    await computeFetch("/internal/datasets/import-bundled", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        source_key: "synthetic_demo",
      }),
    });
  } catch (error) {
    logger.warn("Failed to automatically seed demo dataset", {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
