import { prisma } from "@/lib/db";
import { formatDisplayDate, formatInt } from "@epilens/shared";

export const SYSTEM_PROMPT = `You are a scientific communication assistant for the EpiLens research platform, analyzing COVID-19 dynamics in Punjab, India.
Your mission is to provide an objective, plain-language explanation of the research output.

STRICT CONSTRAINTS (Violating these will invalidate the output):
1. Restate ONLY the facts, parameters, and calculated metrics provided in the JSON context.
2. DO NOT invent, extrapolate, or hallucinate numbers, rates, dates, or outcomes not found in the input.
3. DO NOT provide medical advice, treatment guidance, or policy prescriptions.
4. PROHIBITED VOCABULARY: Never use causal or policy claim words such as "lives saved", "cases prevented", "proven effect", "policy impact", or "guaranteed".
5. Acknowledge that epidemiological models are conditional on their underlying assumptions (recovery duration, reporting fraction, susceptibility).
6. Keep the response concise, factual, and divided into 2-3 readable paragraphs.`;

export async function buildContextForKind(
  kind: "results" | "scenario" | "dataset",
  refId: string
): Promise<{ context: Record<string, unknown>; summaryFallback: string }> {
  if (kind === "results") {
    const run = await prisma.run.findUnique({
      where: { id: refId },
      include: { fitResult: true, dataset: true },
    });
    if (!run) throw new Error(`Run ${refId} not found`);

    const rawPayload = run.fitResult?.payload as Record<string, unknown> | undefined;
    const assumptions = (rawPayload?.assumptions || {}) as Record<string, unknown>;
    const params = (rawPayload?.parameters || {}) as Record<string, unknown>;
    const evalData = (rawPayload?.evaluation || {}) as Record<string, unknown>;
    const selection = (evalData?.selection || {}) as Record<string, unknown>;

    const context = {
      runId: run.id,
      displayName: run.displayName,
      modelType: run.modelType,
      mode: run.mode,
      dataset: {
        name: run.dataset?.name,
        version: run.dataset?.version,
      },
      assumptions: {
        infectiousDurationDays: assumptions.infectiousDurationDays,
        gamma: assumptions.gamma,
        reportingFraction: assumptions.reportingFraction,
        susceptibleFraction: assumptions.susceptibleFraction,
      },
      parameters: {
        beta: params.beta,
        beta1: params.beta1,
        beta2: params.beta2,
        i0: params.i0,
      },
      evaluation: {
        verdict: selection.verdict,
        verdictText: selection.verdictText,
        improvement: selection.improvement,
      },
    };

    const modelName = run.modelType === "M2" ? "SIR with change-point (M2)" : "SIR constant (M1)";
    const verdictStr = selection.verdictText || "Analysis completed";
    const gammaVal = typeof assumptions.gamma === "number" ? assumptions.gamma.toFixed(4) : "0.1429";
    const rhoVal = typeof assumptions.reportingFraction === "number" ? `${Math.round(assumptions.reportingFraction * 100)}%` : "20%";

    const summaryFallback =
      `This analysis fitted the ${modelName} model to empirical observations from ${run.dataset?.name || "Punjab dataset"} (v${run.dataset?.version || 1}). ` +
      `Under assumed recovery rate γ = ${gammaVal} per day and assumed reporting fraction ρ = ${rhoVal}, the optimization converged to an empirical trajectory. ` +
      `${run.mode === "EVALUATE" ? `In rolling 7-day held-out forecast evaluations, the evaluation concluded: "${verdictStr}".` : "This run was fitted descriptively without rolling forecast evaluations."}`;

    return { context, summaryFallback };
  }

  if (kind === "scenario") {
    const scenario = await prisma.scenario.findUnique({
      where: { id: refId },
      include: { parentRun: true },
    });
    if (!scenario) throw new Error(`Scenario ${refId} not found`);

    const summary = (scenario.summary || {}) as Record<string, unknown>;
    const config = (scenario.config || {}) as Record<string, unknown>;

    const context = {
      scenarioId: scenario.id,
      parentRunId: scenario.parentRunId,
      percentChange: scenario.percentChange,
      horizonDays: scenario.horizonDays,
      config,
      summary,
    };

    const signStr = scenario.percentChange > 0 ? `+${scenario.percentChange}%` : `${scenario.percentChange}%`;
    const casesVal = typeof summary.scenarioExpectedCases === "number" ? formatInt(Math.round(summary.scenarioExpectedCases)) : "—";
    const baseCasesVal = typeof summary.baselineExpectedCases === "number" ? formatInt(Math.round(summary.baselineExpectedCases)) : "—";

    const summaryFallback =
      `This forward simulation projects epidemiological dynamics under a hypothetical ${signStr} transmission change for ${scenario.horizonDays} days starting ${String(config.startDate || "")}. ` +
      `Holding calibrated baseline parameters constant, the model projects ${casesVal} expected reported cases under the scenario versus ${baseCasesVal} at the baseline. ` +
      `This is a mathematical simulation conditional on model assumptions, not a policy evaluation or guaranteed outcome.`;

    return { context, summaryFallback };
  }

  // kind === "dataset"
  const dataset = await prisma.dataset.findUnique({
    where: { id: refId },
  });
  if (!dataset) throw new Error(`Dataset ${refId} not found`);

  const obsCount = await prisma.observation.count({ where: { datasetId: refId } });
  const firstObs = await prisma.observation.findFirst({
    where: { datasetId: refId },
    orderBy: { date: "asc" },
    select: { date: true },
  });
  const lastObs = await prisma.observation.findFirst({
    where: { datasetId: refId },
    orderBy: { date: "desc" },
    select: { date: true },
  });

  const startDateStr = firstObs?.date ? firstObs.date.toISOString().slice(0, 10) : null;
  const endDateStr = lastObs?.date ? lastObs.date.toISOString().slice(0, 10) : null;

  const context = {
    datasetId: dataset.id,
    name: dataset.name,
    version: dataset.version,
    source: dataset.sourceName,
    population: {
      value: dataset.populationValue,
      sourceUrl: dataset.populationSourceUrl,
      year: dataset.populationReferenceYear,
      geography: dataset.populationGeography,
    },
    observationsCount: obsCount,
    dateRange: {
      start: startDateStr,
      end: endDateStr,
    },
    isSynthetic: dataset.isSynthetic,
  };

  const summaryFallback =
    `Dataset "${dataset.name}" (version ${dataset.version}) contains ${obsCount} normalized daily observations ` +
    `${startDateStr && endDateStr ? `spanning ${formatDisplayDate(startDateStr)} to ${formatDisplayDate(endDateStr)}` : ""}. ` +
    `Population baseline is ${dataset.populationValue ? formatInt(dataset.populationValue) : "30,000,000"} (${dataset.populationGeography || "Punjab, India"}) sourced from ${dataset.populationSourceUrl || "census projections"}. ` +
    `${dataset.isSynthetic ? "Note: This dataset is synthetic demonstration data." : "This dataset represents empirical reported surveillance data."}`;

  return { context, summaryFallback };
}
