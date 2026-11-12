import { apiHandler, HttpError } from "@/lib/http";
import { requireUser, assertOwner } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { wakeWorker } from "@/lib/compute";
import { NextResponse, type NextRequest } from "next/server";

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
    });

    if (!run) {
      throw new HttpError(404, "RUN_NOT_FOUND", `Run ${runId} not found`);
    }
    assertOwner(run.ownerId, user);

    const TERMINAL_STATUSES = ["COMPLETED", "FAILED", "CANCELLED"];
    if (TERMINAL_STATUSES.includes(run.status)) {
      throw new HttpError(
        409,
        "RUN_ALREADY_TERMINAL",
        `Cannot cancel a run with status '${run.status}'`
      );
    }

    await prisma.run.update({
      where: { id: runId },
      data: { cancelRequested: true },
    });

    // Notify compute worker to abort tasks promptly
    await wakeWorker();

    return NextResponse.json({
      runId,
      cancelRequested: true,
      message: "Cancellation requested. The run will terminate at the next task checkpoint.",
    });
  }
);
