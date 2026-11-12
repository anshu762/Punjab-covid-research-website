import { describe, it, expect } from "vitest";
import { sanitizeFilename } from "../components/charts/figureExport";

describe("figureExport - sanitizeFilename", () => {
  it("sanitizes spaces, special characters, and converts to lowercase", () => {
    expect(sanitizeFilename("EpiLens Punjab Run #123 (M1)")).toBe("epilens_punjab_run__123__m1_");
    expect(sanitizeFilename("test/path\\file:name*?")).toBe("test_path_file_name__");
    expect(sanitizeFilename("epilens_run123_observed_2020-07-01")).toBe("epilens_run123_observed_2020-07-01");
  });

  it("preserves alphanumeric, hyphen, underscore, and dot characters", () => {
    expect(sanitizeFilename("epilens_run_abc-123.png")).toBe("epilens_run_abc-123.png");
  });
});
