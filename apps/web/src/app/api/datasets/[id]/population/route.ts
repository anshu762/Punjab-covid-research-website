import { apiHandler, HttpError } from "@/lib/http";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { UpdatePopulationSchema } from "@epilens/shared";
import { NextResponse, type NextRequest } from "next/server";

export const PATCH = apiHandler(async (req: NextRequest, ctx: unknown) => {
  const user = await requireUser();
  const { params } = ctx as { params: Promise<{ id: string }> };
  const { id } = await params;

  const dataset = await prisma.dataset.findFirst({
    where: { id, ownerId: user.id },
  });

  if (!dataset) {
    throw new HttpError(404, "NOT_FOUND", "Dataset not found or unauthorized");
  }

  const body = await req.json();
  const input = UpdatePopulationSchema.parse(body);

  const updated = await prisma.dataset.update({
    where: { id },
    data: {
      populationValue: input.populationValue,
      populationGeography: input.populationGeography,
      populationReferenceYear: input.populationReferenceYear ?? null,
      populationSourceUrl: input.populationSourceUrl || null,
      updatedAt: new Date(),
    },
  });

  return NextResponse.json({ dataset: updated });
});
