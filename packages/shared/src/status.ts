export const RUN_STATUSES = {
  QUEUED: { key: "QUEUED", label: "Queued", active: true, terminal: false },
  VALIDATING: { key: "VALIDATING", label: "Validating", active: true, terminal: false },
  FITTING: { key: "FITTING", label: "Fitting", active: true, terminal: false },
  EVALUATING: { key: "EVALUATING", label: "Evaluating", active: true, terminal: false },
  ESTIMATING_UNCERTAINTY: {
    key: "ESTIMATING_UNCERTAINTY",
    label: "Estimating uncertainty",
    active: true,
    terminal: false,
  },
  EXPORTING: { key: "EXPORTING", label: "Exporting", active: true, terminal: false },
  COMPLETED: { key: "COMPLETED", label: "Completed", active: false, terminal: true },
  FAILED: { key: "FAILED", label: "Failed", active: false, terminal: true },
  CANCELLED: { key: "CANCELLED", label: "Cancelled", active: false, terminal: true },
} as const;

export type RunStatusKey = keyof typeof RUN_STATUSES;

export const RUN_STAGES_ORDERED: RunStatusKey[] = [
  "QUEUED",
  "VALIDATING",
  "FITTING",
  "EVALUATING",
  "ESTIMATING_UNCERTAINTY",
  "EXPORTING",
  "COMPLETED",
];

export function isTerminal(status: RunStatusKey): boolean {
  return RUN_STATUSES[status]?.terminal ?? false;
}

export function isActive(status: RunStatusKey): boolean {
  return RUN_STATUSES[status]?.active ?? false;
}
