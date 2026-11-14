import "server-only";
import { db } from "./db";
import bundledDataJson from "@/content/bundledDatasets.json";
import { logger } from "./logger";
import { randomUUID } from "node:crypto";
import type { QualityFlag } from "@prisma/client";

interface BundledDatasetRecord {
  name: string;
  is_synthetic: boolean;
  population: number;
  population_provenance: string;
  sha256: string;
  raw_csv: string;
  clean_csv: string;
  quality_log: string;
  quality_summary: Record<string, unknown>;
  date_start: string;
  date_end: string;
  observations: Array<{
    date: string;
    raw: number | null;
    analysis: number;
    flag: string;
    transformation_id: string | null;
    source_ref: string | null;
  }>;
}

const bundledData = bundledDataJson as Record<string, BundledDatasetRecord>;

export async function importBundledDirectly(
  userId: string,
  sourceKey: string
): Promise<{
  dataset_id: string;
  name: string;
  status: string;
  is_synthetic: boolean;
  observation_count: number;
  date_start: string;
  date_end: string;
}> {
  const data = bundledData[sourceKey];
  if (!data) {
    throw new Error(`Unknown bundled source: ${sourceKey}`);
  }

  // Verify user exists in database
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }

  const datasetId = randomUUID().replace(/-/g, "").slice(0, 25);
  const familyId = randomUUID().replace(/-/g, "").slice(0, 25);
  const rawFileId = randomUUID().replace(/-/g, "").slice(0, 25);
  const cleanFileId = randomUUID().replace(/-/g, "").slice(0, 25);
  const logFileId = randomUUID().replace(/-/g, "").slice(0, 25);

  const rawBytes = Buffer.from(data.raw_csv, "utf-8");
  const cleanBytes = Buffer.from(data.clean_csv, "utf-8");
  const logBytes = Buffer.from(data.quality_log, "utf-8");

  logger.info("Importing bundled dataset directly via Prisma", {
    userId,
    sourceKey,
    datasetId,
  });

  // 1. Create dataset
  const dataset = await db.dataset.create({
    data: {
      id: datasetId,
      ownerId: userId,
      familyId,
      version: 1,
      name: data.name,
      regionCode: "PB",
      isSynthetic: data.is_synthetic,
      sourceKind: data.is_synthetic ? "SYNTHETIC" : "ARCHIVE",
      sourceName: sourceKey,
      sourceUrl: data.is_synthetic ? null : "https://data.covid19india.org",
      retrievedAt: new Date(),
      sha256: data.sha256,
      status: "READY",
      rawFileId,
      cleanFileId,
      qualityLogFileId: logFileId,
      schemaMapping: { date: "date", new_confirmed: "confirmed", region_code: "region_code" },
      qualitySummary: data.quality_summary as object,
      populationValue: data.population,
      populationGeography: "Punjab, India",
      populationReferenceYear: 2011,
      populationSourceUrl: "https://censusindia.gov.in/",
    },
  });

  // 2. Create stored files
  await db.storedFile.createMany({
    data: [
      {
        id: rawFileId,
        ownerId: userId,
        datasetId: dataset.id,
        kind: "RAW_UPLOAD",
        filename: `${sourceKey}.csv`,
        mimeType: "text/csv",
        sizeBytes: rawBytes.length,
        sha256: data.sha256,
        content: rawBytes,
      },
      {
        id: cleanFileId,
        ownerId: userId,
        datasetId: dataset.id,
        kind: "CLEAN_CSV",
        filename: "clean_observations.csv",
        mimeType: "text/csv",
        sizeBytes: cleanBytes.length,
        sha256: data.sha256,
        content: cleanBytes,
      },
      {
        id: logFileId,
        ownerId: userId,
        datasetId: dataset.id,
        kind: "QUALITY_LOG",
        filename: "quality_log.json",
        mimeType: "application/json",
        sizeBytes: logBytes.length,
        sha256: data.sha256,
        content: logBytes,
      },
    ],
  });

  // 3. Create observations in batches
  const obsData = data.observations.map((obs) => ({
    datasetId: dataset.id,
    date: new Date(`${obs.date}T00:00:00.000Z`),
    newConfirmedRaw: obs.raw,
    newConfirmedAnalysis: obs.analysis,
    qualityFlag: obs.flag as QualityFlag,
    transformationId: obs.transformation_id,
    sourceRef: obs.source_ref,
  }));

  // Batch insert observations (in chunks of 200 for Neon DB efficiency)
  const CHUNK_SIZE = 200;
  for (let i = 0; i < obsData.length; i += CHUNK_SIZE) {
    const chunk = obsData.slice(i, i + CHUNK_SIZE);
    await db.observation.createMany({
      data: chunk,
      skipDuplicates: true,
    });
  }

  return {
    dataset_id: dataset.id,
    name: dataset.name,
    status: "READY",
    is_synthetic: dataset.isSynthetic,
    observation_count: data.observations.length,
    date_start: data.date_start,
    date_end: data.date_end,
  };
}
