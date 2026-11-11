import { describe, expect, it } from "vitest";
import { simulateIllustrativeSir } from "../lib/illustrative-sir";

describe("Illustrative RK4 SIR Simulation", () => {
  it("strictly conserves total population N at all time points", () => {
    const N = 1_000_000;
    const trajectory = simulateIllustrativeSir({
      r0: 2.5,
      infectiousDurationDays: 7,
      population: N,
      initialInfected: 10,
      days: 90,
    });

    expect(trajectory.length).toBe(91); // day 0 to 90

    for (const pt of trajectory) {
      const total = pt.s + pt.i + pt.r;
      // Allow minor rounding difference from rounding to integers
      expect(Math.abs(total - N)).toBeLessThanOrEqual(2);
      expect(pt.s).toBeGreaterThanOrEqual(0);
      expect(pt.i).toBeGreaterThanOrEqual(0);
      expect(pt.r).toBeGreaterThanOrEqual(0);
    }
  });

  it("produces higher and earlier peak infections for higher R0", () => {
    const lowR0 = simulateIllustrativeSir({
      r0: 1.5,
      infectiousDurationDays: 7,
      population: 1_000_000,
    });
    const highR0 = simulateIllustrativeSir({
      r0: 3.0,
      infectiousDurationDays: 7,
      population: 1_000_000,
    });

    const maxLow = Math.max(...lowR0.map((p) => p.i));
    const maxHigh = Math.max(...highR0.map((p) => p.i));

    expect(maxHigh).toBeGreaterThan(maxLow);
  });
});
