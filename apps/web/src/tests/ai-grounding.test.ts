import { describe, it, expect } from "vitest";
import {
  extractNumbersFromText,
  verifyGrounding,
} from "../lib/ai/grounding";

describe("AI Explainer Grounding Validator", () => {
  const sampleContext = {
    modelType: "M2",
    finalMae: 98.2,
    finalRmse: 130.4,
    improvementPct: 24.5,
    baselineBeta: 0.165,
    scenarioBeta: 0.132,
    baselineExpectedCases: 15420,
    scenarioExpectedCases: 11200,
  };

  it("extracts integers, floats, and percentages accurately", () => {
    const text = "M2 achieved a final MAE of 98.2 (24.5% improvement), compared to 15,420 cases.";
    const nums = extractNumbersFromText(text);
    expect(nums).toContain(98.2);
    expect(nums).toContain(24.5);
    expect(nums).toContain(15420);
  });

  it("passes when all text numbers exist in context", () => {
    const text =
      "Under the M2 model, the final MAE reached 98.2 with an RMSE of 130.4. This represents a 24.5% improvement over the baseline.";
    const result = verifyGrounding(text, sampleContext);
    expect(result.grounded).toBe(true);
    expect(result.unverifiedNumbers).toHaveLength(0);
  });

  it("flags warning when invented/hallucinated numbers appear", () => {
    const text =
      "Under the M2 model, the final MAE was 98.2, but infection hospitalizations reached 4,850 persons with 72% coverage.";
    const result = verifyGrounding(text, sampleContext);
    expect(result.grounded).toBe(false);
    expect(result.unverifiedNumbers).toContain(4850);
    expect(result.unverifiedNumbers).toContain(72);
  });
});
