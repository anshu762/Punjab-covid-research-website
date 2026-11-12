import { z } from "zod";

export const ExportTypeSchema = z.enum([
  "CLEANED_DATASET_CSV",
  "CORRECTION_LOG_CSV",
  "FITTED_STATES_CSV",
  "FORECASTS_CSV",
  "METRICS_CSV",
  "PARAMETERS_JSON",
  "FIGURE_PNG",
  "FIGURE_SVG",
  "SCENARIO_CSV",
  "BUNDLE_ZIP",
]);

export type ExportType = z.infer<typeof ExportTypeSchema>;

export const CreateExportInputSchema = z.object({
  type: ExportTypeSchema,
  scenarioId: z.string().optional(),
});

export type CreateExportInput = z.infer<typeof CreateExportInputSchema>;

export const ExportStatusSchema = z.enum(["QUEUED", "RUNNING", "READY", "FAILED"]);

export type ExportStatus = z.infer<typeof ExportStatusSchema>;

export const ManifestFileItemSchema = z.object({
  filename: z.string(),
  sha256: z.string(),
  sizeBytes: z.number().int(),
});

export type ManifestFileItem = z.infer<typeof ManifestFileItemSchema>;

export const ReproducibilityManifestSchema = z.object({
  schemaVersion: z.literal(1),
  runId: z.string(),
  exportedAt: z.string(),
  codeVersion: z.string(),
  environment: z.object({
    pythonVersion: z.string(),
    os: z.string(),
    packages: z.record(z.string(), z.string()),
  }),
  dataset: z.object({
    id: z.string(),
    name: z.string(),
    version: z.number().int(),
    sha256: z.string(),
  }),
  files: z.array(ManifestFileItemSchema),
});

export type ReproducibilityManifest = z.infer<typeof ReproducibilityManifestSchema>;

export const ExportRecordSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  runId: z.string(),
  scenarioId: z.string().nullable().optional(),
  type: ExportTypeSchema,
  status: ExportStatusSchema,
  fileId: z.string().nullable().optional(),
  checksum: z.string().nullable().optional(),
  manifest: ReproducibilityManifestSchema.nullable().optional(),
  errorReference: z.string().nullable().optional(),
  createdAt: z.string(),
  expiresAt: z.string().nullable().optional(),
  downloadUrl: z.string().optional(),
  filename: z.string().optional(),
  sizeBytes: z.number().int().optional(),
});

export type ExportRecord = z.infer<typeof ExportRecordSchema>;
