import { prisma } from "@/lib/db";
import { verifyExportToken } from "@/lib/exportToken";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(
  req: NextRequest,
  ctx?: unknown
) {
  const params = await (ctx as { params: Promise<{ id: string }> }).params;
  const exportId = params.id;
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Download token is missing" } },
      { status: 401 }
    );
  }

  // 1. Verify token cryptographic signature and expiry
  const verification = verifyExportToken(token, exportId);
  if (!verification.valid) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: verification.error || "Invalid or expired download token" } },
      { status: 401 }
    );
  }

  // 2. Fetch export record and stored file
  const exportRecord = await prisma.export.findUnique({
    where: { id: exportId },
  });

  if (!exportRecord) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: `Export ${exportId} not found` } },
      { status: 404 }
    );
  }

  if (exportRecord.status !== "READY" || !exportRecord.fileId) {
    return NextResponse.json(
      { error: { code: "NOT_READY", message: "Export file is not ready for download" } },
      { status: 409 }
    );
  }

  const storedFile = await prisma.storedFile.findUnique({
    where: { id: exportRecord.fileId },
  });

  if (!storedFile) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Stored file not found" } },
      { status: 404 }
    );
  }

  // 3. Return streaming response with appropriate attachment headers
  const contentBytes = storedFile.content;

  return new Response(new Blob([contentBytes.buffer as ArrayBuffer]), {
    status: 200,
    headers: {
      "Content-Type": storedFile.mimeType,
      "Content-Disposition": `attachment; filename="${storedFile.filename}"`,
      "Content-Length": String(storedFile.sizeBytes),
      "ETag": `"${storedFile.sha256}"`,
      "Cache-Control": "private, no-transform, max-age=300",
    },
  });
}
