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
    const scenarioId = params.id;

    const scenario = await prisma.scenario.findUnique({
      where: { id: scenarioId },
      include: {
        parentRun: {
          select: {
            id: true,
            displayName: true,
            modelType: true,
            dataset: {
              select: {
                id: true,
                name: true,
                isSynthetic: true,
              },
            },
          },
        },
      },
    });

    if (!scenario) {
      throw new HttpError(404, "SCENARIO_NOT_FOUND", `Scenario ${scenarioId} not found`);
    }
    assertOwner(scenario.ownerId, user);

    // Cold-start worker wake if queued for more than 10s
    if (scenario.status === "QUEUED") {
      const queuedDurationMs = Date.now() - new Date(scenario.createdAt).getTime();
      if (queuedDurationMs > 10000) {
        await wakeWorker();
      }
    }

    return NextResponse.json({ scenario });
  }
);

export const DELETE = apiHandler(
  async (
    _req: NextRequest,
    ctx?: unknown
  ) => {
    const user = await requireUser();
    const params = await (ctx as { params: Promise<{ id: string }> }).params;
    const scenarioId = params.id;

    const scenario = await prisma.scenario.findUnique({
      where: { id: scenarioId },
    });

    if (!scenario) {
      throw new HttpError(404, "SCENARIO_NOT_FOUND", `Scenario ${scenarioId} not found`);
    }
    assertOwner(scenario.ownerId, user);

    if (scenario.status === "RUNNING") {
      throw new HttpError(
        409,
        "SCENARIO_RUNNING",
        "Cannot delete a scenario while simulation is actively running"
      );
    }

    // Clean up any pending jobs for this scenario
    await prisma.job.deleteMany({
      where: {
        type: "SCENARIO",
        refId: scenarioId,
      },
    });

    await prisma.scenario.delete({
      where: { id: scenarioId },
    });

    return NextResponse.json({ success: true, deletedId: scenarioId });
  }
);
