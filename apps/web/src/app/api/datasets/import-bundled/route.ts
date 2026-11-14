import { apiHandler, HttpError } from "@/lib/http";
import { requireUser } from "@/lib/auth-helpers";
import { computeFetch } from "@/lib/compute";
import { ImportBundledSchema } from "@epilens/shared";
import { NextResponse, type NextRequest } from "next/server";
import { importBundledDirectly } from "@/lib/bundled-importer";
import { logger } from "@/lib/logger";

export const POST = apiHandler(async (req: NextRequest) => {
  const user = await requireUser();
  const body = await req.json();
  const input = ImportBundledSchema.parse(body);

  // Attempt compute microservice first with fallback to direct Prisma import
  try {
    const res = await computeFetch("/internal/datasets/import-bundled", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: user.id,
        source_key: input.sourceKey,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }

    logger.warn("Compute service returned non-OK status for bundled import, falling back to direct DB import", {
      status: res.status,
      sourceKey: input.sourceKey,
      userId: user.id,
    });
  } catch (error) {
    logger.warn("Compute service unreachable for bundled import, falling back to direct DB import", {
      error: error instanceof Error ? error.message : String(error),
      sourceKey: input.sourceKey,
      userId: user.id,
    });
  }

  // Fallback / Fast-path: Direct database import ensures 100% resilience
  try {
    const directResult = await importBundledDirectly(user.id, input.sourceKey);
    return NextResponse.json(directResult);
  } catch (directErr) {
    logger.error("Direct bundled import failed", {
      error: directErr instanceof Error ? directErr.message : String(directErr),
      sourceKey: input.sourceKey,
      userId: user.id,
    });
    throw new HttpError(
      500,
      "IMPORT_FAILED",
      directErr instanceof Error ? directErr.message : "Failed to import bundled dataset"
    );
  }
});
