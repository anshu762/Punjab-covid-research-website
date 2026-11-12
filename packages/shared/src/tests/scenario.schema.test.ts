import { describe, it, expect } from "vitest";
import {
  CreateScenarioInputSchema,
  ScenarioConfigSchema,
  ScenarioSummarySchema,
} from "../schemas/scenario";

describe("Scenario Zod Schemas", () => {
  it("validates valid ScenarioConfig", () => {
    const config = {
      percentChange: -20,
      horizonDays: 28,
      startDate: "2020-12-01",
    };
    expect(() => ScenarioConfigSchema.parse(config)).not.toThrow();
  });

  it("validates valid CreateScenarioInput", () => {
    const valid = {
      parentRunId: "run_123",
      percentChange: -20,
      horizonDays: 28,
    };
    expect(() => CreateScenarioInputSchema.parse(valid)).not.toThrow();
  });

  it("rejects non-multiple-of-5 percentChange", () => {
    const invalid = {
      parentRunId: "run_123",
      percentChange: -18,
      horizonDays: 28,
    };
    expect(() => CreateScenarioInputSchema.parse(invalid)).toThrow(
      "Transmission change must be a multiple of 5"
    );
  });

  it("rejects percentChange beyond bounds [-50, 50]", () => {
    expect(() =>
      CreateScenarioInputSchema.parse({
        parentRunId: "run_123",
        percentChange: -55,
        horizonDays: 28,
      })
    ).toThrow();

    expect(() =>
      CreateScenarioInputSchema.parse({
        parentRunId: "run_123",
        percentChange: 55,
        horizonDays: 28,
      })
    ).toThrow();
  });

  it("rejects horizonDays outside bounds [7, 60]", () => {
    expect(() =>
      CreateScenarioInputSchema.parse({
        parentRunId: "run_123",
        percentChange: 0,
        horizonDays: 6,
      })
    ).toThrow();

    expect(() =>
      CreateScenarioInputSchema.parse({
        parentRunId: "run_123",
        percentChange: 0,
        horizonDays: 61,
      })
    ).toThrow();
  });

  it("validates ScenarioSummary with nullable percent difference", () => {
    const summary = {
      startDate: "2020-12-01",
      horizonDays: 28,
      percentChange: 0,
      baselineBeta: 0.15,
      scenarioBeta: 0.15,
      baselineExpectedCases: 100,
      scenarioExpectedCases: 100,
      expectedCasesDiff: 0,
      expectedCasesPctDiff: 0,
      baselineInfections: 500,
      scenarioInfections: 500,
      infectionsDiff: 0,
      infectionsPctDiff: 0,
      summaryText: "Some valid text",
    };
    expect(() => ScenarioSummarySchema.parse(summary)).not.toThrow();

    const summaryZeroBaseline = {
      ...summary,
      baselineExpectedCases: 0,
      expectedCasesPctDiff: null,
    };
    expect(() => ScenarioSummarySchema.parse(summaryZeroBaseline)).not.toThrow();
  });
});
