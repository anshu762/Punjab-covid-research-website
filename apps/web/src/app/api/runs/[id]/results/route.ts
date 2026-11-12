import { apiHandler, HttpError } from "@/lib/http";
import { requireUser, assertOwner } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
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
      include: {
        fitResult: true,
        forecastRows: {
          orderBy: [{ originDate: "asc" }, { model: "asc" }, { targetDate: "asc" }],
        },
        dataset: {
          select: {
            id: true,
            name: true,
            isSynthetic: true,
            version: true,
          },
        },
      },
    });

    if (!run) {
      throw new HttpError(404, "RUN_NOT_FOUND", `Run ${runId} not found`);
    }
    assertOwner(run.ownerId, user);

    if (run.status !== "COMPLETED") {
      throw new HttpError(
        409,
        "RUN_NOT_COMPLETED",
        `Results are only available once the analysis run has completed (current status: ${run.status})`
      );
    }

    if (!run.fitResult) {
      throw new HttpError(
        500,
        "FIT_RESULT_MISSING",
        "Completed run does not have an associated fit result payload"
      );
    }

    return NextResponse.json({
      runId: run.id,
      metadata: {
        displayName: run.displayName,
        mode: run.mode,
        modelType: run.modelType,
        status: run.status,
        completedAt: run.completedAt,
        codeVersion: run.codeVersion,
        seed: run.seed,
        config: run.config,
        configHash: run.configHash,
        dataset: run.dataset,
      },
      payload: run.fitResult.payload,
      parameters: run.fitResult.parameters,
      assumptions: run.fitResult.assumptions,
      convergence: run.fitResult.convergence,
      boundaryHits: run.fitResult.boundaryHits,
      changePoint: run.fitResult.changePoint,
      forecastRows: run.forecastRows.map((row) => ({
        id: row.id,
        model: row.model,
        originDate: row.originDate.toISOString().slice(0, 10),
        targetDate: row.targetDate.toISOString().slice(0, 10),
        split: row.split,
        estimate: row.estimate,
        lower: row.lower,
        upper: row.upper,
        intervalUnavailableReason: row.intervalUnavailableReason,
        actual: row.actual,
      })),
    });
  }
);
