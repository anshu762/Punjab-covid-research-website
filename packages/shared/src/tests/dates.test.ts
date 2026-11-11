import { describe, expect, it } from "vitest";
import {
  addDays,
  diffDays,
  formatDisplayDate,
  isIsoDate,
  listDates,
  parseIsoDate,
} from "../dates";

describe("dates utilities", () => {
  it("validates ISO date format correctly", () => {
    expect(isIsoDate("2020-07-01")).toBe(true);
    expect(isIsoDate("2020-02-29")).toBe(true); // Leap day 2020
    expect(isIsoDate("2021-02-29")).toBe(false); // Not a leap day
    expect(isIsoDate("2020-13-01")).toBe(false);
    expect(isIsoDate("invalid")).toBe(false);
    expect(isIsoDate(null)).toBe(false);
  });

  it("parses valid ISO dates and rejects invalid ones", () => {
    expect(parseIsoDate("2020-07-01")).toEqual({ year: 2020, month: 7, day: 1 });
    expect(() => parseIsoDate("2021-02-29")).toThrow();
    expect(() => parseIsoDate("bad-date")).toThrow();
  });

  it("adds days accurately across month and leap day boundaries", () => {
    expect(addDays("2020-02-28", 1)).toBe("2020-02-29");
    expect(addDays("2020-02-28", 2)).toBe("2020-03-01");
    expect(addDays("2020-12-31", 1)).toBe("2021-01-01");
    expect(addDays("2020-07-10", -5)).toBe("2020-07-05");
  });

  it("calculates diffDays between dates", () => {
    expect(diffDays("2020-07-01", "2020-07-08")).toBe(7);
    expect(diffDays("2020-07-08", "2020-07-01")).toBe(-7);
    expect(diffDays("2020-02-28", "2020-03-01")).toBe(2);
    expect(diffDays("2020-07-01", "2020-07-01")).toBe(0);
  });

  it("generates a full list of dates in range", () => {
    const dates = listDates("2020-08-30", "2020-09-02");
    expect(dates).toEqual(["2020-08-30", "2020-08-31", "2020-09-01", "2020-09-02"]);
    expect(listDates("2020-09-02", "2020-08-30")).toEqual([]);
  });

  it("formats display dates as DD MMM YYYY", () => {
    expect(formatDisplayDate("2020-07-01")).toBe("01 Jul 2020");
    expect(formatDisplayDate("2020-11-30")).toBe("30 Nov 2020");
  });
});
