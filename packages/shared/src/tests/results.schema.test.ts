import { describe, it, expect } from "vitest";
import { FitResultPayloadSchema, type FitResultPayload } from "../schemas/results";

describe("FitResultPayloadSchema", () => {
  it("validates a complete FIT result payload", () => {
    const payload: FitResultPayload = {
      schemaVersion: 1,
      run: {
        id: "run_test_123",
        mode: "FIT",
        modelType: "M1",
        selectedSirModel: "M1",
        completedAt: "2020-12-01T12:00:00Z",
        codeVersion: "dev",
        seed: 42,
        protocolVersion: null,
      },
      assumptions: {
        infectiousDurationDays: 7,
        gamma: 0.142857,
        reportingFraction: 0.20,
        susceptibleFraction: 0.95,
        population: {
          value: 29000000,
          sourceUrl: "https://censusindia.gov.in/punjab",
          referenceYear: 2020,
          geography: "Punjab, India",
        },
        sInitial: 27550000,
        rInitial: 1449500,
        note: "Reporting fraction and susceptibility are assumptions, not estimates.",
      },
      parameters: {
        beta: 0.32,
        i0: 500,
        dispersion: 45.2,
        gamma: 0.142857,
        reportingFraction: 0.20,
        susceptibleFraction: 0.95,
      },
      changePoint: null,
      series: [
        {
          date: "2020-07-01",
          observed: 100,
          expected: 98.5,
          lower: 85.0,
          upper: 115.0,
          S: 27550000,
          I: 500,
          R: 1449500,
          C: 100,
          beta: 0.32,
          rEff: 2.12,
        },
      ],
      finalState: {
        date: "2020-07-01",
        S: 27550000,
        I: 500,
        R: 1449500,
        C: 100,
        beta: 0.32,
      },
      diagnostics: {
        residuals: [{ date: "2020-07-01", raw: 1.5, pearson: 0.22 }],
        acf: [{ lag: 1, value: 0.05 }],
        acfLimit: 0.35,
        profiles: {
          beta: [{ value: 0.32, nll: 120.5 }],
        },
        warnings: [],
        status: "ok",
      },
      convergence: {
        nStarts: 20,
        nConverged: 19,
        bestNll: 120.5,
        nllSpread: 0.02,
        messages: ["CONVERGENCE: REL_REDUCTION_OF_F_<=_FACTR*EPSMCH"],
      },
      boundaryHits: [],
      bootstrap: {
        requested: 200,
        succeeded: 195,
        failed: 5,
        reliable: true,
        message: null,
        draws: [{ ok: true, parameters: { beta: 0.32 } }],
        failures: [{ replicate: 42, reason: "integration failed" }],
      },
      evaluation: null,
    };

    const parsed = FitResultPayloadSchema.parse(payload);
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.run.id).toBe("run_test_123");
    expect(parsed.series).toHaveLength(1);
  });
});
