import { apiHandler, HttpError } from "@/lib/http";
import { requireUser, assertOwner } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { wakeWorker } from "@/lib/compute";
import { CreateExportInputSchema } from "@epilens/shared";
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

    const exports = await prisma.export.findMany({
      where: {
        ownerId: user.id,
        runId,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ exports });
  }
);

export const POST = apiHandler(
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
    const input = CreateExportInputSchema.parse(body);

    if (input.scenarioId) {
      const scenario = await prisma.scenario.findUnique({
        where: { id: input.scenarioId },
      });
      if (!scenario) {
        throw new HttpError(404, "SCENARIO_NOT_FOUND", `Scenario ${input.scenarioId} not found`);
      }
      assertOwner(scenario.ownerId, user);
    }

    // Create Export record
    const exportRecord = await prisma.export.create({
      data: {
        ownerId: user.id,
        runId,
        scenarioId: input.scenarioId,
        type: input.type,
        status: "QUEUED",
      },
    });

    // Create Job record
    await prisma.job.create({
      data: {
        type: "EXPORT",
        refId: exportRecord.id,
        status: "QUEUED",
      },
    });

    // Wake compute worker
    await wakeWorker();

    return NextResponse.json({ exportId: exportRecord.id }, { status: 202 });
  }
);
