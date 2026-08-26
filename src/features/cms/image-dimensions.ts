/**
 * Header-only image dimension parsing for PNG / JPEG / WebP — no decoding, no
 * external deps (issue #102: dimensions are captured server-side at upload).
 *
 * Each parser reads only the bytes it needs and returns null for anything that
 * is not a recognized/canonical image of that type, so a corrupt or unexpected
 * buffer never produces a bogus width/height.
 */

export interface ImageDimensions {
  width: number;
  height: number;
}

function readUInt16BE(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] << 8) | bytes[offset + 1];
}

function readUInt32BE(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset] << 24) |
    (bytes[offset + 1] << 16) |
    (bytes[offset + 2] << 8) |
    bytes[offset + 3]
  );
}

function readUInt16LE(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function readUInt24LE(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function parsePng(bytes: Uint8Array): ImageDimensions | null {
  if (bytes.length < 24) return null;
  for (let i = 0; i < PNG_SIGNATURE.length; i++) {
    if (bytes[i] !== PNG_SIGNATURE[i]) return null;
  }
  // IHDR data starts at offset 16: width (4B BE), height (4B BE).
  const width = readUInt32BE(bytes, 16);
  const height = readUInt32BE(bytes, 20);
  if (width === 0 || height === 0) return null;
  return { width, height };
}

const JPEG_SOF_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);

function parseJpeg(bytes: Uint8Array): ImageDimensions | null {
  if (bytes.length < 4) return null;
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;

  let offset = 2;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    const marker = bytes[offset + 1];
    if (marker === 0xff || marker === 0x00) {
      offset += 1;
      continue;
    }
    // Standalone markers (RST / SOI / EOI / TEM) carry no length.
    if (
      (marker >= 0xd0 && marker <= 0xd7) ||
      marker === 0x01 ||
      marker === 0xd8 ||
      marker === 0xd9
    ) {
      offset += 2;
      continue;
    }
    if (offset + 4 > bytes.length) return null;
    const segmentLength = readUInt16BE(bytes, offset + 2);
    if (segmentLength < 2) return null;

    if (JPEG_SOF_MARKERS.has(marker)) {
      // SOF: precision(1B) height(2B BE) width(2B BE) …
      if (offset + 9 > bytes.length) return null;
      const height = readUInt16BE(bytes, offset + 5);
      const width = readUInt16BE(bytes, offset + 7);
      if (width === 0 || height === 0) return null;
      return { width, height };
    }
    offset += 2 + segmentLength;
  }
  return null;
}

function parseWebp(bytes: Uint8Array): ImageDimensions | null {
  if (bytes.length < 25) return null;
  // "RIFF" .... "WEBP"
  if (
    bytes[0] !== 0x52 ||
    bytes[1] !== 0x49 ||
    bytes[2] !== 0x46 ||
    bytes[3] !== 0x46
  ) {
    return null;
  }
  if (
    bytes[8] !== 0x57 ||
    bytes[9] !== 0x45 ||
    bytes[10] !== 0x42 ||
    bytes[11] !== 0x50
  ) {
    return null;
  }

  // Chunk type at offset 12: VP8X (extended), VP8L (lossless), or VP8 (lossy).
  const chunk = String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15]);

  if (chunk === "VP8X") {
    // Canvas size: 3B LE width - 1, 3B LE height - 1, at offset 24.
    if (bytes.length < 30) return null;
    const width = readUInt24LE(bytes, 24) + 1;
    const height = readUInt24LE(bytes, 27) + 1;
    return { width, height };
  }

  if (chunk === "VP8L") {
    // Lossless: 1B signature 0x2f at 20, then 14-bit little-endian
    // (width-1, height-1) packed into 4 bytes at offset 21.
    if (bytes[20] !== 0x2f || bytes.length < 25) return null;
    const bits =
      bytes[21] |
      (bytes[22] << 8) |
      (bytes[23] << 16) |
      (bytes[24] << 24);
    const width = (bits & 0x3fff) + 1;
    const height = ((bits >> 14) & 0x3fff) + 1;
    return { width, height };
  }

  if (chunk === "VP8 ") {
    // Lossy: frame starts at offset 20 (after the 8-byte chunk header: 4B tag
    // + 4B size). 3B frame tag then width(2B LE) height(2B LE) masked to 14 bits.
    if (bytes.length < 27) return null;
    const frameStart = 20;
    // Frame tag: 3 bytes. Start code byte should be 0x9d (key frame).
    if (bytes[frameStart] !== 0x9d) return null;
    const width = readUInt16LE(bytes, frameStart + 3) & 0x3fff;
    const height = readUInt16LE(bytes, frameStart + 5) & 0x3fff;
    if (width === 0 || height === 0) return null;
    return { width, height };
  }

  return null;
}

/**
 * Read image dimensions from a file buffer, or null when the buffer is not a
 * recognized PNG / JPEG / WebP image.
 */
export function readImageDimensions(buffer: ArrayBuffer): ImageDimensions | null {
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 8) return null;

  if (bytes[0] === 0x89 && bytes[1] === 0x50) return parsePng(bytes);
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return parseJpeg(bytes);
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46
  ) {
    return parseWebp(bytes);
  }
  return null;
}