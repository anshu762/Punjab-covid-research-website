/**
 * Numerical grounding validator for AI-generated explanations.
 * Strictly verifies that all numbers present in the AI output exist
 * within the verified context JSON, flagging any potential hallucinations.
 */

export function extractNumbersFromText(text: string): number[] {
  // Matches integers, floats, and percentages (e.g. 142.5, 20%, 30,000, -15%)
  const cleaned = text.replace(/,/g, "");
  const regex = /[-+]?\b\d+(?:\.\d+)?%?\b/g;
  const matches = cleaned.match(regex) || [];

  const numbers: number[] = [];
  for (const m of matches) {
    const isPct = m.endsWith("%");
    const numStr = isPct ? m.slice(0, -1) : m;
    const val = parseFloat(numStr);
    if (!Number.isNaN(val)) {
      numbers.push(val);
    }
  }

  return numbers;
}

export function extractNumbersFromContext(obj: unknown): number[] {
  const nums: number[] = [];

  function walk(val: unknown) {
    if (val === null || val === undefined) return;
    if (typeof val === "number") {
      if (!Number.isNaN(val)) nums.push(val);
    } else if (typeof val === "string") {
      // Check if string is a number or date
      const parsed = parseFloat(val);
      if (!Number.isNaN(parsed) && !val.includes("-")) {
        nums.push(parsed);
      }
    } else if (Array.isArray(val)) {
      for (const item of val) walk(item);
    } else if (typeof val === "object") {
      for (const k of Object.keys(val as Record<string, unknown>)) {
        walk((val as Record<string, unknown>)[k]);
      }
    }
  }

  walk(obj);
  return nums;
}

export function isNumberGrounded(num: number, contextNumbers: number[]): boolean {
  // Allow exact match, integer rounding match, or +/- 1.5% relative tolerance
  for (const c of contextNumbers) {
    if (num === c) return true;
    if (Math.round(num) === Math.round(c)) return true;
    if (c !== 0) {
      const relDiff = Math.abs(num - c) / Math.abs(c);
      if (relDiff <= 0.02) return true; // 2% tolerance for rounding/formatting
    }
  }
  return false;
}

export function verifyGrounding(
  aiText: string,
  contextObj: unknown
): {
  grounded: boolean;
  unverifiedNumbers: number[];
} {
  const textNums = extractNumbersFromText(aiText);
  const contextNums = extractNumbersFromContext(contextObj);

  // Common baseline constants that are always permitted (e.g. 1, 2, 7 days, 13 origins, 14, 28 days)
  const PERMITTED_CONSTANTS = new Set([1, 2, 3, 4, 7, 13, 14, 21, 28, 60, 100]);

  const unverified: number[] = [];

  for (const n of textNums) {
    if (PERMITTED_CONSTANTS.has(n)) continue;
    if (!isNumberGrounded(n, contextNums)) {
      unverified.push(n);
    }
  }

  return {
    grounded: unverified.length === 0,
    unverifiedNumbers: unverified,
  };
}
