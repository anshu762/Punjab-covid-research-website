import { z } from "zod";
import { PopulationProvenanceSchema } from "./run";

export const ParameterProfilePointSchema = z.object({
  value: z.number(),
  nll: z.number(),
});

export const FittedSeriesPointSchema = z.object({
  date: z.string(),
  observed: z.number().nullable(),
  expected: z.number(),
  lower: z.number().nullable(),
  upper: z.number().nullable(),
  S: z.number(),
  I: z.number(),
  R: z.number(),
  C: z.number(),
  beta: z.number(),
  rEff: z.number(),
});
export type FittedSeriesPoint = z.infer<typeof FittedSeriesPointSchema>;


export const FinalStateSchema = z.object({
  date: z.string(),
  S: z.number(),
  I: z.number(),
  R: z.number(),
  C: z.number(),
  beta: z.number(),
});
export type FinalState = z.infer<typeof FinalStateSchema>;

export const DiagnosticsSchema = z.object({
  residuals: z.array(
    z.object({
      date: z.string(),
      raw: z.number(),
      pearson: z.number(),
    })
  ),
  acf: z.array(
    z.object({
      lag: z.number().int(),
      value: z.number(),
    })
  ),
  acfLimit: z.number(),
  profiles: z.record(z.string(), z.array(ParameterProfilePointSchema)),
  warnings: z.array(z.string()),
  status: z.enum(["ok", "warnings", "problems"]),
});
export type Diagnostics = z.infer<typeof DiagnosticsSchema>;

export const ChangePointCandidateSchema = z.object({
  date: z.string(),
  dayIndex: z.number().int().optional(),
  nll: z.number(),
});

export const ChangePointSchema = z.object({
  date: z.string(),
  dayIndex: z.number().int(),
  candidates: z.array(ChangePointCandidateSchema),
  note: z.string(),
});
export type ChangePoint = z.infer<typeof ChangePointSchema>;

export const ConvergenceSchema = z.object({
  nStarts: z.number().int(),
  nConverged: z.number().int(),
  bestNll: z.number(),
  nllSpread: z.number(),
  messages: z.array(z.string()),
  n_starts_effective: z.number().int().optional(),
  warm_start: z.boolean().optional(),
});

export const BoundaryHitSchema = z.object({
  param: z.string(),
  bound: z.enum(["lower", "upper"]),
  value: z.number(),
});

export const BootstrapDrawSchema = z.object({
  replicate: z.number().int().optional(),
  ok: z.boolean(),
  parameters: z.record(z.string(), z.number()).optional(),
  finalState: FinalStateSchema.optional(),
  finalBeta: z.number().optional(),
});

export const BootstrapFailureSchema = z.object({
  replicate: z.number().int(),
  reason: z.string(),
});

export const BootstrapSummarySchema = z.object({
  requested: z.number().int(),
  succeeded: z.number().int(),
  failed: z.number().int(),
  reliable: z.boolean(),
  message: z.string().nullable(),
  draws: z.array(BootstrapDrawSchema),
  failures: z.array(BootstrapFailureSchema),
});
export type BootstrapSummary = z.infer<typeof BootstrapSummarySchema>;

export const BlockMetricsSchema = z.object({
  index: z.number().int(),
  origin: z.string(),
  split: z.enum(["development", "final"]),
  targetStart: z.string(),
  targetEnd: z.string(),
  mae: z.record(z.string(), z.number().nullable()),
  rmse: z.record(z.string(), z.number().nullable()),
  totalError: z.record(z.string(), z.number().nullable()),
});
export type BlockMetrics = z.infer<typeof BlockMetricsSchema>;

export const ModelComparisonRowSchema = z.object({
  model: z.string(),
  label: z.string(),
  developmentMae: z.number().nullable(),
  finalMae: z.number().nullable(),
  finalRmse: z.number().nullable(),
  meanAbsTotalError: z.number().nullable(),
  blocksWon: z.number().int(),
  blocksWonDev: z.number().int(),
  blocksWonFinal: z.number().int(),
  status: z.enum(["ok", "failed"]),
  reason: z.string().nullable(),
});
export type ModelComparisonRow = z.infer<typeof ModelComparisonRowSchema>;

export const SelectionSummarySchema = z.object({
  selectedSir: z.enum(["M1", "M2"]),
  selectedSirReason: z.string(),
  selectedBaseline: z.string(),
  improvement: z.number().nullable(),
  improvementReason: z.string().nullable(),
  verdict: z.enum(["SUPPORTED", "NOT_DEMONSTRATED", "INCOMPLETE"]),
  verdictText: z.string(),
  rulesNote: z.string(),
});

export const EvaluationSummarySchema = z.object({
  origins: z.array(z.string()),
  blocks: z.array(BlockMetricsSchema),
  comparison: z.array(ModelComparisonRowSchema),
  selection: SelectionSummarySchema,
  incomplete: z.boolean(),
  incompleteReasons: z.array(z.string()),
  retrospectiveNote: z.string(),
});
export type EvaluationSummary = z.infer<typeof EvaluationSummarySchema>;

export const FitResultPayloadSchema = z.object({
  schemaVersion: z.literal(1),
  run: z.object({
    id: z.string(),
    mode: z.enum(["FIT", "EVALUATE"]),
    modelType: z.enum(["M1", "M2"]),
    selectedSirModel: z.enum(["M1", "M2"]),
    completedAt: z.string(),
    codeVersion: z.string(),
    seed: z.number().int(),
    protocolVersion: z.string().nullable(),
  }),
  assumptions: z.object({
    infectiousDurationDays: z.number(),
    gamma: z.number(),
    reportingFraction: z.number(),
    susceptibleFraction: z.number(),
    population: PopulationProvenanceSchema,
    sInitial: z.number(),
    rInitial: z.number(),
    note: z.literal("Reporting fraction and susceptibility are assumptions, not estimates."),
  }),
  parameters: z.object({
    beta: z.number().optional(),
    beta1: z.number().optional(),
    beta2: z.number().optional(),
    i0: z.number(),
    dispersion: z.number(),
    gamma: z.number(),
    reportingFraction: z.number(),
    susceptibleFraction: z.number(),
  }),
  changePoint: ChangePointSchema.nullable(),
  series: z.array(FittedSeriesPointSchema),
  finalState: FinalStateSchema,

  diagnostics: DiagnosticsSchema,
  convergence: ConvergenceSchema,
  boundaryHits: z.array(BoundaryHitSchema),
  bootstrap: BootstrapSummarySchema.nullable(),
  evaluation: EvaluationSummarySchema.nullable(),
});
export type FitResultPayload = z.infer<typeof FitResultPayloadSchema>;
