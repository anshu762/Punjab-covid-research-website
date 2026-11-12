import { describe, it, expect } from "vitest";
import {
  generateScenarioSummaryText,
  containsForbiddenWords,
  ScenarioDailyOutputSchema,
  ScenarioSummarySchema,
} from "@epilens/shared";

describe("Scenario Explorer Data Contracts & Invariants", () => {
  it("enforces start date is valid ISO and horizon within bounds", () => {
    const summary = {
      startDate: "2020-12-01",
      horizonDays: 28,
      percentChange: -20,
      baselineBeta: 0.165,
      scenarioBeta: 0.132,
      baselineExpectedCases: 10000,
      scenarioExpectedCases: 8000,
      expectedCasesDiff: -2000,
      expectedCasesPctDiff: -20.0,
      baselineInfections: 50000,
      scenarioInfections: 40000,
      infectionsDiff: -10000,
      infectionsPctDiff: -20.0,
      summaryText:
        "Hypothetical simulation under the fitted model: from 01 Dec 2020 for 28 days, changing transmission by -20% (β 0.1650 → 0.1320 per day) gives 8,000 expected reported cases versus 10,000 at the baseline (-2,000, -20.0%); cumulative model infections 40,000 versus 50,000 (-10,000, -20.0%).",
    };

    const parsed = ScenarioSummarySchema.parse(summary);
    expect(parsed.horizonDays).toBe(28);
    expect(parsed.percentChange).toBe(-20);
    expect(containsForbiddenWords(parsed.summaryText)).toBe(false);
  });

  it("validates daily output schema with paired bootstrap intervals", () => {
    const dailyPoint = {
      date: "2020-12-01",
      baselineExpectedCases: 350.5,
      scenarioExpectedCases: 280.2,
      baselineInfections: 1750.0,
      scenarioInfections: 1400.0,
      baselineCumCases: 350.5,
      scenarioCumCases: 280.2,
      baselineCumInfections: 1750.0,
      scenarioCumInfections: 1400.0,
      casesInterval: { lower: 250.0, upper: 310.0 },
      infectionsInterval: { lower: 1250.0, upper: 1550.0 },
    };

    const parsed = ScenarioDailyOutputSchema.parse(dailyPoint);
    expect(parsed.casesInterval!.lower).toBeLessThanOrEqual(parsed.casesInterval!.upper);
    expect(parsed.infectionsInterval!.lower).toBeLessThanOrEqual(parsed.infectionsInterval!.upper);
  });

  it("generates deterministic sentence without policy impact claims", () => {
    const text = generateScenarioSummaryText({
      startDate: "2020-12-01",
      horizonDays: 14,
      percentChange: 15,
      baselineBeta: 0.15,
      scenarioBeta: 0.1725,
      baselineExpectedCases: 5000,
      scenarioExpectedCases: 6200,
      expectedCasesDiff: 1200,
      expectedCasesPctDiff: 24.0,
      baselineInfections: 25000,
      scenarioInfections: 31000,
      infectionsDiff: 6000,
      infectionsPctDiff: 24.0,
    });

    expect(text).toContain("Hypothetical simulation under the fitted model");
    expect(text).toContain("changing transmission by +15%");
    expect(text).toContain("β 0.1500 → 0.1725");
    expect(containsForbiddenWords(text)).toBe(false);
  });
});
