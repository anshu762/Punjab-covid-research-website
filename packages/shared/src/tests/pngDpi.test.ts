import { describe, it, expect } from "vitest";
import { isPng, getPngDpi, setPngDpi } from "../pngDpi";

// Minimal valid 1x1 transparent PNG (67 bytes)
// Signature (8) + IHDR (25) + IDAT (22) + IEND (12)
const MINIMAL_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

function getMinimalPngBytes(): Uint8Array {
  const binaryString = atob(MINIMAL_PNG_BASE64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

describe("PNG DPI Injection (setPngDpi)", () => {
  it("validates standard PNG signature correctly", () => {
    const png = getMinimalPngBytes();
    expect(isPng(png)).toBe(true);

    const corrupt = new Uint8Array([1, 2, 3, 4, 5]);
    expect(isPng(corrupt)).toBe(false);
  });

  it("injects 300 DPI pHYs chunk into PNG bytes", () => {
    const png = getMinimalPngBytes();
    expect(getPngDpi(png)).toBeNull();

    const withDpi = setPngDpi(png, 300);
    expect(isPng(withDpi)).toBe(true);

    const parsed = getPngDpi(withDpi);
    expect(parsed).not.toBeNull();
    expect(parsed?.unit).toBe(1); // metre
    expect(parsed?.dpiX).toBe(300);
    expect(parsed?.dpiY).toBe(300);
  });

  it("replaces existing pHYs chunk without growing file continuously", () => {
    const png = getMinimalPngBytes();
    const with300 = setPngDpi(png, 300);
    const with600 = setPngDpi(with300, 600);

    expect(with600.length).toBe(with300.length);
    const parsed600 = getPngDpi(with600);
    expect(parsed600?.dpiX).toBe(600);
    expect(parsed600?.dpiY).toBe(600);
  });

  it("throws on invalid PNG input", () => {
    const badBytes = new Uint8Array([10, 20, 30]);
    expect(() => setPngDpi(badBytes, 300)).toThrow(/Invalid PNG/);
  });
});
