/**
 * PNG DPI manipulation utility.
 * Injects or updates a pHYs chunk to set 300 DPI metadata in PNG files.
 * Strictly adheres to ISO/IEC 15948 / RFC 2083 PNG specification.
 */

// Precomputed CRC32 table for IEEE 802.3 CRC32
let crcTable: Uint32Array | null = null;

function getCrcTable(): Uint32Array {
  if (crcTable) return crcTable;
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) {
        c = 0xedb88320 ^ (c >>> 1);
      } else {
        c = c >>> 1;
      }
    }
    table[n] = c >>> 0;
  }
  crcTable = table;
  return table;
}

function crc32(buf: Uint8Array, start: number, end: number): number {
  const table = getCrcTable();
  let c = 0xffffffff;
  for (let i = start; i < end; i++) {
    c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

/**
 * Checks whether the byte array starts with the valid PNG 8-byte signature.
 */
export function isPng(bytes: Uint8Array): boolean {
  if (bytes.length < 8) return false;
  for (let i = 0; i < 8; i++) {
    if (bytes[i] !== PNG_SIGNATURE[i]) return false;
  }
  return true;
}

/**
 * Parses existing DPI from the pHYs chunk if present.
 */
export function getPngDpi(
  bytes: Uint8Array
): { dpiX: number; dpiY: number; unit: number } | null {
  if (!isPng(bytes)) return null;

  let pos = 8;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  while (pos < bytes.length - 8) {
    const length = view.getUint32(pos);
    const typeStr = String.fromCharCode(
      bytes[pos + 4],
      bytes[pos + 5],
      bytes[pos + 6],
      bytes[pos + 7]
    );

    if (typeStr === "pHYs" && length === 9 && pos + 8 + 9 <= bytes.length) {
      const ppmX = view.getUint32(pos + 8);
      const ppmY = view.getUint32(pos + 12);
      const unit = bytes[pos + 16]; // 1 = metre, 0 = unknown

      if (unit === 1) {
        const dpiX = Math.round(ppmX * 0.0254);
        const dpiY = Math.round(ppmY * 0.0254);
        return { dpiX, dpiY, unit };
      }
      return { dpiX: ppmX, dpiY: ppmY, unit };
    }

    if (typeStr === "IEND") break;
    pos += 8 + length + 4; // length + type (4) + data (length) + crc (4)
  }

  return null;
}

/**
 * Injects a 300 DPI pHYs chunk (11811 pixels/metre) into the PNG binary.
 * If a pHYs chunk already exists, it is replaced; otherwise, it is inserted
 * immediately after the IHDR chunk.
 */
export function setPngDpi(pngBytes: Uint8Array, dpi = 300): Uint8Array {
  if (!isPng(pngBytes)) {
    throw new Error("Invalid PNG: missing standard 8-byte signature");
  }

  // 1 inch = 0.0254 metres.
  // 300 DPI = 300 / 0.0254 = 11811.0236... ≈ 11811 pixels/metre
  const ppm = Math.round(dpi / 0.0254);

  // Construct pHYs chunk:
  // 4 bytes: length = 9
  // 4 bytes: type = 'pHYs'
  // 4 bytes: X pixels per unit (uint32)
  // 4 bytes: Y pixels per unit (uint32)
  // 1 byte:  unit specifier (1 = metre)
  // 4 bytes: CRC32
  const physChunk = new Uint8Array(21);
  const physView = new DataView(physChunk.buffer);

  physView.setUint32(0, 9); // length
  physChunk[4] = 0x70; // 'p'
  physChunk[5] = 0x48; // 'H'
  physChunk[6] = 0x59; // 'Y'
  physChunk[7] = 0x73; // 's'

  physView.setUint32(8, ppm);
  physView.setUint32(12, ppm);
  physChunk[16] = 1; // 1 = metre

  const crc = crc32(physChunk, 4, 17);
  physView.setUint32(17, crc);

  // Find IHDR end and any existing pHYs chunk
  let pos = 8;
  const view = new DataView(pngBytes.buffer, pngBytes.byteOffset, pngBytes.byteLength);
  let ihdrEnd = -1;
  let existingPhysStart = -1;
  let existingPhysLength = 0;

  while (pos < pngBytes.length - 8) {
    const chunkLen = view.getUint32(pos);
    const chunkType = String.fromCharCode(
      pngBytes[pos + 4],
      pngBytes[pos + 5],
      pngBytes[pos + 6],
      pngBytes[pos + 7]
    );

    const totalChunkBytes = 8 + chunkLen + 4;

    if (chunkType === "IHDR") {
      ihdrEnd = pos + totalChunkBytes;
    } else if (chunkType === "pHYs") {
      existingPhysStart = pos;
      existingPhysLength = totalChunkBytes;
      break;
    } else if (chunkType === "IDAT" || chunkType === "IEND") {
      // Must be before IDAT
      break;
    }

    pos += totalChunkBytes;
  }

  if (existingPhysStart !== -1) {
    // Replace existing pHYs chunk
    const result = new Uint8Array(
      pngBytes.length - existingPhysLength + physChunk.length
    );
    result.set(pngBytes.subarray(0, existingPhysStart), 0);
    result.set(physChunk, existingPhysStart);
    result.set(
      pngBytes.subarray(existingPhysStart + existingPhysLength),
      existingPhysStart + physChunk.length
    );
    return result;
  }

  // Insert immediately after IHDR (typically offset 33)
  const insertPos = ihdrEnd !== -1 ? ihdrEnd : 33;
  const result = new Uint8Array(pngBytes.length + physChunk.length);
  result.set(pngBytes.subarray(0, insertPos), 0);
  result.set(physChunk, insertPos);
  result.set(pngBytes.subarray(insertPos), insertPos + physChunk.length);

  return result;
}
