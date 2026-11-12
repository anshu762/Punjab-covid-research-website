import { describe, it, expect } from "vitest";
import {
  generateScenarioSummaryText,
  containsForbiddenWords,
  FORBIDDEN_WORDS,
  type ScenarioTextParams,
} from "../scenarioText";

describe("scenarioText pure generator", () => {
  const baseParams: ScenarioTextParams = {
    startDate: "2020-12-01",
    horizonDays: 28,
    percentChange: -20,
    baselineBeta: 0.16543,
    scenarioBeta: 0.13234,
    baselineExpectedCases: 15420,
    scenarioExpectedCases: 11200,
    expectedCasesDiff: -4220,
    expectedCasesPctDiff: -27.4,
    baselineInfections: 77100,
    scenarioInfections: 56000,
    infectionsDiff: -21100,
    infectionsPctDiff: -27.4,
  };

  it("generates deterministic sentence accurately with negative change", () => {
    const text = generateScenarioSummaryText(baseParams);
    expect(text).toContain("Hypothetical simulation under the fitted model:");
    expect(text).toContain("from 01 Dec 2020 for 28 days");
    expect(text).toContain("changing transmission by -20%");
    expect(text).toContain("β 0.1654 → 0.1323 per day");
    expect(text).toContain("gives 11,200 expected reported cases versus 15,420 at the baseline (-4,220, -27.4%)");
    expect(text).toContain("cumulative model infections 56,000 versus 77,100 (-21,100, -27.4%)");
  });

  it("handles positive change with explicit plus sign", () => {
    const params: ScenarioTextParams = {
      ...baseParams,
      percentChange: 20,
      scenarioBeta: 0.19852,
      scenarioExpectedCases: 21500,
      expectedCasesDiff: 6080,
      expectedCasesPctDiff: 39.4,
      scenarioInfections: 107500,
      infectionsDiff: 30400,
      infectionsPctDiff: 39.4,
    };
    const text = generateScenarioSummaryText(params);
    expect(text).toContain("changing transmission by +20%");
    expect(text).toContain("(+6,080, +39.4%)");
    expect(text).toContain("(+30,400, +39.4%)");
  });

  it("handles undefined percentages when baseline total is zero", () => {
    const params: ScenarioTextParams = {
      ...baseParams,
      baselineExpectedCases: 0,
      expectedCasesPctDiff: null,
      baselineInfections: 0,
      infectionsPctDiff: null,
    };
    const text = generateScenarioSummaryText(params);
    expect(text).toContain("Undefined (baseline is zero)");
  });

  it("scans and detects forbidden vocabulary", () => {
    expect(containsForbiddenWords("We found 500 lives saved in this period")).toBe(true);
    expect(containsForbiddenWords("The policy impact was proven")).toBe(true);
    expect(containsForbiddenWords("1200 cases prevented under lockdown")).toBe(true);
    expect(containsForbiddenWords("Guaranteed drop in transmission")).toBe(true);
    expect(containsForbiddenWords("Hypothetical simulation under the fitted model")).toBe(false);
  });

  it("all forbidden words are in lowercase and non-empty", () => {
    for (const word of FORBIDDEN_WORDS) {
      expect(word.length).toBeGreaterThan(0);
      expect(word).toBe(word.toLowerCase());
    }
  });
});
