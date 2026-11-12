import { z } from "zod";

export const ScenarioConfigSchema = z.object({
  percentChange: z
    .number()
    .int()
    .min(-50, "Transmission change cannot be below -50%")
    .max(50, "Transmission change cannot exceed +50%")
    .refine((val) => val % 5 === 0, {
      message: "Transmission change must be a multiple of 5",
    }),
  horizonDays: z
    .number()
    .int()
    .min(7, "Horizon must be at least 7 days")
    .max(60, "Horizon cannot exceed 60 days"),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be an ISO date (YYYY-MM-DD)"),
});

export type ScenarioConfig = z.infer<typeof ScenarioConfigSchema>;

export const IntervalSchema = z.object({
  lower: z.number(),
  upper: z.number(),
});

export type Interval = z.infer<typeof IntervalSchema>;

export const ScenarioDailyOutputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  baselineExpectedCases: z.number(),
  scenarioExpectedCases: z.number(),
  baselineInfections: z.number(),
  scenarioInfections: z.number(),
  baselineCumCases: z.number(),
  scenarioCumCases: z.number(),
  baselineCumInfections: z.number(),
  scenarioCumInfections: z.number(),
  casesInterval: IntervalSchema.optional(),
  infectionsInterval: IntervalSchema.optional(),
});

export type ScenarioDailyOutput = z.infer<typeof ScenarioDailyOutputSchema>;

export const ScenarioSummarySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  horizonDays: z.number().int(),
  percentChange: z.number().int(),
  baselineBeta: z.number(),
  scenarioBeta: z.number(),
  baselineExpectedCases: z.number(),
  scenarioExpectedCases: z.number(),
  expectedCasesDiff: z.number(),
  expectedCasesPctDiff: z.number().nullable(),
  baselineInfections: z.number(),
  scenarioInfections: z.number(),
  infectionsDiff: z.number(),
  infectionsPctDiff: z.number().nullable(),
  summaryText: z.string(),
  casesInterval: IntervalSchema.optional(),
  infectionsInterval: IntervalSchema.optional(),
  pctCasesInterval: IntervalSchema.optional(),
  pctInfectionsInterval: IntervalSchema.optional(),
});

export type ScenarioSummary = z.infer<typeof ScenarioSummarySchema>;

export const CreateScenarioInputSchema = z.object({
  parentRunId: z.string().min(1, "Parent run ID is required"),
  percentChange: z
    .number()
    .int()
    .min(-50, "Transmission change cannot be below -50%")
    .max(50, "Transmission change cannot exceed +50%")
    .refine((val) => val % 5 === 0, {
      message: "Transmission change must be a multiple of 5",
    }),
  horizonDays: z
    .number()
    .int()
    .min(7, "Horizon must be at least 7 days")
    .max(60, "Horizon cannot exceed 60 days"),
});

export type CreateScenarioInput = z.infer<typeof CreateScenarioInputSchema>;

export const ScenarioStatusSchema = z.enum([
  "QUEUED",
  "RUNNING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
]);

export type ScenarioStatus = z.infer<typeof ScenarioStatusSchema>;

export const ScenarioRecordSchema = z.object({
  id: z.string(),
  parentRunId: z.string(),
  ownerId: z.string(),
  percentChange: z.number().int(),
  horizonDays: z.number().int(),
  status: ScenarioStatusSchema,
  config: ScenarioConfigSchema,
  dailyOutputs: z.array(ScenarioDailyOutputSchema).nullable().optional(),
  summary: ScenarioSummarySchema.nullable().optional(),
  errorReference: z.string().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  createdAt: z.string(),
  completedAt: z.string().nullable().optional(),
});

export type ScenarioRecord = z.infer<typeof ScenarioRecordSchema>;
