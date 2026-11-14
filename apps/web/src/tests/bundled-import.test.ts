import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const { mockPrisma } = vi.hoisted(() => {
  const prismaObj = {
    user: {
      findUnique: vi.fn(),
    },
    dataset: {
      create: vi.fn(),
    },
    storedFile: {
      createMany: vi.fn(),
    },
    observation: {
      createMany: vi.fn(),
    },
  };
  return { mockPrisma: prismaObj };
});

vi.mock("@/lib/db", () => ({
  db: mockPrisma,
}));

import { importBundledDirectly } from "@/lib/bundled-importer";

describe("Direct Bundled Importer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("imports synthetic demo dataset directly using Prisma", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: "user_test_123" });
    mockPrisma.dataset.create.mockImplementation(({ data }) =>
      Promise.resolve({
        ...data,
        id: data.id || "ds_test_synthetic",
        name: data.name,
        isSynthetic: data.isSynthetic,
      })
    );
    mockPrisma.storedFile.createMany.mockResolvedValue({ count: 3 });
    mockPrisma.observation.createMany.mockResolvedValue({ count: 180 });

    const result = await importBundledDirectly("user_test_123", "synthetic_demo");

    expect(result).toBeDefined();
    expect(result.dataset_id).toBeDefined();
    expect(result.status).toBe("READY");
    expect(result.is_synthetic).toBe(true);
    expect(result.observation_count).toBe(153);

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: "user_test_123" },
      select: { id: true },
    });
    expect(mockPrisma.dataset.create).toHaveBeenCalledOnce();
    expect(mockPrisma.storedFile.createMany).toHaveBeenCalledOnce();
    expect(mockPrisma.observation.createMany).toHaveBeenCalled();
  });

  it("imports frozen archive dataset directly using Prisma", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: "user_test_456" });
    mockPrisma.dataset.create.mockImplementation(({ data }) =>
      Promise.resolve({
        ...data,
        id: data.id || "ds_test_archive",
        name: data.name,
        isSynthetic: data.isSynthetic,
      })
    );
    mockPrisma.storedFile.createMany.mockResolvedValue({ count: 3 });
    mockPrisma.observation.createMany.mockResolvedValue({ count: 597 });

    const result = await importBundledDirectly("user_test_456", "punjab_frozen_archive");

    expect(result).toBeDefined();
    expect(result.dataset_id).toBeDefined();
    expect(result.status).toBe("READY");
    expect(result.is_synthetic).toBe(false);
    expect(result.observation_count).toBe(597);

    expect(mockPrisma.dataset.create).toHaveBeenCalledOnce();
    expect(mockPrisma.storedFile.createMany).toHaveBeenCalledOnce();
    expect(mockPrisma.observation.createMany).toHaveBeenCalled();
  });
});
