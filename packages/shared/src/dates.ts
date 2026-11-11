const ISO_DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
] as const;

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = ISO_DATE_REGEX.exec(value);
  if (!match) return false;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function parseIsoDate(iso: string): { year: number; month: number; day: number } {
  const match = ISO_DATE_REGEX.exec(iso);
  if (!match) {
    throw new Error(`Invalid ISO date string: "${iso}"`);
  }
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error(`Invalid calendar date: "${iso}"`);
  }

  return { year, month, day };
}

export function addDays(iso: string, days: number): string {
  const { year, month, day } = parseIsoDate(iso);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function diffDays(startIso: string, endIso: string): number {
  const p1 = parseIsoDate(startIso);
  const p2 = parseIsoDate(endIso);
  const t1 = Date.UTC(p1.year, p1.month - 1, p1.day);
  const t2 = Date.UTC(p2.year, p2.month - 1, p2.day);
  const msPerDay = 86_400_000;
  return Math.round((t2 - t1) / msPerDay);
}

export function listDates(startIso: string, endIso: string): string[] {
  const diff = diffDays(startIso, endIso);
  if (diff < 0) return [];
  const dates: string[] = [];
  for (let i = 0; i <= diff; i++) {
    dates.push(addDays(startIso, i));
  }
  return dates;
}

export function formatDisplayDate(iso: string): string {
  const { year, month, day } = parseIsoDate(iso);
  const dayStr = String(day).padStart(2, "0");
  const monthStr = MONTH_NAMES[month - 1];
  return `${dayStr} ${monthStr} ${year}`;
}
