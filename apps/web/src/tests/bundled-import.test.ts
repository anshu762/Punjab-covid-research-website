import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { importBundledDirectly } from "@/lib/bundled-importer";
import { db } from "@/lib/db";

describe("Direct Bundled Importer", () => {
  it("imports synthetic demo dataset directly into database", async () => {
    // Find or create test user
    let user = await db.user.findFirst({ where: { isDemo: true } });
    if (!user) {
      user = await db.user.create({
        data: {
          name: "Test Researcher",
          email: `test-import-${Date.now()}@test.local`,
          isDemo: true,
        },
      });
    }

    const result = await importBundledDirectly(user.id, "synthetic_demo");

    expect(result).toBeDefined();
    expect(result.dataset_id).toBeDefined();
    expect(result.status).toBe("READY");
    expect(result.is_synthetic).toBe(true);
    expect(result.observation_count).toBeGreaterThan(0);

    // Verify dataset in DB
    const dataset = await db.dataset.findUnique({
      where: { id: result.dataset_id },
      include: { files: true, observations: true },
    });

    expect(dataset).toBeDefined();
    expect(dataset?.ownerId).toBe(user.id);
    expect(dataset?.files.length).toBe(3); // RAW_UPLOAD, CLEAN_CSV, QUALITY_LOG
    expect(dataset?.observations.length).toBe(result.observation_count);

    // Clean up test dataset
    await db.dataset.delete({ where: { id: result.dataset_id } });
  }, 25000);

  it("imports frozen archive dataset directly into database", async () => {
    let user = await db.user.findFirst({ where: { isDemo: true } });
    if (!user) {
      user = await db.user.create({
        data: {
          name: "Test Researcher Archive",
          email: `test-archive-${Date.now()}@test.local`,
          isDemo: true,
        },
      });
    }

    const result = await importBundledDirectly(user.id, "punjab_frozen_archive");

    expect(result).toBeDefined();
    expect(result.dataset_id).toBeDefined();
    expect(result.status).toBe("READY");
    expect(result.is_synthetic).toBe(false);
    expect(result.observation_count).toBe(597);

    // Verify dataset in DB
    const dataset = await db.dataset.findUnique({
      where: { id: result.dataset_id },
      include: { files: true, observations: true },
    });

    expect(dataset).toBeDefined();
    expect(dataset?.ownerId).toBe(user.id);
    expect(dataset?.observations.length).toBe(597);

    // Clean up test dataset
    await db.dataset.delete({ where: { id: result.dataset_id } });
  }, 25000);
});
