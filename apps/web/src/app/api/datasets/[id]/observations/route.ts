import { apiHandler, HttpError } from "@/lib/http";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { QualityFlagEnum } from "@epilens/shared";
import { NextResponse, type NextRequest } from "next/server";

export const GET = apiHandler(async (req: NextRequest, ctx: unknown) => {
  const user = await requireUser();
  const { params } = ctx as { params: Promise<{ id: string }> };
  const { id } = await params;

  const dataset = await prisma.dataset.findFirst({
    where: { id, ownerId: user.id },
  });

  if (!dataset) {
    throw new HttpError(404, "NOT_FOUND", "Dataset not found or unauthorized");
  }

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const pageSize = Math.min(500, Math.max(10, parseInt(url.searchParams.get("pageSize") || "50", 10)));
  const filterFlag = url.searchParams.get("filterFlag");
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");
  const all = url.searchParams.get("all") === "true"; // allow fetching all for charts

  const whereClause: Record<string, unknown> = {
    datasetId: id,
  };

  if (filterFlag && QualityFlagEnum.options.includes(filterFlag as (typeof QualityFlagEnum.options)[number])) {
    whereClause.qualityFlag = filterFlag;
  }

  if (startDate || endDate) {
    whereClause.date = {
      ...(startDate ? { gte: new Date(startDate) } : {}),
      ...(endDate ? { lte: new Date(endDate) } : {}),
    };
  }

  const total = await prisma.observation.count({ where: whereClause });

  const observations = await prisma.observation.findMany({
    where: whereClause,
    orderBy: { date: "asc" },
    skip: all ? undefined : (page - 1) * pageSize,
    take: all ? undefined : pageSize,
    select: {
      date: true,
      newConfirmedRaw: true,
      newConfirmedAnalysis: true,
      qualityFlag: true,
      sourceRef: true,
      transformationId: true,
    },
  });

  const formattedObservations = observations.map((o: {
    date: Date;
    newConfirmedRaw: number | null;
    newConfirmedAnalysis: number | null;
    qualityFlag: string;
    sourceRef: string | null;
    transformationId: string | null;
  }) => ({
    date: o.date.toISOString().split("T")[0],
    new_confirmed_raw: o.newConfirmedRaw,
    new_confirmed_analysis: o.newConfirmedAnalysis,
    quality_flag: o.qualityFlag,
    source_ref: o.sourceRef,
    transformation_id: o.transformationId,
  }));

  return NextResponse.json({
    observations: formattedObservations,
    total,
    page: all ? 1 : page,
    pageSize: all ? total : pageSize,
    totalPages: all ? 1 : Math.ceil(total / pageSize),
  });
});
