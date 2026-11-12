/**
 * Pure multi-run comparison evaluation logic.
 * Strictly adheres to PRD §4 rules:
 * - Up to 3 runs compared side-by-side.
 * - Model ranking is permitted ONLY if all selected runs are EVALUATE mode, share
 *   identical datasetId and version, and evaluated against the identical target dates.
 * - Otherwise displays "Different evaluation conditions" with bulleted differences,
 *   and OMITS model ranking.
 */

export interface ComparableRunSummary {
  id: string;
  displayName: string;
  mode: "FIT" | "EVALUATE";
  modelType: "M1" | "M2";
  datasetId: string;
  datasetVersion: number;
  datasetName: string;
  dateRange: {
    start: string;
    end: string;
  };
  targetDates?: string[];
  evaluation?: {
    finalMae: number | null;
    finalRmse: number | null;
    meanAbsTotalError: number | null;
    developmentMae: number | null;
    blocksWon: number;
  } | null;
  diagnosticsStatus?: "ok" | "warnings" | "problems";
}

export interface RankedRun {
  runId: string;
  rank: number;
  finalMae: number;
}

export interface ComparisonConditionResult {
  compatible: boolean;
  reasons: string[];
  rankings: RankedRun[] | null;
}

export function evaluateRunComparison(
  runs: ComparableRunSummary[]
): ComparisonConditionResult {
  if (runs.length < 2) {
    return {
      compatible: true,
      reasons: [],
      rankings: null,
    };
  }

  const reasons: string[] = [];

  // 1. Check all runs are EVALUATE mode
  const nonEvaluateRuns = runs.filter((r) => r.mode !== "EVALUATE");
  if (nonEvaluateRuns.length > 0) {
    const names = nonEvaluateRuns.map((r) => `"${r.displayName}"`).join(", ");
    reasons.push(
      `Mode mismatch: ${names} is in Fit-only mode without rolling forecast evaluation.`
    );
  }

  // 2. Check identical dataset ID
  const firstDatasetId = runs[0].datasetId;
  const differentDataset = runs.some((r) => r.datasetId !== firstDatasetId);
  if (differentDataset) {
    reasons.push("Different datasets: runs were fitted on different underlying data sources.");
  }

  // 3. Check identical dataset version
  const firstVersion = runs[0].datasetVersion;
  const differentVersion = runs.some((r) => r.datasetVersion !== firstVersion);
  if (differentVersion) {
    const versions = runs.map((r) => `"${r.displayName}" (v${r.datasetVersion})`).join(" vs ");
    reasons.push(`Dataset version mismatch: ${versions}.`);
  }

  // 4. Check target dates equality
  const firstTargets = runs[0].targetDates ? [...runs[0].targetDates].sort().join(",") : "";
  const differentTargets = runs.some((r) => {
    const current = r.targetDates ? [...r.targetDates].sort().join(",") : "";
    return current !== firstTargets;
  });

  if (differentTargets) {
    reasons.push(
      "Different target dates: forecast horizons or rolling evaluation origins differ between runs."
    );
  }

  // If there are condition differences, ranking is strictly prohibited
  if (reasons.length > 0) {
    return {
      compatible: false,
      reasons,
      rankings: null,
    };
  }

  // All evaluation conditions match! Rank runs by finalMae ascending
  const runsWithMae: Array<{ runId: string; mae: number }> = [];
  for (const r of runs) {
    const mae = r.evaluation?.finalMae;
    if (typeof mae === "number" && !Number.isNaN(mae)) {
      runsWithMae.push({ runId: r.id, mae });
    }
  }

  // If any run lacks final MAE, cannot provide complete ranking
  if (runsWithMae.length !== runs.length) {
    return {
      compatible: true,
      reasons: ["One or more runs do not have a computed final MAE metric."],
      rankings: null,
    };
  }

  runsWithMae.sort((a, b) => a.mae - b.mae);

  const rankings: RankedRun[] = runsWithMae.map((item, index) => ({
    runId: item.runId,
    rank: index + 1,
    finalMae: item.mae,
  }));

  return {
    compatible: true,
    reasons: [],
    rankings,
  };
}
