import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { HttpError } from "../lib/http";

interface MockPrisma {
  dataset: { findUnique: ReturnType<typeof vi.fn> };
  run: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  fitResult: { findUnique: ReturnType<typeof vi.fn> };
  forecastRow: { findMany: ReturnType<typeof vi.fn> };
  job: { create: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
}

const { mockPrisma } = vi.hoisted(() => {
  const prismaObj: MockPrisma = {
    dataset: {
      findUnique: vi.fn(),
    },
    run: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    fitResult: {
      findUnique: vi.fn(),
    },
    forecastRow: {
      findMany: vi.fn(),
    },
    job: {
      create: vi.fn(),
    },
    $transaction: vi.fn(async (fn: ((tx: MockPrisma) => Promise<unknown>) | unknown[]) => {
      if (typeof fn === "function") {
        return fn(prismaObj);
      }
      return fn;
    }),
  };
  return { mockPrisma: prismaObj };
});

// Mock dependencies before importing routes
vi.mock("@/lib/auth-helpers", () => {
  return {
    requireUser: vi.fn(),
    assertOwner: vi.fn((ownerId: string, user: { id: string }) => {
      if (ownerId !== user.id) {
        throw new HttpError(403, "FORBIDDEN", "You do not have access to this resource");
      }
    }),
  };
});

vi.mock("@/lib/compute", () => ({
  wakeWorker: vi.fn().mockResolvedValue(undefined),
  computeFetch: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: mockPrisma,
}));

import { requireUser } from "@/lib/auth-helpers";
import { POST as createRun, GET as listRuns } from "../app/api/runs/route";
import { GET as getRun, PATCH as renameRun, DELETE as deleteRun } from "../app/api/runs/[id]/route";
import { POST as cancelRun } from "../app/api/runs/[id]/cancel/route";

const validConfig = {
  datasetId: "ds-123",
  dateRange: { start: "2020-07-01", end: "2020-11-30" },
  population: {
    value: 30000000,
    sourceUrl: "https://censusindia.gov.in",
    referenceYear: 2020,
    geography: "Punjab",
  },
  mode: "FIT",
  modelType: "M1",
  infectiousDurationDays: 7,
  reportingFraction: 0.2,
  susceptibleFraction: 0.95,
  uncertainty: "OFF",
  advanced: {
    betaBounds: [0.01, 2.0],
    initialInfectiousBounds: [1.0, 100000.0],
    dispersionBounds: [0.05, 1000.0],
    nStarts: 20,
    seed: 42,
    rtol: 1e-8,
    atol: 1e-8,
    cpMinSegmentDays: 21,
    cpStepDays: 7,
    cpSearchStarts: 5,
    bootstrapStarts: 1,
    bootstrapReplicates: 200,
  },
};

describe("Run API Routes", () => {
  const user = { id: "user-1", email: "test@example.com", isDemo: false };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireUser).mockResolvedValue(user);
  });

  describe("POST /api/runs", () => {
    it("returns 202 and runId when config is valid and user is owner", async () => {
      mockPrisma.dataset.findUnique.mockResolvedValue({
        id: "ds-123",
        ownerId: "user-1",
        name: "Punjab 2020",
        status: "READY",
        sha256: "hash-dataset",
        populationValue: 30000000,
        populationSourceUrl: "https://censusindia.gov.in",
        populationGeography: "Punjab",
      });
      mockPrisma.run.count.mockResolvedValue(0);
      mockPrisma.run.findUnique.mockResolvedValue(null);
      mockPrisma.run.findFirst.mockResolvedValue(null);
      mockPrisma.run.create.mockResolvedValue({
        id: "run-abc",
        displayName: "Fit M1 (2020-07-01 – 2020-11-30)",
        status: "QUEUED",
        cacheKey: "cache-key-123",
      });

      const req = new NextRequest("http://localhost:3000/api/runs", {
        method: "POST",
        body: JSON.stringify(validConfig),
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": "key-test-1",
        },
      });

      const res = await createRun(req);
      expect(res.status).toBe(202);
      const data = await res.json();
      expect(data.runId).toBe("run-abc");
      expect(data.status).toBe("QUEUED");
      expect(data.cached).toBe(false);
    });

    it("returns 422 when config is invalid (e.g. start >= end)", async () => {
      const invalidConfig = {
        ...validConfig,
        dateRange: { start: "2020-11-30", end: "2020-07-01" },
      };

      const req = new NextRequest("http://localhost:3000/api/runs", {
        method: "POST",
        body: JSON.stringify(invalidConfig),
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": "key-test-2",
        },
      });

      const res = await createRun(req);
      expect(res.status).toBe(422);
      const data = await res.json();
      expect(data.error.code).toBe("INVALID_INPUT");
    });

    it("returns 429 when user already has 2 active runs", async () => {
      mockPrisma.dataset.findUnique.mockResolvedValue({
        id: "ds-123",
        ownerId: "user-1",
        status: "READY",
        populationValue: 30000000,
        populationSourceUrl: "https://censusindia.gov.in",
        populationGeography: "Punjab",
      });
      mockPrisma.run.count.mockResolvedValue(2); // Job limit reached

      const req = new NextRequest("http://localhost:3000/api/runs", {
        method: "POST",
        body: JSON.stringify(validConfig),
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": "key-test-3",
        },
      });

      const res = await createRun(req);
      expect(res.status).toBe(429);
      const data = await res.json();
      expect(data.error.code).toBe("JOB_LIMIT");
    });

    it("returns existing run on idempotent resend", async () => {
      mockPrisma.dataset.findUnique.mockResolvedValue({
        id: "ds-123",
        ownerId: "user-1",
        status: "READY",
        populationValue: 30000000,
        populationSourceUrl: "https://censusindia.gov.in",
        populationGeography: "Punjab",
      });
      mockPrisma.run.count.mockResolvedValue(0);
      mockPrisma.run.findUnique.mockResolvedValue({
        id: "run-existing",
        status: "RUNNING",
      });

      const req = new NextRequest("http://localhost:3000/api/runs", {
        method: "POST",
        body: JSON.stringify(validConfig),
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": "same-key-123",
        },
      });

      const res = await createRun(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.runId).toBe("run-existing");
    });
  });

  describe("GET /api/runs", () => {
    it("returns list of user runs", async () => {
      mockPrisma.run.findMany.mockResolvedValue([
        { id: "run-1", displayName: "Run 1", status: "COMPLETED" },
        { id: "run-2", displayName: "Run 2", status: "QUEUED" },
      ]);

      const req = new NextRequest("http://localhost:3000/api/runs");
      const res = await listRuns(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.runs).toHaveLength(2);
    });
  });

  describe("GET /api/runs/[id]", () => {
    it("returns 404 when run does not exist", async () => {
      mockPrisma.run.findUnique.mockResolvedValue(null);

      const req = new NextRequest("http://localhost:3000/api/runs/non-existent");
      const res = await getRun(req, { params: Promise.resolve({ id: "non-existent" }) });
      expect(res.status).toBe(404);
    });

    it("returns 403 when user is not owner", async () => {
      mockPrisma.run.findUnique.mockResolvedValue({
        id: "run-other",
        ownerId: "other-user",
      });

      const req = new NextRequest("http://localhost:3000/api/runs/run-other");
      const res = await getRun(req, { params: Promise.resolve({ id: "run-other" }) });
      expect(res.status).toBe(403);
    });

    it("returns 200 with run details when user is owner", async () => {
      mockPrisma.run.findUnique.mockResolvedValue({
        id: "run-1",
        ownerId: "user-1",
        displayName: "My Fit Run",
        status: "COMPLETED",
        stage: "completed",
        config: validConfig,
      });

      const req = new NextRequest("http://localhost:3000/api/runs/run-1");
      const res = await getRun(req, { params: Promise.resolve({ id: "run-1" }) });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.run.id).toBe("run-1");
      expect(data.run.status).toBe("COMPLETED");
    });
  });

  describe("PATCH /api/runs/[id]", () => {
    it("renames run successfully", async () => {
      mockPrisma.run.findUnique.mockResolvedValue({
        id: "run-1",
        ownerId: "user-1",
      });
      mockPrisma.run.update.mockResolvedValue({
        id: "run-1",
        displayName: "New Run Name",
        status: "COMPLETED",
      });

      const req = new NextRequest("http://localhost:3000/api/runs/run-1", {
        method: "PATCH",
        body: JSON.stringify({ displayName: "New Run Name" }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await renameRun(req, { params: Promise.resolve({ id: "run-1" }) });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.run.displayName).toBe("New Run Name");
    });
  });

  describe("POST /api/runs/[id]/cancel", () => {
    it("returns 409 if run is already completed", async () => {
      mockPrisma.run.findUnique.mockResolvedValue({
        id: "run-1",
        ownerId: "user-1",
        status: "COMPLETED",
      });

      const req = new NextRequest("http://localhost:3000/api/runs/run-1/cancel", {
        method: "POST",
      });
      const res = await cancelRun(req, { params: Promise.resolve({ id: "run-1" }) });
      expect(res.status).toBe(409);
    });

    it("sets cancelRequested = true when run is active", async () => {
      mockPrisma.run.findUnique.mockResolvedValue({
        id: "run-1",
        ownerId: "user-1",
        status: "FITTING",
      });
      mockPrisma.run.update.mockResolvedValue({
        id: "run-1",
        cancelRequested: true,
      });

      const req = new NextRequest("http://localhost:3000/api/runs/run-1/cancel", {
        method: "POST",
      });
      const res = await cancelRun(req, { params: Promise.resolve({ id: "run-1" }) });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.cancelRequested).toBe(true);
    });
  });

  describe("DELETE /api/runs/[id]", () => {
    it("returns 409 if run is active", async () => {
      mockPrisma.run.findUnique.mockResolvedValue({
        id: "run-1",
        ownerId: "user-1",
        status: "QUEUED",
      });

      const req = new NextRequest("http://localhost:3000/api/runs/run-1", {
        method: "DELETE",
      });
      const res = await deleteRun(req, { params: Promise.resolve({ id: "run-1" }) });
      expect(res.status).toBe(409);
    });

    it("deletes run when in terminal status", async () => {
      mockPrisma.run.findUnique.mockResolvedValue({
        id: "run-1",
        ownerId: "user-1",
        status: "COMPLETED",
      });
      mockPrisma.run.delete.mockResolvedValue({ id: "run-1" });

      const req = new NextRequest("http://localhost:3000/api/runs/run-1", {
        method: "DELETE",
      });
      const res = await deleteRun(req, { params: Promise.resolve({ id: "run-1" }) });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.deletedRunId).toBe("run-1");
    });
  });
});
