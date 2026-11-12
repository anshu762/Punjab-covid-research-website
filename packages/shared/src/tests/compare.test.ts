import { describe, it, expect } from "vitest";
import {
  evaluateRunComparison,
  type ComparableRunSummary,
} from "../compare";

describe("evaluateRunComparison pure logic", () => {
  const baseRun1: ComparableRunSummary = {
    id: "run-m1",
    displayName: "Punjab M1 Constant",
    mode: "EVALUATE",
    modelType: "M1",
    datasetId: "ds-punjab",
    datasetVersion: 1,
    datasetName: "Punjab COVID-19 Archive",
    dateRange: { start: "2020-07-01", end: "2020-11-30" },
    targetDates: ["2020-09-01", "2020-09-08", "2020-09-15"],
    evaluation: {
      finalMae: 142.5,
      finalRmse: 185.0,
      meanAbsTotalError: 850.0,
      developmentMae: 120.0,
      blocksWon: 4,
    },
    diagnosticsStatus: "ok",
  };

  const baseRun2: ComparableRunSummary = {
    id: "run-m2",
    displayName: "Punjab M2 Change-Point",
    mode: "EVALUATE",
    modelType: "M2",
    datasetId: "ds-punjab",
    datasetVersion: 1,
    datasetName: "Punjab COVID-19 Archive",
    dateRange: { start: "2020-07-01", end: "2020-11-30" },
    targetDates: ["2020-09-01", "2020-09-08", "2020-09-15"],
    evaluation: {
      finalMae: 98.2,
      finalRmse: 130.4,
      meanAbsTotalError: 520.0,
      developmentMae: 88.0,
      blocksWon: 9,
    },
    diagnosticsStatus: "ok",
  };

  it("permits ranking when all evaluation conditions strictly match", () => {
    const result = evaluateRunComparison([baseRun1, baseRun2]);
    expect(result.compatible).toBe(true);
    expect(result.reasons).toHaveLength(0);
    expect(result.rankings).not.toBeNull();
    expect(result.rankings![0].runId).toBe("run-m2");
    expect(result.rankings![0].rank).toBe(1);
    expect(result.rankings![1].runId).toBe("run-m1");
    expect(result.rankings![1].rank).toBe(2);
  });

  it("blocks ranking if one run is Fit-only mode", () => {
    const fitOnlyRun: ComparableRunSummary = {
      ...baseRun1,
      id: "run-fit-only",
      mode: "FIT",
      evaluation: null,
    };

    const result = evaluateRunComparison([fitOnlyRun, baseRun2]);
    expect(result.compatible).toBe(false);
    expect(result.rankings).toBeNull();
    expect(result.reasons.some((r) => r.includes("Fit-only mode"))).toBe(true);
  });

  it("blocks ranking if dataset versions differ", () => {
    const v2Run: ComparableRunSummary = {
      ...baseRun2,
      datasetVersion: 2,
    };

    const result = evaluateRunComparison([baseRun1, v2Run]);
    expect(result.compatible).toBe(false);
    expect(result.rankings).toBeNull();
    expect(result.reasons.some((r) => r.includes("Dataset version mismatch"))).toBe(true);
  });

  it("blocks ranking if target dates differ", () => {
    const diffTargetsRun: ComparableRunSummary = {
      ...baseRun2,
      targetDates: ["2020-09-01", "2020-09-08", "2020-09-22"], // Different 3rd target
    };

    const result = evaluateRunComparison([baseRun1, diffTargetsRun]);
    expect(result.compatible).toBe(false);
    expect(result.rankings).toBeNull();
    expect(result.reasons.some((r) => r.includes("Different target dates"))).toBe(true);
  });

  it("blocks ranking if underlying datasets differ", () => {
    const diffDatasetRun: ComparableRunSummary = {
      ...baseRun2,
      datasetId: "ds-other-state",
    };

    const result = evaluateRunComparison([baseRun1, diffDatasetRun]);
    expect(result.compatible).toBe(false);
    expect(result.rankings).toBeNull();
    expect(result.reasons.some((r) => r.includes("Different datasets"))).toBe(true);
  });
});
