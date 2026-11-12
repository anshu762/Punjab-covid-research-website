import { describe, it, expect } from "vitest";
import {
  RunConfigSchema,
  computeConfigHash,
  computeCacheKey,
  type RunConfig,
} from "../schemas/run";
import { canonicalJsonStringify, sha256 } from "../hash";

const VALID_CONFIG: RunConfig = {
  datasetId: "ds_123",
  dateRange: {
    start: "2020-07-01",
    end: "2020-11-30",
  },
  population: {
    value: 30000000,
    sourceUrl: "https://censusindia.gov.in/punjab",
    referenceYear: 2020,
    geography: "Punjab, India",
  },
  mode: "FIT",
  modelType: "M1",
  infectiousDurationDays: 7,
  reportingFraction: 0.2,
  susceptibleFraction: 0.95,
  uncertainty: "OFF",
  advanced: {
    betaBounds: [0.01, 2.0],
    initialInfectiousBounds: [1.0, 100000.0],
    dispersionBounds: [0.05, 1000.0],
    nStarts: 20,
    seed: 42,
    rtol: 1e-8,
    atol: 1e-8,
    cpMinSegmentDays: 21,
    cpStepDays: 7,
    cpSearchStarts: 5,
    bootstrapStarts: 1,
    bootstrapReplicates: 200,
  },
};

describe("RunConfigSchema (TypeScript Zod)", () => {
  it("accepts valid default configuration", () => {
    const parsed = RunConfigSchema.parse(VALID_CONFIG);
    expect(parsed.datasetId).toBe("ds_123");
    expect(parsed.mode).toBe("FIT");
  });

  it("rejects boundary infectious durations D < 3 and D > 21", () => {
    expect(() =>
      RunConfigSchema.parse({ ...VALID_CONFIG, infectiousDurationDays: 2 })
    ).toThrow();
    expect(() =>
      RunConfigSchema.parse({ ...VALID_CONFIG, infectiousDurationDays: 22 })
    ).toThrow();
    expect(
      RunConfigSchema.parse({ ...VALID_CONFIG, infectiousDurationDays: 3 })
    ).toBeDefined();
    expect(
      RunConfigSchema.parse({ ...VALID_CONFIG, infectiousDurationDays: 21 })
    ).toBeDefined();
  });

  it("rejects boundary reporting fractions rho < 0.01 and rho > 1.0", () => {
    expect(() =>
      RunConfigSchema.parse({ ...VALID_CONFIG, reportingFraction: 0.009 })
    ).toThrow();
    expect(() =>
      RunConfigSchema.parse({ ...VALID_CONFIG, reportingFraction: 1.01 })
    ).toThrow();
    expect(
      RunConfigSchema.parse({ ...VALID_CONFIG, reportingFraction: 0.01 })
    ).toBeDefined();
    expect(
      RunConfigSchema.parse({ ...VALID_CONFIG, reportingFraction: 1.0 })
    ).toBeDefined();
  });

  it("rejects boundary susceptible fractions f_s < 0.01 and f_s >= 1.0", () => {
    expect(() =>
      RunConfigSchema.parse({ ...VALID_CONFIG, susceptibleFraction: 0.009 })
    ).toThrow();
    expect(() =>
      RunConfigSchema.parse({ ...VALID_CONFIG, susceptibleFraction: 1.0 })
    ).toThrow();
  });

  it("rejects non-finite numbers (NaN, Infinity)", () => {
    expect(() =>
      RunConfigSchema.parse({ ...VALID_CONFIG, reportingFraction: Number.NaN })
    ).toThrow();
    expect(() =>
      RunConfigSchema.parse({
        ...VALID_CONFIG,
        reportingFraction: Number.POSITIVE_INFINITY,
      })
    ).toThrow();
  });

  it("rejects impossible population where N - S_initial < 1", () => {
    expect(() =>
      RunConfigSchema.parse({
        ...VALID_CONFIG,
        population: {
          ...VALID_CONFIG.population,
          value: 10,
        },
        susceptibleFraction: 0.99, // 10 - 9.9 = 0.1 < 1
      })
    ).toThrow(/impossible population/);
  });

  it("rejects missing or invalid population provenance", () => {
    expect(() =>
      RunConfigSchema.parse({
        ...VALID_CONFIG,
        population: {
          ...VALID_CONFIG.population,
          sourceUrl: "not-a-url",
        },
      })
    ).toThrow();
  });

  it("rejects M2 with fewer than 42 days", () => {
    expect(() =>
      RunConfigSchema.parse({
        ...VALID_CONFIG,
        modelType: "M2",
        dateRange: { start: "2020-07-01", end: "2020-07-20" }, // 20 days
      })
    ).toThrow(/M2 model requires at least 42 selected days/);
  });

  it("rejects EVALUATE with fewer than 133 days", () => {
    expect(() =>
      RunConfigSchema.parse({
        ...VALID_CONFIG,
        mode: "EVALUATE",
        dateRange: { start: "2020-07-01", end: "2020-09-01" }, // 63 days
      })
    ).toThrow(/Evaluation requires a date range that yields at least 13 blocks/);
  });

  it("canonicalJsonStringify produces identical keys regardless of insertion order", () => {
    const a = { b: 1, a: 2, c: { z: 9, y: 8 } };
    const b = { a: 2, c: { y: 8, z: 9 }, b: 1 };
    expect(canonicalJsonStringify(a)).toBe(canonicalJsonStringify(b));
  });

  it("computeConfigHash and computeCacheKey are deterministic", () => {
    const hash1 = computeConfigHash(VALID_CONFIG);
    const hash2 = computeConfigHash({ ...VALID_CONFIG });
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);

    const cacheKey = computeCacheKey("ds_sha", hash1, "v1.0.0");
    expect(cacheKey).toBe(sha256(`ds_sha:${hash1}:v1.0.0`));
  });
});
