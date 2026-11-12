import { z } from "zod";
import { isIsoDate, diffDays } from "../dates";
import { canonicalJsonStringify, sha256 } from "../hash";

export const FiniteNumber = z
  .number()
  .refine((v) => Number.isFinite(v), { message: "Value must be a finite number" });

export const FinitePositiveNumber = z
  .number()
  .positive("Value must be positive")
  .refine((v) => Number.isFinite(v), { message: "Value must be a finite number" });


export const PopulationProvenanceSchema = z.object({
  value: z
    .number()
    .int("Population must be an integer")
    .positive("Population must be greater than zero"),
  sourceUrl: z
    .string()
    .url("Must be a valid http(s) URL")
    .refine((url) => url.startsWith("http://") || url.startsWith("https://"), {
      message: "URL must start with http:// or https://",
    }),
  referenceYear: z
    .number()
    .int("Reference year must be an integer")
    .min(1900, "Reference year must be >= 1900")
    .max(2100, "Reference year must be <= 2100"),
  geography: z
    .string()
    .trim()
    .min(1, "Geography must not be empty"),
});
export type PopulationProvenance = z.infer<typeof PopulationProvenanceSchema>;

export const DateRangeSchema = z
  .object({
    start: z.string().refine(isIsoDate, { message: "Start date must be an ISO date (YYYY-MM-DD)" }),
    end: z.string().refine(isIsoDate, { message: "End date must be an ISO date (YYYY-MM-DD)" }),
  })
  .refine((val) => diffDays(val.start, val.end) > 0, {
    message: "Start date must be strictly before end date",
    path: ["end"],
  });
export type DateRange = z.infer<typeof DateRangeSchema>;

export const AdvancedConfigSchema = z.object({
  betaBounds: z
    .tuple([FinitePositiveNumber, FinitePositiveNumber])
    .default([0.01, 2.0]),
  initialInfectiousBounds: z
    .tuple([FinitePositiveNumber, FinitePositiveNumber])
    .default([1.0, 100000.0]),
  dispersionBounds: z
    .tuple([FinitePositiveNumber, FinitePositiveNumber])
    .default([0.05, 1000.0]),
  nStarts: z.number().int().min(1, "nStarts must be >= 1").default(20),
  seed: z.number().int().min(0, "Seed must be >= 0").default(42),
  rtol: FinitePositiveNumber.default(1e-8),
  atol: FinitePositiveNumber.default(1e-8),
  cpMinSegmentDays: z.number().int().min(1).default(21),
  cpStepDays: z.number().int().min(1).default(7),
  cpSearchStarts: z.number().int().min(1).default(5),
  bootstrapStarts: z.number().int().min(1).default(1),
  bootstrapReplicates: z.number().int().min(1).default(200),
});
export type AdvancedConfig = z.infer<typeof AdvancedConfigSchema>;

export const RunConfigSchema = z
  .object({
    datasetId: z.string().min(1, "datasetId is required"),
    dateRange: DateRangeSchema,
    population: PopulationProvenanceSchema,
    mode: z.enum(["FIT", "EVALUATE"]),
    modelType: z.enum(["M1", "M2"]).default("M1"),
    infectiousDurationDays: z
      .number()
      .int("Infectious duration must be an integer")
      .min(3, "Infectious duration must be between 3 and 21 days")
      .max(21, "Infectious duration must be between 3 and 21 days")
      .default(7),
    reportingFraction: z
      .number()
      .min(0.01, "Reporting fraction must be between 0.01 and 1.00")
      .max(1.0, "Reporting fraction must be between 0.01 and 1.00")
      .refine((v) => Number.isFinite(v), { message: "Value must be a finite number" })
      .default(0.2),
    susceptibleFraction: z
      .number()
      .min(0.01, "Susceptible fraction must be between 0.01 and 0.999")
      .max(0.999, "Susceptible fraction must be between 0.01 and 0.999")
      .refine((v) => Number.isFinite(v), { message: "Value must be a finite number" })
      .default(0.95),

    uncertainty: z.enum(["OFF", "BOOTSTRAP"]).default("OFF"),
    advanced: AdvancedConfigSchema.default({}),
  })
  .superRefine((data, ctx) => {
    const N = data.population.value;
    const sInitial = data.susceptibleFraction * N;
    const remaining = N - sInitial;

    if (remaining < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["susceptibleFraction"],
        message: "impossible population: N - S_initial must be at least 1 person",
      });
    }

    const { betaBounds, dispersionBounds, initialInfectiousBounds } = data.advanced;
    if (betaBounds[0] >= betaBounds[1]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["advanced", "betaBounds"],
        message: "Lower beta bound must be strictly less than upper bound",
      });
    }

    if (dispersionBounds[0] >= dispersionBounds[1]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["advanced", "dispersionBounds"],
        message: "Lower dispersion bound must be strictly less than upper bound",
      });
    }

    if (initialInfectiousBounds[0] >= initialInfectiousBounds[1]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["advanced", "initialInfectiousBounds"],
        message: "Lower initial infectious bound must be strictly less than upper bound",
      });
    }

    if (initialInfectiousBounds[1] > remaining) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["advanced", "initialInfectiousBounds"],
        message: `initialInfectiousBounds upper bound must be <= N - S_initial (${Math.floor(remaining)})`,
      });
    }

    const totalDays = diffDays(data.dateRange.start, data.dateRange.end) + 1;

    if (data.modelType === "M2" && totalDays < 42) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dateRange"],
        message: "M2 model requires at least 42 selected days",
      });
    }

    if (data.mode === "EVALUATE") {
      // EVALUATE requires >= 13 blocks (each block is 7 days, 12 steps = 84 days from 1st origin + 7 forecast days = 91 days)
      // plus >= 42 initial training days -> total minimum span = 42 + 91 = 133 days
      if (totalDays < 133) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["dateRange"],
          message: "Evaluation requires a date range that yields at least 13 blocks and 42 initial training days (minimum 133 days)",
        });
      }
    }
  });

export type RunConfig = z.infer<typeof RunConfigSchema>;

export function computeConfigHash(config: RunConfig): string {
  const canonical = canonicalJsonStringify(config);
  return sha256(canonical);
}

export function computeCacheKey(datasetSha256: string, configHash: string, codeVersion: string): string {
  return sha256(`${datasetSha256}:${configHash}:${codeVersion}`);
}
