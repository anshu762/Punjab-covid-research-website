import { z } from "zod";

export const SensitivityComboRowSchema = z.object({
  comboIndex: z.number().int().min(1).max(27),
  infectiousDurationDays: z.number(),
  reportingFraction: z.number(),
  susceptibleFraction: z.number(),
  m1FinalMae: z.number().nullable(),
  m2FinalMae: z.number().nullable(),
  winningModel: z.enum(["M1", "M2"]),
  bestBaselineMae: z.number().nullable(),
  improvementPct: z.number().nullable(),
  verdict: z.enum(["SUPPORTED", "NOT_DEMONSTRATED"]),
  isReversal: z.boolean(),
  reversalReason: z.string().nullable(),
});

export type SensitivityComboRow = z.infer<typeof SensitivityComboRowSchema>;

export const SensitivitySummarySchema = z.object({
  totalCombos: z.literal(27),
  m2Wins: z.number().int(),
  m1Wins: z.number().int(),
  reversalsCount: z.number().int(),
  verdictReversalsCount: z.number().int(),
  stabilityPct: z.number(),
  stabilityStatement: z.string(),
  reducedSettingsNote: z.string(),
});

export type SensitivitySummary = z.infer<typeof SensitivitySummarySchema>;

export const SensitivityResultPayloadSchema = z.object({
  runId: z.string(),
  combos: z.array(SensitivityComboRowSchema),
  summary: SensitivitySummarySchema,
  createdAt: z.string(),
});

export type SensitivityResultPayload = z.infer<typeof SensitivityResultPayloadSchema>;
