import { describe, expect, it } from "vitest";
import { APP_NAME } from "../constants";

describe("shared exports", () => {
  it("exports APP_NAME", () => {
    expect(APP_NAME).toBe("EpiLens");
  });
});
