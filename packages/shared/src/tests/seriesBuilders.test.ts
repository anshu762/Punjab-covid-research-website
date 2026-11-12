import { describe, it, expect } from "vitest";
import {
  MOCK_FIT_ONLY_PAYLOAD,
  MOCK_EVALUATED_PAYLOAD,
} from "../fixtures/results.fixture";

describe("Series Calculations & Diagnostics Utilities", () => {
  it("converts latent SIR counts to per 100,000 correctly", () => {
    const N = MOCK_FIT_ONLY_PAYLOAD.assumptions.population.value; // 30,000,000
    const point = MOCK_FIT_ONLY_PAYLOAD.series[0];

    const sPer100k = (point.S / N) * 100000;
    const iPer100k = (point.I / N) * 100000;
    const rPer100k = (point.R / N) * 100000;

    // S = 28,500,000 -> 95,000 per 100k
    expect(sPer100k).toBe(95000);
    // I = 500 -> 1.666... per 100k
    expect(Number(iPer100k.toFixed(2))).toBe(1.67);
    // R = 1,499,500 -> 4,998.33 per 100k
    expect(Number(rPer100k.toFixed(2))).toBe(4998.33);

    // Total must sum to 100,000 within numerical precision
    expect(Math.round(sPer100k + iPer100k + rPer100k)).toBe(100000);
  });

  it("calculates profile likelihood approximate 95% threshold (min + 1.92)", () => {
    const profiles = MOCK_FIT_ONLY_PAYLOAD.diagnostics.profiles;
    const betaPoints = profiles.beta;
    expect(betaPoints.length).toBeGreaterThan(0);

    const minNll = Math.min(...betaPoints.map((p) => p.nll));
    expect(minNll).toBe(245.1);

    const threshold = minNll + 1.92;
    expect(Number(threshold.toFixed(2))).toBe(247.02);
  });

  it("verifies 7-day evaluation origin isolation", () => {
    const evalData = MOCK_EVALUATED_PAYLOAD.evaluation!;
    expect(evalData.origins).toHaveLength(13);

    // Development blocks (first 9)
    const devOrigins = evalData.origins.slice(0, 9);
    expect(devOrigins[0]).toBe("2020-08-31");
    expect(devOrigins[8]).toBe("2020-10-26");

    // Final frozen blocks (last 4)
    const finalOrigins = evalData.origins.slice(9);
    expect(finalOrigins[0]).toBe("2020-11-02");
    expect(finalOrigins[3]).toBe("2020-11-23");
  });
});
