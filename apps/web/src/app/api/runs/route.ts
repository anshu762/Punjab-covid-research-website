import { apiHandler, HttpError } from "@/lib/http";
import { requireUser, assertOwner } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { wakeWorker } from "@/lib/compute";
import {
  RunConfigSchema,
  computeConfigHash,
  computeCacheKey,
  formatDisplayDate,
} from "@epilens/shared";
import { NextResponse, type NextRequest } from "next/server";

export const GET = apiHandler(async (req: NextRequest) => {
  const user = await requireUser();
  const { searchParams } = new URL(req.url);
  const activeOnly = searchParams.get("active") === "true";

  const ACTIVE_STATUSES = [
    "QUEUED",
    "VALIDATING",
    "FITTING",
    "EVALUATING",
    "ESTIMATING_UNCERTAINTY",
    "EXPORTING",
  ] as const;

  const runs = await prisma.run.findMany({
    where: {
      ownerId: user.id,
      ...(activeOnly ? { status: { in: [...ACTIVE_STATUSES] } } : {}),
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      displayName: true,
      mode: true,
      modelType: true,
      status: true,
      stage: true,
      progressDone: true,
      progressTotal: true,
      createdAt: true,
      startedAt: true,
      completedAt: true,
      configHash: true,
      cacheKey: true,
      hasFit: true,
      evaluated: true,
      errorReference: true,
      errorMessage: true,
    },
    take: activeOnly ? 5 : 20,
  });

  return NextResponse.json({ runs });
});

export const POST = apiHandler(async (req: NextRequest) => {
  const user = await requireUser();
  const idempotencyKey = req.headers.get("idempotency-key") || req.headers.get("Idempotency-Key");

  if (!idempotencyKey || idempotencyKey.trim().length === 0) {
    throw new HttpError(422, "MISSING_IDEMPOTENCY_KEY", "Idempotency-Key header is required");
  }

  const body = await req.json();
  const config = RunConfigSchema.parse(body);

  // Load dataset and verify ownership and ready state
  const dataset = await prisma.dataset.findUnique({
    where: { id: config.datasetId },
  });

  if (!dataset) {
    throw new HttpError(404, "DATASET_NOT_FOUND", `Dataset ${config.datasetId} not found`);
  }
  assertOwner(dataset.ownerId, user);

  if (dataset.status !== "READY") {
    throw new HttpError(409, "DATASET_NOT_READY", `Dataset is ${dataset.status}, must be READY to run analysis`);
  }

  if (
    !dataset.populationValue ||
    !dataset.populationSourceUrl ||
    !dataset.populationGeography
  ) {
    throw new HttpError(
      422,
      "population_provenance_missing",
      "Empirical fitting is blocked until population provenance is provided",
      "population"
    );
  }

  // Check active jobs limit (max 2 active jobs per user)
  const ACTIVE_STATUSES = [
    "QUEUED",
    "VALIDATING",
    "FITTING",
    "EVALUATING",
    "ESTIMATING_UNCERTAINTY",
    "EXPORTING",
  ] as const;

  const activeCount = await prisma.run.count({
    where: {
      ownerId: user.id,
      status: { in: [...ACTIVE_STATUSES] },
    },
  });

  if (activeCount >= 2) {
    throw new HttpError(
      429,
      "JOB_LIMIT",
      "You have reached the limit of 2 concurrent analysis jobs. Please wait for an existing job to complete or cancel it."
    );
  }

  // Compute config hash and cache key
  const configHash = computeConfigHash(config);
  const codeVersion = process.env.CODE_REVISION || "dev";
  const cacheKey = computeCacheKey(dataset.sha256, configHash, codeVersion);

  // Check idempotency retry
  const existingIdempotentRun = await prisma.run.findUnique({
    where: {
      ownerId_idempotencyKey: {
        ownerId: user.id,
        idempotencyKey,
      },
    },
  });

  if (existingIdempotentRun) {
    return NextResponse.json({ runId: existingIdempotentRun.id }, { status: 200 });
  }

  // Check cache for identical completed run
  const cachedCompletedRun = await prisma.run.findFirst({
    where: {
      ownerId: user.id,
      cacheKey,
      status: "COMPLETED",
    },
    orderBy: { createdAt: "desc" },
  });

  if (cachedCompletedRun) {
    return NextResponse.json(
      {
        runId: cachedCompletedRun.id,
        cached: true,
        message: "Identical analysis already completed — opened the saved result",
      },
      { status: 200 }
    );
  }

  // Format auto display name: "Fit · M1 · 01 Jul 2020 – 30 Nov 2020"
  const startFmt = formatDisplayDate(config.dateRange.start);
  const endFmt = formatDisplayDate(config.dateRange.end);
  const autoDisplayName = `${config.mode === "FIT" ? "Fit" : "Evaluation"} · ${config.modelType} · ${startFmt} – ${endFmt}`;

  // Create Run and Job in transaction
  const result = await prisma.$transaction(async (tx) => {
    const run = await tx.run.create({
      data: {
        ownerId: user.id,
        datasetId: dataset.id,
        displayName: autoDisplayName,
        mode: config.mode,
        modelType: config.modelType,
        config: config as unknown as Prisma.InputJsonValue,
        configHash,
        cacheKey,
        idempotencyKey,
        status: "QUEUED",
        stage: "queued",
        codeVersion,
        seed: config.advanced.seed,
      },
    });

    await tx.job.create({
      data: {
        type: "RUN",
        refId: run.id,
        status: "QUEUED",
      },
    });

    return run;
  });

  // Wake background worker
  await wakeWorker();

  return NextResponse.json(
    {
      runId: result.id,
      status: result.status,
      cacheKey,
      cached: false,
    },
    { status: 202 }
  );
});
