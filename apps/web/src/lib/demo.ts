import "server-only";
import { computeFetch } from "./compute";
import { logger } from "./logger";
import { importBundledDirectly } from "./bundled-importer";

/**
 * Seed demo user with bundled synthetic Punjab-like epidemic dataset.
 */
export async function seedDemoData(userId: string): Promise<void> {
  try {
    const res = await computeFetch("/internal/datasets/import-bundled", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        source_key: "synthetic_demo",
      }),
    });
    if (res.ok) {
      return;
    }
  } catch (error) {
    logger.warn("Compute service call failed for demo seeding, attempting direct DB import", {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Fallback to direct Prisma seed
  try {
    await importBundledDirectly(userId, "synthetic_demo");
  } catch (fallbackError) {
    logger.warn("Direct demo seeding also failed", {
      userId,
      error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
    });
  }
}
