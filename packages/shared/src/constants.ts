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
