import { describe, it, expect } from "vitest";
import { neutralizeCell } from "../lib/downloadCsv";

describe("neutralizeCell", () => {
  it("prefixes dangerous formula injection triggers in text strings", () => {
    expect(neutralizeCell("=1+1")).toBe("'=1+1");
    expect(neutralizeCell("+SUM(A1:B2)")).toBe("'+SUM(A1:B2)");
    expect(neutralizeCell("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(neutralizeCell("\tcmd.exe")).toBe("'\tcmd.exe");
    expect(neutralizeCell("\rpowershell")).toBe("'\rpowershell");
    expect(neutralizeCell("-2+5")).toBe("'-2+5");
  });

  it("leaves standard numbers and valid numeric strings untouched", () => {
    expect(neutralizeCell(42)).toBe("42");
    expect(neutralizeCell(-15)).toBe("-15");
    expect(neutralizeCell(3.14)).toBe("3.14");
    expect(neutralizeCell("100")).toBe("100");
    expect(neutralizeCell("-100")).toBe("-100");
    expect(neutralizeCell("+50")).toBe("+50");
  });

  it("handles null and undefined gracefully", () => {
    expect(neutralizeCell(null)).toBe("");
    expect(neutralizeCell(undefined)).toBe("");
  });

  it("preserves safe strings", () => {
    expect(neutralizeCell("Punjab, India")).toBe("Punjab, India");
    expect(neutralizeCell("2020-07-01")).toBe("2020-07-01");
  });
});
