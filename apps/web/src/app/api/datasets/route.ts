import { apiHandler } from "@/lib/http";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export const GET = apiHandler(async () => {
  const user = await requireUser();

  const datasets = await prisma.dataset.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      familyId: true,
      version: true,
      name: true,
      regionCode: true,
      isSynthetic: true,
      sourceKind: true,
      sourceName: true,
      status: true,
      populationValue: true,
      populationGeography: true,
      populationReferenceYear: true,
      populationSourceUrl: true,
      qualitySummary: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ datasets });
});
