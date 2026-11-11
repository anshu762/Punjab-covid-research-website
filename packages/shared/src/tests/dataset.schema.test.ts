import { describe, it, expect } from "vitest";
import {
  ColumnMappingSchema,
  ConfirmDatasetSchema,
  UpdatePopulationSchema,
  ImportBundledSchema,
} from "../schemas/dataset";

describe("Dataset Zod Schemas", () => {
  it("validates ColumnMappingSchema", () => {
    const valid = ColumnMappingSchema.safeParse({
      date: "Observation_Date",
      new_confirmed: "Daily_Confirmed",
      region_code: "State",
    });
    expect(valid.success).toBe(true);

    const missingDate = ColumnMappingSchema.safeParse({
      new_confirmed: "Cases",
    });
    expect(missingDate.success).toBe(false);

    const missingCount = ColumnMappingSchema.safeParse({
      date: "Date",
    });
    expect(missingCount.success).toBe(false);
  });

  it("validates ConfirmDatasetSchema", () => {
    const valid = ConfirmDatasetSchema.safeParse({
      datasetId: "ds_123",
      columnMapping: {
        date: "Date",
        new_confirmed: "Cases",
      },
      dateRange: ["2020-07-01", "2020-11-30"],
      population: 27743338,
    });
    expect(valid.success).toBe(true);

    const badDateRange = ConfirmDatasetSchema.safeParse({
      datasetId: "ds_123",
      columnMapping: { date: "Date", new_confirmed: "Cases" },
      dateRange: ["invalid-date", "2020-11-30"],
    });
    expect(badDateRange.success).toBe(false);
  });

  it("validates UpdatePopulationSchema", () => {
    const valid = UpdatePopulationSchema.safeParse({
      populationValue: 27743338,
      populationGeography: "Punjab, India",
      populationReferenceYear: 2011,
      populationSourceUrl: "https://censusindia.gov.in/",
    });
    expect(valid.success).toBe(true);

    // Rejects population < 10,000
    const tooLow = UpdatePopulationSchema.safeParse({
      populationValue: 500,
      populationGeography: "Punjab",
    });
    expect(tooLow.success).toBe(false);

    // Rejects empty geography
    const emptyGeo = UpdatePopulationSchema.safeParse({
      populationValue: 25000000,
      populationGeography: "A",
    });
    expect(emptyGeo.success).toBe(false);
  });

  it("validates ImportBundledSchema", () => {
    expect(ImportBundledSchema.safeParse({ sourceKey: "punjab_frozen_archive" }).success).toBe(true);
    expect(ImportBundledSchema.safeParse({ sourceKey: "synthetic_demo" }).success).toBe(true);
    expect(ImportBundledSchema.safeParse({ sourceKey: "unknown_key" }).success).toBe(false);
  });
});
