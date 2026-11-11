import { apiHandler, HttpError } from "@/lib/http";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { NextResponse, type NextRequest } from "next/server";

export const GET = apiHandler(async (_req: NextRequest, ctx: unknown) => {
  const user = await requireUser();
  const { params } = ctx as { params: Promise<{ id: string }> };
  const { id } = await params;

  const dataset = await prisma.dataset.findFirst({
    where: { id, ownerId: user.id },
  });

  if (!dataset || !dataset.qualityLogFileId) {
    throw new HttpError(404, "NOT_FOUND", "Quality log not found");
  }

  const storedFile = await prisma.storedFile.findFirst({
    where: { id: dataset.qualityLogFileId, ownerId: user.id },
  });

  if (!storedFile || !storedFile.content) {
    throw new HttpError(404, "NOT_FOUND", "Log payload not available");
  }

  const safeName = dataset.name.replace(/[^a-zA-Z0-9_-]/g, "_");

  const textContent = new TextDecoder().decode(storedFile.content);

  return new NextResponse(textContent, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeName}_quality_log.json"`,
      "Cache-Control": "private, no-cache",
    },
  });
});
