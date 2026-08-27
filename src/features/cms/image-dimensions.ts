/**
 * Extract pixel dimensions from image bytes by parsing container headers.
 * Supports the three formats accepted by uploadMedia: PNG, JPEG, WebP.
 *
 * Pure byte inspection (no dependencies, no decoding) so it can run
 * server-side inside the upload action and inside the backfill script.
 * Returns null for anything malformed or unsupported — callers treat null
 * as "dimensions unknown" and may still store the asset.
 */

export interface ImageDimensions {
  width: number;
  height: number;
}

function readUint32(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset] << 24) |
      (bytes[offset + 1] << 16) |
      (bytes[offset + 2] << 8) |
      bytes[offset + 3]) >>>
    0
  );
}

function readUint16(bytes: Uint8Array, offset: number): number {
  return ((bytes[offset] << 8) | bytes[offset + 1]) >>> 0;
}

/** PNG: fixed layout — 8-byte signature then IHDR with w/h at offsets 16/20. */
function pngDimensions(bytes: Uint8Array): ImageDimensions | null {
  if (bytes.length < 24) return null;
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < signature.length; i += 1) {
    if (bytes[i] !== signature[i]) return null;
  }
  const width = readUint32(bytes, 16);
  const height = readUint32(bytes, 20);
  if (width === 0 || height === 0) return null;
  return { height, width };
}

/** JPEG: walk segment markers until a Start-Of-Frame carries the dimensions. */
const JPEG_SOF_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce,
  0xcf,
]);

function jpegDimensions(bytes: Uint8Array): ImageDimensions | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;

  let offset = 2;
  while (offset + 9 <= bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    const marker = bytes[offset + 1];
    // Standalone markers without a length payload — skip them.
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }
    const segmentLength = readUint16(bytes, offset + 2);
    if (segmentLength < 2) return null;
    if (JPEG_SOF_MARKERS.has(marker)) {
      if (offset + 9 > bytes.length) return null;
      const height = readUint16(bytes, offset + 5);
      const width = readUint16(bytes, offset + 7);
      if (width === 0 || height === 0) return null;
      return { height, width };
    }
    offset += 2 + segmentLength;
  }
  return null;
}

/** WebP: RIFF container; dimensions depend on the VP8 variant in chunk 1. */
function webpDimensions(bytes: Uint8Array): ImageDimensions | null {
  if (
    bytes.length < 12 ||
    String.fromCharCode(...bytes.subarray(0, 4)) !== "RIFF" ||
    String.fromCharCode(...bytes.subarray(8, 12)) !== "WEBP"
  ) {
    return null;
  }
  const format = String.fromCharCode(...bytes.subarray(12, 16));

  if (format === "VP8 ") {
    // Lossy: frame tag (3B) + start code 0x9d 0x01 0x2a, then 16-bit
    // little-endian sizes whose low 14 bits carry the dimension.
    if (bytes.length < 30) return null;
    if (bytes[23] !== 0x9d || bytes[24] !== 0x01 || bytes[25] !== 0x2a) {
      return null;
    }
    const width = (bytes[26] | (bytes[27] << 8)) & 0x3fff;
    const height = (bytes[28] | (bytes[29] << 8)) & 0x3fff;
    if (width === 0 || height === 0) return null;
    return { height, width };
  }

  if (format === "VP8L") {
    // Lossless: signature 0x2f then packed 14-bit width-1 / height-1.
    if (bytes.length < 25) return null;
    if (bytes[20] !== 0x2f) return null;
    const bits =
      bytes[21] | (bytes[22] << 8) | (bytes[23] << 16) | (bytes[24] << 24);
    const width = (bits & 0x3fff) + 1;
    const height = ((bits >> 14) & 0x3fff) + 1;
    return { height, width };
  }

  if (format === "VP8X") {
    // Extended: 24-bit width-1 / height-1 little-endian at offsets 24/27.
    const width =
      bytes[24] | (bytes[25] << 8) | (bytes[26] << 16);
    const height =
      bytes[27] | (bytes[28] << 8) | (bytes[29] << 16);
    if (width === 0 || height === 0) return null;
    return { height: height + 1, width: width + 1 };
  }

  return null;
}

export function imageDimensions(
  bytes: Uint8Array,
  mime: string,
): ImageDimensions | null {
  try {
    if (mime === "image/png") return pngDimensions(bytes);
    if (mime === "image/jpeg") return jpegDimensions(bytes);
    if (mime === "image/webp") return webpDimensions(bytes);
    return null;
  } catch {
    return null;
  }
}
