import { apiHandler, HttpError } from "@/lib/http";
import { requireUser, assertOwner } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { wakeWorker } from "@/lib/compute";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

const RenameRunSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Display name must be at least 1 character")
    .max(80, "Display name must be at most 80 characters"),
});

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
      include: {
        dataset: {
          select: {
            id: true,
            name: true,
            isSynthetic: true,
          },
        },
      },
    });

    if (!run) {
      throw new HttpError(404, "RUN_NOT_FOUND", `Run ${runId} not found`);
    }
    assertOwner(run.ownerId, user);

    // Cold-start safety: if run has been QUEUED for > 10s, wake the worker again
    if (run.status === "QUEUED") {
      const queuedDurationMs = Date.now() - new Date(run.createdAt).getTime();
      if (queuedDurationMs > 10000) {
        await wakeWorker();
      }
    }

    const elapsedSeconds = run.startedAt
      ? Math.max(
          0,
          Math.floor(
            ((run.completedAt ? new Date(run.completedAt).getTime() : Date.now()) -
              new Date(run.startedAt).getTime()) /
              1000
          )
        )
      : 0;

    return NextResponse.json({
      run: {
        id: run.id,
        displayName: run.displayName,
        mode: run.mode,
        modelType: run.modelType,
        status: run.status,
        stage: run.stage,
        progressDone: run.progressDone,
        progressTotal: run.progressTotal,
        elapsedSeconds,
        cancelRequested: run.cancelRequested,
        createdAt: run.createdAt,
        startedAt: run.startedAt,
        completedAt: run.completedAt,
        errorReference: run.errorReference,
        errorMessage: run.errorMessage,
        hasFit: run.hasFit,
        evaluated: run.evaluated,
        config: run.config,
        configHash: run.configHash,
        dataset: run.dataset,
      },
    });
  }
);

export const PATCH = apiHandler(
  async (
    req: NextRequest,
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

    const body = await req.json();
    const { displayName } = RenameRunSchema.parse(body);

    const updated = await prisma.run.update({
      where: { id: runId },
      data: { displayName },
      select: {
        id: true,
        displayName: true,
        status: true,
      },
    });

    return NextResponse.json({ run: updated });
  }
);

export const DELETE = apiHandler(
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

    const ACTIVE_STATUSES = [
      "QUEUED",
      "VALIDATING",
      "FITTING",
      "EVALUATING",
      "ESTIMATING_UNCERTAINTY",
      "EXPORTING",
    ];

    if (ACTIVE_STATUSES.includes(run.status)) {
      throw new HttpError(
        409,
        "RUN_ACTIVE",
        "Cannot delete an active run. Please cancel it first."
      );
    }

    await prisma.run.delete({
      where: { id: runId },
    });

    return NextResponse.json({ success: true, deletedRunId: runId });
  }
);
