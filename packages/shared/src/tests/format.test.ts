import { describe, expect, it } from "vitest";
import { formatDuration, formatInt, formatNumber, formatPercent } from "../format";

describe("format utilities", () => {
  it("formats integers with en-IN separators", () => {
    expect(formatInt(1000)).toBe("1,000");
    expect(formatInt(100000)).toBe("1,00,000"); // Indian numbering system
    expect(formatInt(0)).toBe("0");
    expect(formatInt(-5000)).toBe("-5,000");
  });

  it("handles null, undefined, NaN, and Infinity safely by returning em-dash", () => {
    expect(formatInt(null)).toBe("—");
    expect(formatInt(undefined)).toBe("—");
    expect(formatInt(NaN)).toBe("—");
    expect(formatInt(Infinity)).toBe("—");
    expect(formatInt(-Infinity)).toBe("—");

    expect(formatNumber(null)).toBe("—");
    expect(formatNumber(undefined)).toBe("—");
    expect(formatNumber(NaN)).toBe("—");
    expect(formatNumber(Infinity)).toBe("—");

    expect(formatPercent(null)).toBe("—");
    expect(formatPercent(NaN)).toBe("—");

    expect(formatDuration(null)).toBe("—");
    expect(formatDuration(-10)).toBe("—");
    expect(formatDuration(NaN)).toBe("—");
  });

  it("formats floating numbers with custom decimal digits", () => {
    expect(formatNumber(1234.5678, 2)).toBe("1,234.57");
    expect(formatNumber(1234.5, 3)).toBe("1,234.500");
    expect(formatNumber(0, 2)).toBe("0.00");
  });

  it("formats percentages correctly", () => {
    expect(formatPercent(0.125, 1)).toBe("12.5%");
    expect(formatPercent(0.2, 0)).toBe("20%");
    expect(formatPercent(-0.05, 1)).toBe("-5.0%");
  });

  it("formats durations in seconds, minutes, and hours", () => {
    expect(formatDuration(45)).toBe("45s");
    expect(formatDuration(125)).toBe("2m 5s");
    expect(formatDuration(120)).toBe("2m");
    expect(formatDuration(3665)).toBe("1h 1m");
    expect(formatDuration(7200)).toBe("2h");
  });
});
