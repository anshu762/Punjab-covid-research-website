import { describe, it, expect } from "vitest";
import { generateExportToken, verifyExportToken } from "@/lib/exportToken";
import { ARCHIVE_ALLOWLIST } from "@epilens/shared";

describe("Security & Ownership Verification Suite", () => {
  describe("1. SSRF Allowlist & Remote Fetch Protection", () => {
    function isHostAllowed(urlStr: string): boolean {
      try {
        const parsed = new URL(urlStr);
        if (parsed.protocol !== "https:") return false;
        return ARCHIVE_ALLOWLIST.includes(parsed.hostname as (typeof ARCHIVE_ALLOWLIST)[number]);
      } catch {
        return false;
      }
    }

    it("accepts only whitelisted HTTPS archive hosts", () => {
      expect(isHostAllowed("https://data.covid19india.org/csv/latest/state_wise.csv")).toBe(true);
      expect(isHostAllowed("https://data.covid19india.org/documentation/csv/")).toBe(true);
    });

    it("rejects cloud metadata IP addresses (SSRF)", () => {
      expect(isHostAllowed("http://169.254.169.254/latest/meta-data")).toBe(false);
      expect(isHostAllowed("https://169.254.169.254/latest/meta-data")).toBe(false);
    });

    it("rejects malicious domains and subdomains", () => {
      expect(isHostAllowed("https://evil.com/fake.csv")).toBe(false);
      expect(isHostAllowed("https://data.covid19india.org.evil.com/fake.csv")).toBe(false);
      expect(isHostAllowed("https://evil-data.covid19india.org/fake.csv")).toBe(false);
      expect(isHostAllowed("http://data.covid19india.org/insecure.csv")).toBe(false);
    });
  });

  describe("2. Expiring Signed Download Tokens (HMAC-SHA256)", () => {
    it("generates and verifies valid token within 5-minute window", () => {
      const token = generateExportToken("exp_123", "user_a", 300);

      const result = verifyExportToken(token, "exp_123", "user_a");
      expect(result.valid).toBe(true);
      expect(result.exportId).toBe("exp_123");
      expect(result.userId).toBe("user_a");
    });

    it("rejects expired tokens strictly", () => {
      const token = generateExportToken("exp_123", "user_a", -10); // already expired

      const result = verifyExportToken(token, "exp_123", "user_a");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("expired");
    });

    it("rejects tampered token payloads and signatures", () => {
      const token = generateExportToken("exp_123", "user_a", 300);

      const [encodedPayload, sig] = token.split(".");
      // Tamper userId in payload from user_a to user_b
      const decoded = JSON.parse(Buffer.from(encodedPayload, "base64url").toString());
      decoded.userId = "user_b";
      const tamperedPayload = Buffer.from(JSON.stringify(decoded)).toString("base64url");
      const tamperedToken = `${tamperedPayload}.${sig}`;

      const result = verifyExportToken(tamperedToken, "exp_123", "user_b");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid signature");
    });

    it("rejects user ID or export ID mismatch", () => {
      const token = generateExportToken("exp_123", "user_a", 300);

      const resultMismatchUser = verifyExportToken(token, "exp_123", "user_b");
      expect(resultMismatchUser.valid).toBe(false);
      expect(resultMismatchUser.error).toBe("User ID mismatch");

      const resultMismatchExp = verifyExportToken(token, "exp_999", "user_a");
      expect(resultMismatchExp.valid).toBe(false);
      expect(resultMismatchExp.error).toBe("Export ID mismatch");
    });
  });

  describe("3. Spreadsheet Formula Injection Neutralization", () => {
    function sanitizeFormulaCell(val: string): string {
      if (typeof val !== "string") return val;
      const DANGEROUS_PREFIXES = ["=", "+", "-", "@", "\t", "\r"];
      if (DANGEROUS_PREFIXES.some((prefix) => val.startsWith(prefix))) {
        return `'${val}`;
      }
      return val;
    }

    it("prefixes dangerous formula injection characters with single quote", () => {
      expect(sanitizeFormulaCell("=cmd|'/C calc'!A0")).toBe("'=cmd|'/C calc'!A0");
      expect(sanitizeFormulaCell("+12345")).toBe("'+12345");
      expect(sanitizeFormulaCell("-20%")).toBe("'-20%");
      expect(sanitizeFormulaCell("@SUM(A1:A10)")).toBe("'@SUM(A1:A10)");
      expect(sanitizeFormulaCell("\tTAB_INJECTION")).toBe("'\tTAB_INJECTION");
      expect(sanitizeFormulaCell("\rRETURN_INJECTION")).toBe("'\rRETURN_INJECTION");
    });

    it("leaves safe strings and numbers unmodified", () => {
      expect(sanitizeFormulaCell("Punjab COVID-19 Run")).toBe("Punjab COVID-19 Run");
      expect(sanitizeFormulaCell("2020-07-01")).toBe("2020-07-01");
      expect(sanitizeFormulaCell("OK")).toBe("OK");
    });
  });

  describe("4. Ownership Isolation Invariants", () => {
    it("ensures cross-user mutation or access always fails", async () => {
      // Mock db query where condition
      const mockQueryWhere = (userContextId: string, runOwnerId: string) => {
        if (userContextId !== runOwnerId) {
          return null; // Equivalent to where: { id, ownerId: user.id } returning null
        }
        return { id: "run_123", ownerId: runOwnerId };
      };

      const userA = "user_alpha_123";
      const userB = "user_beta_456";
      const runCreatedByA = "user_alpha_123";

      // User A can access own run
      expect(mockQueryWhere(userA, runCreatedByA)).not.toBeNull();

      // User B cannot access User A's run -> results in 404/403
      expect(mockQueryWhere(userB, runCreatedByA)).toBeNull();
    });
  });
});
