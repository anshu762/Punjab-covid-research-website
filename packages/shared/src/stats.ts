/**
 * Time series statistics helpers for EpiLens.
 */

export interface SeriesPoint {
  date: string;
  value: number | null;
}

export interface TrailingMeanPoint {
  date: string;
  mean: number | null;
}

/**
 * Computes trailing 7-day moving average.
 *
 * PRD Rule:
 * Requires all 7 days in the window [t-6 .. t] to be present with non-null values.
 * If any day in the window is missing or null, the 7-day mean for day t is null.
 */
export function calculateTrailing7DayMean(points: SeriesPoint[]): TrailingMeanPoint[] {
  const result: TrailingMeanPoint[] = [];

  for (let i = 0; i < points.length; i++) {
    const currentDate = points[i].date;

    // Window must have at least 7 points
    if (i < 6) {
      result.push({ date: currentDate, mean: null });
      continue;
    }

    let sum = 0;
    let hasNull = false;

    for (let j = i - 6; j <= i; j++) {
      const val = points[j].value;
      if (val === null || val === undefined || isNaN(val)) {
        hasNull = true;
        break;
      }
      sum += val;
    }

    if (hasNull) {
      result.push({ date: currentDate, mean: null });
    } else {
      result.push({
        date: currentDate,
        mean: Math.round((sum / 7) * 100) / 100, // round to 2 decimals
      });
    }
  }

  return result;
}
