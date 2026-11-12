import { describe, it, expect } from "vitest";
import { generateExportToken, verifyExportToken } from "../lib/exportToken";

describe("Export Token HMAC Verification", () => {
  it("generates and verifies valid token successfully", () => {
    const token = generateExportToken("exp_123", "user_abc", 300);
    const result = verifyExportToken(token, "exp_123", "user_abc");

    expect(result.valid).toBe(true);
    expect(result.exportId).toBe("exp_123");
    expect(result.userId).toBe("user_abc");
  });

  it("rejects token when exportId does not match", () => {
    const token = generateExportToken("exp_123", "user_abc", 300);
    const result = verifyExportToken(token, "exp_999", "user_abc");

    expect(result.valid).toBe(false);
    expect(result.error).toContain("Export ID mismatch");
  });

  it("rejects token when userId does not match", () => {
    const token = generateExportToken("exp_123", "user_abc", 300);
    const result = verifyExportToken(token, "exp_123", "user_attacker");

    expect(result.valid).toBe(false);
    expect(result.error).toContain("User ID mismatch");
  });

  it("rejects expired token", () => {
    // Generate token with negative TTL (already expired)
    const token = generateExportToken("exp_123", "user_abc", -10);
    const result = verifyExportToken(token, "exp_123", "user_abc");

    expect(result.valid).toBe(false);
    expect(result.error).toContain("expired");
  });

  it("rejects tampered signature", () => {
    const token = generateExportToken("exp_123", "user_abc", 300);
    const [payload, sig] = token.split(".");
    const tamperedToken = `${payload}.${sig.slice(0, -2)}xx`;

    const result = verifyExportToken(tamperedToken, "exp_123", "user_abc");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Invalid signature");
  });
});
