const PLACEHOLDER = "—";

function isValidNumber(val: unknown): val is number {
  return typeof val === "number" && Number.isFinite(val) && !Number.isNaN(val);
}

export function formatInt(value: number | null | undefined): string {
  if (!isValidNumber(value)) return PLACEHOLDER;
  return Math.round(value).toLocaleString("en-IN");
}

export function formatNumber(
  value: number | null | undefined,
  digits: number = 2
): string {
  if (!isValidNumber(value)) return PLACEHOLDER;
  return value.toLocaleString("en-IN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatPercent(
  value: number | null | undefined,
  digits: number = 1
): string {
  if (!isValidNumber(value)) return PLACEHOLDER;
  const formatted = (value * 100).toLocaleString("en-IN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return `${formatted}%`;
}

export function formatDuration(seconds: number | null | undefined): string {
  if (!isValidNumber(seconds) || seconds < 0) return PLACEHOLDER;
  const s = Math.round(seconds);
  if (s < 60) return `${s}s`;
  const mins = Math.floor(s / 60);
  const remainingSecs = s % 60;
  if (mins < 60) {
    return remainingSecs > 0 ? `${mins}m ${remainingSecs}s` : `${mins}m`;
  }
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
}
