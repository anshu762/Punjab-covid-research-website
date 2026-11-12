import crypto from "crypto";

const DEFAULT_TTL_SECONDS = 300; // 5 minutes

function getSecret(): string {
  return process.env.AUTH_SECRET || "epilens-local-auth-secret-min-32-chars-long";
}

export interface ExportTokenPayload {
  exportId: string;
  userId: string;
  exp: number; // unix timestamp in seconds
}

export function generateExportToken(
  exportId: string,
  userId: string,
  ttlSeconds = DEFAULT_TTL_SECONDS
): string {
  const secret = getSecret();
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload: ExportTokenPayload = { exportId, userId, exp };

  const payloadStr = JSON.stringify(payload);
  const payloadB64 = Buffer.from(payloadStr, "utf-8").toString("base64url");

  const sig = crypto
    .createHmac("sha256", secret)
    .update(payloadB64)
    .digest("base64url");

  return `${payloadB64}.${sig}`;
}

export interface VerifyTokenResult {
  valid: boolean;
  exportId?: string;
  userId?: string;
  error?: string;
}

export function verifyExportToken(
  token: string,
  expectedExportId?: string,
  expectedUserId?: string
): VerifyTokenResult {
  if (!token || !token.includes(".")) {
    return { valid: false, error: "Malformed token" };
  }

  const [payloadB64, providedSig] = token.split(".");
  if (!payloadB64 || !providedSig) {
    return { valid: false, error: "Invalid token format" };
  }

  const secret = getSecret();
  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(payloadB64)
    .digest("base64url");

  const providedSigBuf = Buffer.from(providedSig);
  const expectedSigBuf = Buffer.from(expectedSig);

  if (
    providedSigBuf.length !== expectedSigBuf.length ||
    !crypto.timingSafeEqual(providedSigBuf, expectedSigBuf)
  ) {
    return { valid: false, error: "Invalid signature" };
  }

  try {
    const jsonStr = Buffer.from(payloadB64, "base64url").toString("utf-8");
    const payload = JSON.parse(jsonStr) as ExportTokenPayload;

    const nowSec = Math.floor(Date.now() / 1000);
    if (payload.exp < nowSec) {
      return { valid: false, error: "Token has expired" };
    }

    if (expectedExportId && payload.exportId !== expectedExportId) {
      return { valid: false, error: "Export ID mismatch" };
    }

    if (expectedUserId && payload.userId !== expectedUserId) {
      return { valid: false, error: "User ID mismatch" };
    }

    return {
      valid: true,
      exportId: payload.exportId,
      userId: payload.userId,
    };
  } catch {
    return { valid: false, error: "Failed to decode payload" };
  }
}
