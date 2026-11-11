import { describe, it, expect } from "vitest";
import { calculateTrailing7DayMean } from "./stats";

describe("calculateTrailing7DayMean", () => {
  it("returns null for the first 6 days", () => {
    const points = [
      { date: "2020-07-01", value: 10 },
      { date: "2020-07-02", value: 20 },
      { date: "2020-07-03", value: 30 },
      { date: "2020-07-04", value: 40 },
      { date: "2020-07-05", value: 50 },
      { date: "2020-07-06", value: 60 },
      { date: "2020-07-07", value: 70 },
    ];

    const result = calculateTrailing7DayMean(points);
    expect(result).toHaveLength(7);
    expect(result[0].mean).toBeNull();
    expect(result[5].mean).toBeNull();
    // 7th day: mean of 10..70 = 280 / 7 = 40
    expect(result[6].mean).toBe(40);
  });

  it("returns null if any day in the 7-day window is null", () => {
    const points = [
      { date: "2020-07-01", value: 10 },
      { date: "2020-07-02", value: 20 },
      { date: "2020-07-03", value: null }, // missing/null day
      { date: "2020-07-04", value: 40 },
      { date: "2020-07-05", value: 50 },
      { date: "2020-07-06", value: 60 },
      { date: "2020-07-07", value: 70 },
      { date: "2020-07-08", value: 80 },
    ];

    const result = calculateTrailing7DayMean(points);
    // Index 6 (2020-07-07) contains the null from day 3 -> mean must be null
    expect(result[6].mean).toBeNull();
    // Index 7 (2020-07-08) contains window from day 2 to day 8 (which includes day 3 null) -> mean must be null
    expect(result[7].mean).toBeNull();
  });
});
