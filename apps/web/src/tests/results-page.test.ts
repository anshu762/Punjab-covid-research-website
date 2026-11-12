import { describe, it, expect } from "vitest";
import {
  MOCK_FIT_ONLY_PAYLOAD,
  MOCK_EVALUATED_PAYLOAD,
} from "@epilens/shared";

describe("Results Page Data Contracts & View Invariants", () => {
  it("strictly confirms Fit-only payload contains no evaluation metrics", () => {
    expect(MOCK_FIT_ONLY_PAYLOAD.evaluation).toBeNull();
    expect(MOCK_FIT_ONLY_PAYLOAD.run.mode).toBe("FIT");
  });

  it("strictly validates that all series points contain the same date as input", () => {
    const dates = MOCK_FIT_ONLY_PAYLOAD.series.map((s) => s.date);
    expect(dates).toEqual(["2020-07-01", "2020-07-02"]);
  });

  it("validates evaluated run contains all 13 origin dates strictly", () => {
    const origins = MOCK_EVALUATED_PAYLOAD.evaluation!.origins;
    expect(origins).toHaveLength(13);
    expect(origins[0]).toBe("2020-08-31");
    expect(origins[12]).toBe("2020-11-23");
  });

  it("ensures M1 and M2 comparisons are both present in comparison rows", () => {
    const rows = MOCK_EVALUATED_PAYLOAD.evaluation!.comparison;
    const modelKeys = rows.map((r) => r.model);
    expect(modelKeys).toContain("M1");
    expect(modelKeys).toContain("M2");
    expect(modelKeys).toContain("baseline_mean");
    expect(modelKeys).toContain("baseline_weekday");
  });

  it("verifies assumption note is strictly present", () => {
    expect(MOCK_FIT_ONLY_PAYLOAD.assumptions.note).toBe(
      "Reporting fraction and susceptibility are assumptions, not estimates."
    );
  });
});
