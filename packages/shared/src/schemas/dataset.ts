import { z } from "zod";

export const QualityFlagEnum = z.enum([
  "OK",
  "MISSING",
  "DUPLICATE",
  "CORRECTED",
  "CORRECTION_DAY",
  "UNRESOLVED_CORRECTION",
]);
export type QualityFlag = z.infer<typeof QualityFlagEnum>;

export const ColumnMappingSchema = z.object({
  date: z.string().min(1, "Date column is required"),
  new_confirmed: z.string().min(1, "Confirmed count column is required"),
  region_code: z.string().optional(),
});
export type ColumnMapping = z.infer<typeof ColumnMappingSchema>;

export const ConfirmDatasetSchema = z.object({
  datasetId: z.string().min(1),
  columnMapping: ColumnMappingSchema,
  dateRange: z
    .tuple([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)])
    .optional(),
  population: z.number().int().positive().optional(),
});
export type ConfirmDatasetInput = z.infer<typeof ConfirmDatasetSchema>;

export const ImportBundledSchema = z.object({
  sourceKey: z.enum(["punjab_frozen_archive", "synthetic_demo"]),
});
export type ImportBundledInput = z.infer<typeof ImportBundledSchema>;

export const FetchArchiveSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
export type FetchArchiveInput = z.infer<typeof FetchArchiveSchema>;

export const UpdatePopulationSchema = z.object({
  populationValue: z.number().int().min(10000, "Population must be at least 10,000"),
  populationGeography: z.string().min(2, "Geography description is required"),
  populationReferenceYear: z.number().int().min(1900).max(2100).optional(),
  populationSourceUrl: z.string().url().optional().or(z.literal("")),
});
export type UpdatePopulationInput = z.infer<typeof UpdatePopulationSchema>;

export const ObservationItemSchema = z.object({
  date: z.string(),
  new_confirmed_raw: z.number().nullable(),
  new_confirmed_analysis: z.number().nullable(),
  quality_flag: QualityFlagEnum,
  source_ref: z.string().nullable(),
  transformation_id: z.string().nullable(),
});
export type ObservationItem = z.infer<typeof ObservationItemSchema>;
