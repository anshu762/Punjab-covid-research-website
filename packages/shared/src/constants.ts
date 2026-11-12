export const APP_NAME = "EpiLens";
export const APP_TAGLINE = "Punjab COVID-19 research workbench";
export const REGION = {
  code: "PB",
  name: "Punjab, India",
  disease: "COVID-19",
} as const;

export const DEFAULT_DATE_RANGE = {
  start: "2020-07-01",
  end: "2020-11-30",
} as const;

export const LIMITS = {
  uploadMaxBytes: 10 * 1024 * 1024,
  uploadMaxRows: 100_000,
  maxActiveJobsPerUser: 2,
  maxCompareRuns: 3,
} as const;

export const MODEL_DEFAULTS = {
  infectiousDurationDays: 7,
  reportingFraction: 0.20,
  susceptibleFraction: 0.95,
  bootstrapReplicates: 200,
  nStarts: 20,
  seed: 42,
  betaBounds: [0.01, 2] as const,
  dispersionBounds: [0.05, 1000] as const,
  maxInitialInfectious: 1_000_000,
  rtol: 1e-8,
  atol: 1e-8,
  forecastHorizonDays: 7,
  scenario: {
    percentChange: -20,
    horizonDays: 28,
    minPercent: -50,
    maxPercent: 50,
    stepPercent: 5,
    minHorizon: 7,
    maxHorizon: 60,
  },
} as const;

export const EVAL_PROTOCOL = {
  firstOrigin: "2020-08-31",
  originStepDays: 7,
  defaultBlocks: 13,
  developmentBlocks: 9,
  finalBlocks: 4,
  minInitialTrainingDays: 42,
  minBlocksCustom: 13,
} as const;

export const ARCHIVE_ALLOWLIST = ["data.covid19india.org"] as const;
export const METHODS_SOURCE_URL = "https://data.covid19india.org/documentation/csv/";

export const DEFAULT_POPULATION_PROVENANCE = {
  value: 30_141_373,
  geography: "Punjab, India",
  year: 2020,
  sourceUrl: "https://censusindia.gov.in/",
} as const;

export const CLEANING_RULES = {
  negativeCorrectionWindowDays: 14,
  minTrainingDaysForEvaluation: 42,
} as const;

export const EVALUATION_RULES = {
  m2ImprovementThresholdPct: 10,
  m2MinBlocksWonDev: 6,
  devBlocksTotal: 9,
  finalImprovementThresholdPct: 10,
  finalBlocksWonRequired: 3,
  finalBlocksTotal: 4,
} as const;

export const BOOTSTRAP_RULES = {
  totalReplicates: 200,
  minReliableSuccessfulReplicates: 180,
} as const;

export const SENSITIVITY_GRID = {
  durations: [5, 7, 10] as const,
  reportingFractions: [0.10, 0.20, 0.50] as const,
  susceptibleFractions: [0.85, 0.95, 0.99] as const,
  totalCombinations: 27,
} as const;

export const OPTIMIZATION_SHORTCUTS = {
  warmStartsEnabled: true,
  sensitivityReducedStarts: 5,
  primaryStarts: 20,
} as const;
