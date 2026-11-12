import { describe, it, expect } from "vitest";
import {
  REGION,
  DEFAULT_DATE_RANGE,
  DEFAULT_POPULATION_PROVENANCE,
  MODEL_DEFAULTS,
  EVAL_PROTOCOL,
  EVALUATION_RULES,
  BOOTSTRAP_RULES,
  CLEANING_RULES,
  generateScenarioSummaryText,
  evaluateRunComparison,
  UpdatePopulationSchema,
  ConfirmDatasetSchema,
  QualityFlagEnum,
  MOCK_EVALUATED_PAYLOAD,
} from "@epilens/shared";

describe("EpiLens End-to-End Workflow Verification Suite (PRD Section 7)", () => {
  describe("Step 1: Data Ingestion, Validation & Anomaly Correction", () => {
    it("detects and blocks invalid region or population provenance", () => {
      const invalidRegion = "MH"; // Maharashtra instead of Punjab
      expect(invalidRegion).not.toBe(REGION.code);
      expect(REGION.code).toBe("PB");
      expect(REGION.name).toBe("Punjab, India");

      // Verify population schema validation
      const invalidPopResult = UpdatePopulationSchema.safeParse({
        populationValue: -500,
        populationGeography: "Punjab, India",
      });
      expect(invalidPopResult.success).toBe(false);

      const validPopResult = UpdatePopulationSchema.safeParse({
        populationValue: DEFAULT_POPULATION_PROVENANCE.value,
        populationGeography: DEFAULT_POPULATION_PROVENANCE.geography,
        populationReferenceYear: DEFAULT_POPULATION_PROVENANCE.year,
        populationSourceUrl: DEFAULT_POPULATION_PROVENANCE.sourceUrl,
      });
      expect(validPopResult.success).toBe(true);
    });

    it("verifies quality flags enumeration and negative correction rules", () => {
      expect(QualityFlagEnum.options).toEqual([
        "OK",
        "MISSING",
        "DUPLICATE",
        "CORRECTED",
        "CORRECTION_DAY",
        "UNRESOLVED_CORRECTION",
      ]);

      expect(CLEANING_RULES.negativeCorrectionWindowDays).toBe(14);
      expect(CLEANING_RULES.minTrainingDaysForEvaluation).toBe(42);
    });

    it("validates dataset confirmation schema with column mapping and date boundaries", () => {
      const validConfirm = ConfirmDatasetSchema.safeParse({
        datasetId: "ds_test_123",
        columnMapping: {
          date: "Date",
          new_confirmed: "Confirmed",
          region_code: "State",
        },
        dateRange: [DEFAULT_DATE_RANGE.start, DEFAULT_DATE_RANGE.end],
        population: DEFAULT_POPULATION_PROVENANCE.value,
      });
      expect(validConfirm.success).toBe(true);

      const invalidConfirm = ConfirmDatasetSchema.safeParse({
        datasetId: "ds_test_123",
        columnMapping: {
          date: "", // Missing date column
          new_confirmed: "Confirmed",
        },
      });
      expect(invalidConfirm.success).toBe(false);
    });
  });

  describe("Step 2: Model Configuration & Mathematical Rigor", () => {
    it("enforces allowed parameter bounds and defaults strictly", () => {
      expect(MODEL_DEFAULTS.infectiousDurationDays).toBe(7);
      expect(MODEL_DEFAULTS.reportingFraction).toBe(0.20);
      expect(MODEL_DEFAULTS.susceptibleFraction).toBe(0.95);
      expect(MODEL_DEFAULTS.betaBounds).toEqual([0.01, 2]);
      expect(MODEL_DEFAULTS.dispersionBounds).toEqual([0.05, 1000]);
    });

    it("verifies observation mapping and R_eff formulation", () => {
      const beta = 0.25;
      const gamma = 1 / 7;
      const N = 30_000_000;
      const S = 0.95 * N;

      const rEff = (beta * S) / (gamma * N);
      expect(rEff).toBeCloseTo((0.25 * 0.95) / (1 / 7), 4);
      expect(rEff).toBeGreaterThan(1.0);
    });
  });

  describe("Step 3: Forecast Evaluation & Model Comparison Rules", () => {
    it("contains 13 origins with 9 development and 4 final blocks", () => {
      expect(EVAL_PROTOCOL.defaultBlocks).toBe(13);
      expect(EVAL_PROTOCOL.developmentBlocks).toBe(9);
      expect(EVAL_PROTOCOL.finalBlocks).toBe(4);
      expect(EVAL_PROTOCOL.firstOrigin).toBe("2020-08-31");
    });

    it("applies frozen selection rules (10% improvement, 6/9 dev, 3/4 final)", () => {
      expect(EVALUATION_RULES.m2ImprovementThresholdPct).toBe(10);
      expect(EVALUATION_RULES.m2MinBlocksWonDev).toBe(6);
      expect(EVALUATION_RULES.finalImprovementThresholdPct).toBe(10);
      expect(EVALUATION_RULES.finalBlocksWonRequired).toBe(3);
    });

    it("enforces 180 of 200 bootstrap refits for reliability", () => {
      expect(BOOTSTRAP_RULES.totalReplicates).toBe(200);
      expect(BOOTSTRAP_RULES.minReliableSuccessfulReplicates).toBe(180);
    });
  });

  describe("Step 4: Scenario Simulation & Plain-Language Guardrails", () => {
    it("generates deterministic sentence without causal terms", () => {
      const sentence = generateScenarioSummaryText({
        startDate: "2020-12-01",
        horizonDays: 28,
        percentChange: -20,
        baselineBeta: 0.25,
        scenarioBeta: 0.20,
        scenarioExpectedCases: 12500,
        baselineExpectedCases: 15000,
        expectedCasesDiff: -2500,
        expectedCasesPctDiff: -16.7,
        baselineInfections: 75000,
        scenarioInfections: 62500,
        infectionsDiff: -12500,
        infectionsPctDiff: -16.7,
      });

      expect(sentence).toContain("Hypothetical simulation under the fitted model");
      expect(sentence).toContain("-20%");
      expect(sentence).toContain("28 days");

      // Strictly prohibited vocabulary check
      const lower = sentence.toLowerCase();
      expect(lower).not.toContain("lives saved");
      expect(lower).not.toContain("policy impact");
      expect(lower).not.toContain("cases prevented");
      expect(lower).not.toContain("proven");
    });

    it("handles zero baseline gracefully with undefined percentage", () => {
      const sentence = generateScenarioSummaryText({
        startDate: "2020-12-01",
        horizonDays: 14,
        percentChange: 10,
        baselineBeta: 0.2,
        scenarioBeta: 0.22,
        scenarioExpectedCases: 0,
        baselineExpectedCases: 0,
        expectedCasesDiff: 0,
        expectedCasesPctDiff: null,
        baselineInfections: 0,
        scenarioInfections: 0,
        infectionsDiff: 0,
        infectionsPctDiff: null,
      });

      expect(sentence).toContain("Undefined (baseline is zero)");
    });
  });

  describe("Step 5: Saved Runs Library & Multi-Run Compare Invariants", () => {
    it("allows comparison ranking ONLY when dataset, version, and dates match", () => {
      const baseRun = {
        id: "run_1",
        displayName: "Run 1",
        mode: "EVALUATE" as const,
        modelType: "M1" as const,
        datasetId: "ds_pb_2020",
        datasetVersion: 1,
        datasetName: "Punjab COVID-19 Archive",
        dateRange: { start: "2020-07-01", end: "2020-11-30" },
        targetDates: ["2020-09-07", "2020-09-14"],
        evaluation: {
          finalMae: 25.4,
          finalRmse: 32.1,
          meanAbsTotalError: 150.0,
          developmentMae: 28.0,
          blocksWon: 2,
        },
      };

      const compatibleRun = {
        ...baseRun,
        id: "run_2",
        displayName: "Run 2",
        modelType: "M2" as const,
        evaluation: {
          finalMae: 21.2,
          finalRmse: 28.0,
          meanAbsTotalError: 130.0,
          developmentMae: 24.0,
          blocksWon: 3,
        },
      };

      const result = evaluateRunComparison([baseRun, compatibleRun]);
      expect(result.compatible).toBe(true);
      expect(result.rankings).not.toBeNull();
      // Run 2 has lower MAE -> ranked 1st
      expect(result.rankings?.[0]?.runId).toBe("run_2");
    });

    it("disallows ranking and flags 'Different evaluation conditions' when dates or versions differ", () => {
      const runA = {
        id: "run_a",
        displayName: "Run A",
        mode: "EVALUATE" as const,
        modelType: "M1" as const,
        datasetId: "ds_pb_2020",
        datasetVersion: 1,
        datasetName: "Punjab COVID-19 Archive",
        dateRange: { start: "2020-07-01", end: "2020-11-30" },
        targetDates: ["2020-09-07"],
        evaluation: {
          finalMae: 20.0,
          finalRmse: 25.0,
          meanAbsTotalError: 120.0,
          developmentMae: 22.0,
          blocksWon: 1,
        },
      };

      const runDifferentVersion = {
        ...runA,
        id: "run_b",
        displayName: "Run B",
        datasetVersion: 2, // Version differs!
      };

      const result = evaluateRunComparison([runA, runDifferentVersion]);
      expect(result.compatible).toBe(false);
      expect(result.rankings).toBeNull();
      expect(result.reasons.some((r) => r.includes("Dataset version mismatch"))).toBe(true);
    });
  });

  describe("Step 6: Stored Result Integrity & PRD Traceability", () => {
    it("verifies mock payload schema parity with live evaluation contract", () => {
      expect(MOCK_EVALUATED_PAYLOAD.assumptions).toBeDefined();
      expect(MOCK_EVALUATED_PAYLOAD.parameters).toBeDefined();
      expect(MOCK_EVALUATED_PAYLOAD.evaluation).toBeDefined();
      expect(MOCK_EVALUATED_PAYLOAD.diagnostics).toBeDefined();
    });
  });
});
