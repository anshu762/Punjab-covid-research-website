/**
 * Pure deterministic sentence template for scenario simulations.
 * Strictly adheres to PRD §4 rules:
 * - Deterministic sentence template describing inputs and calculated differences.
 * - Never uses forbidden phrases: "lives saved", "proven", "policy impact", "cases prevented".
 * - Accurately handles undefined percentages and zero differences.
 */

import { formatInt, formatNumber } from "./format";
import { formatDisplayDate } from "./dates";

export interface ScenarioTextParams {
  startDate: string;
  horizonDays: number;
  percentChange: number;
  baselineBeta: number;
  scenarioBeta: number;
  baselineExpectedCases: number;
  scenarioExpectedCases: number;
  expectedCasesDiff: number;
  expectedCasesPctDiff: number | null;
  baselineInfections: number;
  scenarioInfections: number;
  infectionsDiff: number;
  infectionsPctDiff: number | null;
}

export const FORBIDDEN_WORDS = [
  "lives saved",
  "life saved",
  "lives lost",
  "proven",
  "policy impact",
  "cases prevented",
  "case prevented",
  "guaranteed",
] as const;

export function containsForbiddenWords(text: string): boolean {
  const lower = text.toLowerCase();
  return FORBIDDEN_WORDS.some((word) => lower.includes(word));
}

export function generateScenarioSummaryText(params: ScenarioTextParams): string {
  const {
    startDate,
    horizonDays,
    percentChange,
    baselineBeta,
    scenarioBeta,
    baselineExpectedCases,
    scenarioExpectedCases,
    expectedCasesDiff,
    expectedCasesPctDiff,
    baselineInfections,
    scenarioInfections,
    infectionsDiff,
    infectionsPctDiff,
  } = params;

  const signStr = percentChange > 0 ? `+${percentChange}%` : `${percentChange}%`;
  const formattedStart = formatDisplayDate(startDate);
  const b0Str = formatNumber(baselineBeta, 4);
  const b1Str = formatNumber(scenarioBeta, 4);

  const aCases = formatInt(Math.round(scenarioExpectedCases));
  const bCases = formatInt(Math.round(baselineExpectedCases));
  const cInfect = formatInt(Math.round(scenarioInfections));
  const dInfect = formatInt(Math.round(baselineInfections));

  const diffCasesStr =
    expectedCasesDiff > 0
      ? `+${formatInt(Math.round(expectedCasesDiff))}`
      : formatInt(Math.round(expectedCasesDiff));

  const pctCasesStr =
    expectedCasesPctDiff !== null
      ? `${expectedCasesPctDiff > 0 ? "+" : ""}${formatNumber(expectedCasesPctDiff, 1)}%`
      : "Undefined (baseline is zero)";

  const diffInfectStr =
    infectionsDiff > 0
      ? `+${formatInt(Math.round(infectionsDiff))}`
      : formatInt(Math.round(infectionsDiff));

  const pctInfectStr =
    infectionsPctDiff !== null
      ? `${infectionsPctDiff > 0 ? "+" : ""}${formatNumber(infectionsPctDiff, 1)}%`
      : "Undefined (baseline is zero)";

  const sentence =
    `Hypothetical simulation under the fitted model: from ${formattedStart} for ${horizonDays} days, ` +
    `changing transmission by ${signStr} (β ${b0Str} → ${b1Str} per day) gives ${aCases} expected reported cases ` +
    `versus ${bCases} at the baseline (${diffCasesStr}, ${pctCasesStr}); ` +
    `cumulative model infections ${cInfect} versus ${dInfect} (${diffInfectStr}, ${pctInfectStr}).`;

  if (containsForbiddenWords(sentence)) {
    throw new Error("Scenario summary contains prohibited policy impact vocabulary.");
  }

  return sentence;
}
