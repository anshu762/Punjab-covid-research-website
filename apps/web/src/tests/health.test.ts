import { describe, expect, it } from "vitest";
import { GET } from "../app/api/health/route";

describe("Health API Route", () => {
  it("returns ok: true with 200 status", async () => {
    const response = GET();
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data).toEqual({ ok: true });
  });
});
