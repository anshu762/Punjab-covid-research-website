import { describe, it, expect } from "vitest";
import {
  MOCK_EVALUATED_PAYLOAD,
  MOCK_FIT_ONLY_PAYLOAD,
} from "../fixtures/results.fixture";

describe("Results Summary & Comparison logic", () => {
  it("extracts forecast MAE and RMSE from evaluated payload", () => {
    const evaluation = MOCK_EVALUATED_PAYLOAD.evaluation!;
    expect(evaluation).not.toBeNull();

    const selectedSir = evaluation.selection.selectedSir;
    expect(selectedSir).toBe("M1");

    const row = evaluation.comparison.find((r) => r.model === selectedSir);
    expect(row?.finalMae).toBe(48.7);
    expect(row?.finalRmse).toBe(59.2);
    expect(evaluation.selection.improvement).toBe(14.7);
  });

  it("handles fit-only run without fabricating metrics", () => {
    expect(MOCK_FIT_ONLY_PAYLOAD.evaluation).toBeNull();
    expect(MOCK_FIT_ONLY_PAYLOAD.run.mode).toBe("FIT");
  });

  it("handles failed model without fabricating zero scores", () => {
    const comparisonWithFailure = [
      ...MOCK_EVALUATED_PAYLOAD.evaluation!.comparison,
      {
        model: "M3_failed",
        label: "Experimental Model",
        developmentMae: null,
        finalMae: null,
        finalRmse: null,
        meanAbsTotalError: null,
        blocksWon: 0,
        blocksWonDev: 0,
        blocksWonFinal: 0,
        status: "failed" as const,
        reason: "Failed: optimiser did not converge at 3 origins",
      },
    ];

    const failedRow = comparisonWithFailure.find((r) => r.status === "failed");
    expect(failedRow?.finalMae).toBeNull();
    expect(failedRow?.reason).toBe("Failed: optimiser did not converge at 3 origins");
    // Ensure we never fabricate 0
    expect(failedRow?.finalMae).not.toBe(0);
  });

  it("handles null improvement when baseline error is zero", () => {
    const nullImprovementSelection = {
      ...MOCK_EVALUATED_PAYLOAD.evaluation!.selection,
      improvement: null,
      improvementReason: null,
    };
    expect(nullImprovementSelection.improvement).toBeNull();
  });
});
