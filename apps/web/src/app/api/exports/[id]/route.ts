import { apiHandler, HttpError } from "@/lib/http";
import { requireUser, assertOwner } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { wakeWorker } from "@/lib/compute";
import { generateExportToken } from "@/lib/exportToken";
import { NextResponse, type NextRequest } from "next/server";

export const GET = apiHandler(
  async (
    _req: NextRequest,
    ctx?: unknown
  ) => {
    const user = await requireUser();
    const params = await (ctx as { params: Promise<{ id: string }> }).params;
    const exportId = params.id;

    const exportRecord = await prisma.export.findUnique({
      where: { id: exportId },
      include: {
        run: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    });

    if (!exportRecord) {
      throw new HttpError(404, "EXPORT_NOT_FOUND", `Export ${exportId} not found`);
    }
    assertOwner(exportRecord.ownerId, user);

    // Cold-start worker wake if queued for > 10s
    if (exportRecord.status === "QUEUED") {
      const queuedDurationMs = Date.now() - new Date(exportRecord.createdAt).getTime();
      if (queuedDurationMs > 10000) {
        await wakeWorker();
      }
    }

    let downloadUrl: string | undefined;
    let filename: string | undefined;
    let sizeBytes: number | undefined;

    if (exportRecord.status === "READY" && exportRecord.fileId) {
      const token = generateExportToken(exportRecord.id, user.id);
      downloadUrl = `/api/exports/${exportRecord.id}/file?token=${encodeURIComponent(token)}`;

      const stored = await prisma.storedFile.findUnique({
        where: { id: exportRecord.fileId },
        select: { filename: true, sizeBytes: true },
      });
      if (stored) {
        filename = stored.filename;
        sizeBytes = stored.sizeBytes;
      }
    }

    return NextResponse.json({
      export: {
        id: exportRecord.id,
        runId: exportRecord.runId,
        scenarioId: exportRecord.scenarioId,
        type: exportRecord.type,
        status: exportRecord.status,
        checksum: exportRecord.checksum,
        manifest: exportRecord.manifest,
        errorReference: exportRecord.errorReference,
        createdAt: exportRecord.createdAt,
        expiresAt: exportRecord.expiresAt,
        downloadUrl,
        filename,
        sizeBytes,
        runDisplayName: exportRecord.run?.displayName,
      },
    });
  }
);
