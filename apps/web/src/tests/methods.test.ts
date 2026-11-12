import { describe, it, expect } from "vitest";
import { METHOD_SECTIONS } from "@/content/methods";
import {
  REGION,
  DEFAULT_DATE_RANGE,
  METHODS_SOURCE_URL,
  DEFAULT_POPULATION_PROVENANCE,
  EVAL_PROTOCOL,
  EVALUATION_RULES,
  BOOTSTRAP_RULES,
  SENSITIVITY_GRID,
} from "@epilens/shared";

describe("Methods Content and Integrity Tests", () => {
  it("contains all 14 required PRD sections with exact anchor IDs", () => {
    const EXPECTED_IDS = [
      "purpose",
      "data",
      "cleaning",
      "model",
      "parameters",
      "fitting",
      "changepoint",
      "evaluation",
      "uncertainty",
      "scenarios",
      "sensitivity",
      "reproducibility",
      "limitations",
      "ai",
    ];

    expect(METHOD_SECTIONS.length).toBe(14);
    const actualIds = METHOD_SECTIONS.map((s) => s.id);
    expect(actualIds).toEqual(EXPECTED_IDS);
  });

  it("references shared constants without hardcoded values", () => {
    const purpose = METHOD_SECTIONS.find((s) => s.id === "purpose");
    expect(purpose?.content.join(" ")).toContain(REGION.name);
    expect(purpose?.content.join(" ")).toContain(REGION.code);

    const data = METHOD_SECTIONS.find((s) => s.id === "data");
    expect(data?.content.join(" ")).toContain(METHODS_SOURCE_URL);
    expect(data?.content.join(" ")).toContain(DEFAULT_DATE_RANGE.start);
    expect(data?.content.join(" ")).toContain(DEFAULT_DATE_RANGE.end);
    expect(data?.content.join(" ")).toContain(DEFAULT_POPULATION_PROVENANCE.value.toLocaleString("en-IN"));

    const evaluation = METHOD_SECTIONS.find((s) => s.id === "evaluation");
    expect(evaluation?.content.join(" ")).toContain(EVAL_PROTOCOL.firstOrigin);
    expect(evaluation?.content.join(" ")).toContain(`${EVALUATION_RULES.m2ImprovementThresholdPct}%`);
    expect(evaluation?.content.join(" ")).toContain(`${EVALUATION_RULES.finalImprovementThresholdPct}%`);

    const uncertainty = METHOD_SECTIONS.find((s) => s.id === "uncertainty");
    expect(uncertainty?.content.join(" ")).toContain(`${BOOTSTRAP_RULES.totalReplicates}`);
    expect(uncertainty?.content.join(" ")).toContain(`${BOOTSTRAP_RULES.minReliableSuccessfulReplicates}`);

    const sensitivity = METHOD_SECTIONS.find((s) => s.id === "sensitivity");
    expect(sensitivity?.content.join(" ")).toContain(`${SENSITIVITY_GRID.totalCombinations}`);
  });

  it("includes valid LaTeX equations in model and fitting sections", () => {
    const model = METHOD_SECTIONS.find((s) => s.id === "model");
    expect(model?.latexEquations?.length).toBeGreaterThanOrEqual(2);
    expect(model?.latexEquations?.[0]?.latex).toContain("\\frac{dS}{dt}");
    expect(model?.latexEquations?.[1]?.latex).toContain("R_{\\text{eff}}");

    const fitting = METHOD_SECTIONS.find((s) => s.id === "fitting");
    expect(fitting?.latexEquations?.length).toBeGreaterThanOrEqual(1);
    expect(fitting?.latexEquations?.[0]?.latex).toContain("\\log L(\\theta)");
  });

  it("never asserts causal conclusions and explicitly prohibits causal vocabulary", () => {
    const allText = METHOD_SECTIONS.flatMap((s) => [s.title, s.summary, ...s.content]).join(" ").toLowerCase();
    expect(allText).not.toContain("proven impact");
    expect(allText).not.toContain("successful research conclusion");
    expect(allText).toContain("never use causal claims");
  });
});
