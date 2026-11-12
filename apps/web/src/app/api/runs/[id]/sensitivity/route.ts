import { apiHandler, HttpError } from "@/lib/http";
import { requireUser, assertOwner } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { wakeWorker } from "@/lib/compute";
import { NextResponse, type NextRequest } from "next/server";

export const GET = apiHandler(
  async (
    _req: NextRequest,
    ctx?: unknown
  ) => {
    const user = await requireUser();
    const params = await (ctx as { params: Promise<{ id: string }> }).params;
    const runId = params.id;

    const run = await prisma.run.findUnique({
      where: { id: runId },
    });
    if (!run) {
      throw new HttpError(404, "RUN_NOT_FOUND", `Run ${runId} not found`);
    }
    assertOwner(run.ownerId, user);

    const sensitivity = await prisma.sensitivityResult.findUnique({
      where: { runId },
    });

    // Check if there is an active job for sensitivity
    const activeJob = await prisma.job.findFirst({
      where: {
        type: "SENSITIVITY",
        refId: runId,
        status: { in: ["QUEUED", "RUNNING"] },
      },
    });

    return NextResponse.json({
      sensitivity,
      status: activeJob ? activeJob.status : sensitivity ? "COMPLETED" : "IDLE",
    });
  }
);

export const POST = apiHandler(
  async (
    _req: NextRequest,
    ctx?: unknown
  ) => {
    const user = await requireUser();
    const params = await (ctx as { params: Promise<{ id: string }> }).params;
    const runId = params.id;

    const run = await prisma.run.findUnique({
      where: { id: runId },
      include: { fitResult: true },
    });
    if (!run) {
      throw new HttpError(404, "RUN_NOT_FOUND", `Run ${runId} not found`);
    }
    assertOwner(run.ownerId, user);

    if (run.status !== "COMPLETED" || run.mode !== "EVALUATE" || !run.hasFit) {
      throw new HttpError(
        409,
        "RUN_NOT_EVALUATED",
        "Sensitivity analysis requires a completed run with 7-day forecast evaluation"
      );
    }

    // Check active jobs rate limit
    const activeJobs = await prisma.job.count({
      where: {
        status: { in: ["QUEUED", "RUNNING"] },
      },
    });

    if (activeJobs >= 4) {
      throw new HttpError(
        429,
        "JOB_LIMIT",
        "Multiple background jobs are currently running. Please wait for completion."
      );
    }

    // Create Job record
    await prisma.job.create({
      data: {
        type: "SENSITIVITY",
        refId: runId,
        status: "QUEUED",
      },
    });

    // Wake compute worker
    await wakeWorker();

    return NextResponse.json({ runId, status: "QUEUED" }, { status: 202 });
  }
);
