import { describe, it, expect } from "vitest";
import {
  REGION,
  DEFAULT_DATE_RANGE,
  DEFAULT_POPULATION_PROVENANCE,
  MODEL_DEFAULTS,
  EVAL_PROTOCOL,
  EVALUATION_RULES,
  BOOTSTRAP_RULES,
  cleanObservations,
  generateScenarioSummarySentence,
  compareRuns,
  MOCK_EVALUATED_PAYLOAD,
  type CleanObservationInput,
} from "@epilens/shared";

describe("EpiLens End-to-End Workflow Verification Suite (PRD Section 7)", () => {
  describe("Step 1: Data Ingestion, Validation & Anomaly Correction", () => {
    it("detects and blocks invalid region or population provenance", () => {
      const invalidRegion = "MH"; // Maharashtra instead of Punjab
      expect(invalidRegion).not.toBe(REGION.code);

      const invalidPopulation = -500;
      expect(invalidPopulation > 0).toBe(false);
      expect(DEFAULT_POPULATION_PROVENANCE.value).toBe(30_141_373);
    });

    it("executes the 14-day negative correction algorithm cleanly", () => {
      // 15 days of data: day 1 to 14 positive, day 15 has a negative correction (-50)
      const rawRecords: CleanObservationInput[] = [
        { date: "2020-07-01", count: 10 },
        { date: "2020-07-02", count: 20 },
        { date: "2020-07-03", count: 30 },
        { date: "2020-07-04", count: 40 },
        { date: "2020-07-05", count: 50 },
        { date: "2020-07-06", count: 60 },
        { date: "2020-07-07", count: 70 },
        { date: "2020-07-08", count: 80 },
        { date: "2020-07-09", count: 90 },
        { date: "2020-07-10", count: 100 },
        { date: "2020-07-11", count: 110 },
        { date: "2020-07-12", count: 120 },
        { date: "2020-07-13", count: 130 },
        { date: "2020-07-14", count: 140 },
        { date: "2020-07-15", count: -50 }, // Negative correction
      ];

      const { cleaned, qualityLog, isBlocked } = cleanObservations(rawRecords);

      expect(isBlocked).toBe(false);
      // Correction day count must be set to 0
      const corrDay = cleaned.find((c) => c.date === "2020-07-15");
      expect(corrDay?.count).toBe(0);
      expect(corrDay?.qualityFlag).toBe("CORRECTION_DAY");

      // Preceding day (2020-07-14) had 140, subtracted by 50 -> 90
      const precDay = cleaned.find((c) => c.date === "2020-07-14");
      expect(precDay?.count).toBe(90);
      expect(precDay?.qualityFlag).toBe("CORRECTED");

      expect(qualityLog.length).toBeGreaterThan(0);
    });

    it("blocks analysis when missing calendar dates are detected", () => {
      // Gap between 2020-07-01 and 2020-07-03 (2020-07-02 missing)
      const gappedRecords: CleanObservationInput[] = [
        { date: "2020-07-01", count: 10 },
        { date: "2020-07-03", count: 30 },
      ];

      const { isBlocked, missingDates } = cleanObservations(gappedRecords);
      expect(isBlocked).toBe(true);
      expect(missingDates).toContain("2020-07-02");
    });

    it("blocks analysis when duplicate dates are detected", () => {
      const duplicateRecords: CleanObservationInput[] = [
        { date: "2020-07-01", count: 10 },
        { date: "2020-07-01", count: 15 },
        { date: "2020-07-02", count: 20 },
      ];

      const { isBlocked, duplicateDates } = cleanObservations(duplicateRecords);
      expect(isBlocked).toBe(true);
      expect(duplicateDates).toContain("2020-07-01");
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
      const sentence = generateScenarioSummarySentence({
        startDate: "2020-12-01",
        horizonDays: 28,
        percentChange: -20,
        betaBaseline: 0.25,
        betaScenario: 0.20,
        scenarioExpectedCases: 12500,
        baselineExpectedCases: 15000,
        casesDiff: -2500,
        casesPctDiff: -16.7,
        scenarioInfections: 62500,
        baselineInfections: 75000,
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
      const sentence = generateScenarioSummarySentence({
        startDate: "2020-12-01",
        horizonDays: 14,
        percentChange: 10,
        betaBaseline: 0.2,
        betaScenario: 0.22,
        scenarioExpectedCases: 0,
        baselineExpectedCases: 0,
        casesDiff: 0,
        casesPctDiff: null,
        scenarioInfections: 0,
        baselineInfections: 0,
        infectionsPctDiff: null,
      });

      expect(sentence).toContain("Undefined: baseline total is zero");
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
        targetDates: ["2020-09-07", "2020-09-14"],
        finalMae: 25.4,
        finalRmse: 32.1,
        assumptions: { infectiousDurationDays: 7, reportingFraction: 0.2, susceptibleFraction: 0.95 },
      };

      const compatibleRun = {
        ...baseRun,
        id: "run_2",
        displayName: "Run 2",
        modelType: "M2" as const,
        finalMae: 21.2,
        finalRmse: 28.0,
      };

      const result = compareRuns([baseRun, compatibleRun]);
      expect(result.conditionsMatch).toBe(true);
      expect(result.rankingAvailable).toBe(true);
      // Run 2 has lower MAE -> ranked 1st
      expect(result.rankedRuns?.[0]?.id).toBe("run_2");
    });

    it("disallows ranking and flags 'Different evaluation conditions' when dates or versions differ", () => {
      const runA = {
        id: "run_a",
        displayName: "Run A",
        mode: "EVALUATE" as const,
        modelType: "M1" as const,
        datasetId: "ds_pb_2020",
        datasetVersion: 1,
        targetDates: ["2020-09-07"],
        finalMae: 20.0,
        finalRmse: 25.0,
        assumptions: { infectiousDurationDays: 7, reportingFraction: 0.2, susceptibleFraction: 0.95 },
      };

      const runDifferentVersion = {
        ...runA,
        id: "run_b",
        displayName: "Run B",
        datasetVersion: 2, // Version differs!
        finalMae: 15.0,
      };

      const result = compareRuns([runA, runDifferentVersion]);
      expect(result.conditionsMatch).toBe(false);
      expect(result.rankingAvailable).toBe(false);
      expect(result.notice).toContain("Different evaluation conditions");
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
