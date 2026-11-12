import { apiHandler, HttpError } from "@/lib/http";
import { requireUser, assertOwner } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { wakeWorker } from "@/lib/compute";
import { CreateScenarioInputSchema, addDays } from "@epilens/shared";
import { NextResponse, type NextRequest } from "next/server";

export const GET = apiHandler(async (req: NextRequest) => {
  const user = await requireUser();
  const { searchParams } = new URL(req.url);
  const parentRunId = searchParams.get("parentRunId");

  const scenarios = await prisma.scenario.findMany({
    where: {
      ownerId: user.id,
      ...(parentRunId ? { parentRunId } : {}),
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      parentRunId: true,
      percentChange: true,
      horizonDays: true,
      status: true,
      config: true,
      summary: true,
      errorReference: true,
      errorMessage: true,
      createdAt: true,
      completedAt: true,
    },
    take: 50,
  });

  return NextResponse.json({ scenarios });
});

export const POST = apiHandler(async (req: NextRequest) => {
  const user = await requireUser();
  const body = await req.json();
  const input = CreateScenarioInputSchema.parse(body);

  // 1. Verify parent run ownership and readiness
  const parentRun = await prisma.run.findUnique({
    where: { id: input.parentRunId },
    include: { fitResult: true },
  });

  if (!parentRun) {
    throw new HttpError(404, "RUN_NOT_FOUND", `Parent run ${input.parentRunId} not found`);
  }
  assertOwner(parentRun.ownerId, user);

  if (parentRun.status !== "COMPLETED" || !parentRun.hasFit || !parentRun.fitResult) {
    throw new HttpError(
      409,
      "RUN_NOT_COMPLETED",
      "Parent run must be completed with a fitted model before running scenarios"
    );
  }

  // 2. Active jobs limit check (max 2 active jobs per user)
  const activeRunsCount = await prisma.run.count({
    where: {
      ownerId: user.id,
      status: {
        in: [
          "QUEUED",
          "VALIDATING",
          "FITTING",
          "EVALUATING",
          "ESTIMATING_UNCERTAINTY",
          "EXPORTING",
        ],
      },
    },
  });

  const activeScenariosCount = await prisma.scenario.count({
    where: {
      ownerId: user.id,
      status: { in: ["QUEUED", "RUNNING"] },
    },
  });

  if (activeRunsCount + activeScenariosCount >= 2) {
    throw new HttpError(
      429,
      "JOB_LIMIT",
      "You have reached the limit of 2 concurrent background jobs. Please wait for an existing job to complete."
    );
  }

  // 3. Compute exact start date = day immediately after parent fitted date
  const rawPayload = parentRun.fitResult.payload as Record<string, unknown>;
  const finalState = (rawPayload.finalState || {}) as Record<string, unknown>;
  const lastDate = typeof finalState.date === "string" ? finalState.date : "2020-11-30";
  const startDate = addDays(lastDate, 1);

  const config = {
    percentChange: input.percentChange,
    horizonDays: input.horizonDays,
    startDate,
  };

  // 4. Create scenario record and background job
  const scenario = await prisma.scenario.create({
    data: {
      ownerId: user.id,
      parentRunId: parentRun.id,
      percentChange: input.percentChange,
      horizonDays: input.horizonDays,
      status: "QUEUED",
      config,
    },
  });

  await prisma.job.create({
    data: {
      type: "SCENARIO",
      refId: scenario.id,
      status: "QUEUED",
    },
  });

  // 5. Wake worker
  await wakeWorker();

  return NextResponse.json({ scenarioId: scenario.id }, { status: 202 });
});
