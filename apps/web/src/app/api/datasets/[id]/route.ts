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

  if (!dataset) {
    throw new HttpError(404, "NOT_FOUND", "Dataset not found or unauthorized");
  }

  return NextResponse.json({ dataset });
});

export const DELETE = apiHandler(async (_req: NextRequest, ctx: unknown) => {
  const user = await requireUser();
  const { params } = ctx as { params: Promise<{ id: string }> };
  const { id } = await params;

  const dataset = await prisma.dataset.findFirst({
    where: { id, ownerId: user.id },
  });

  if (!dataset) {
    throw new HttpError(404, "NOT_FOUND", "Dataset not found or unauthorized");
  }

  await prisma.dataset.delete({
    where: { id },
  });

  return NextResponse.json({ success: true, deletedId: id });
});
