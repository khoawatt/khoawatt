import assert from "node:assert/strict";
import { test } from "node:test";

import { imageDimensions } from "./image-dimensions";

function pngBytes(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(33);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  // IHDR length + type
  bytes.set([0, 0, 0, 13], 8);
  bytes.set([0x49, 0x48, 0x44, 0x52], 12);
  bytes.set(
    [
      (width >>> 24) & 0xff,
      (width >>> 16) & 0xff,
      (width >>> 8) & 0xff,
      width & 0xff,
    ],
    16,
  );
  bytes.set(
    [
      (height >>> 24) & 0xff,
      (height >>> 16) & 0xff,
      (height >>> 8) & 0xff,
      height & 0xff,
    ],
    20,
  );
  return bytes;
}

function jpegBytes(width: number, height: number): Uint8Array {
  // SOI + SOF0 with one component.
  const bytes = new Uint8Array(19);
  bytes.set([0xff, 0xd8], 0);
  bytes.set([0xff, 0xc0], 2);
  bytes.set([(15 >> 8) & 0xff, 15 & 0xff], 4); // segment length
  bytes.set([0x08], 6); // precision
  bytes.set([(height >> 8) & 0xff, height & 0xff], 7);
  bytes.set([(width >> 8) & 0xff, width & 0xff], 9);
  bytes.set([0x01, 0x00, 0x00, 0x00, 0x00], 11);
  return bytes;
}

function webpVp8xBytes(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(30);
  const text = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) {
      bytes[offset + i] = value.charCodeAt(i);
    }
  };
  text(0, "RIFF");
  bytes.set([40, 0, 0, 0], 4);
  text(8, "WEBP");
  text(12, "VP8X");
  bytes.set([24, 0, 0, 0], 16); // chunk size
  bytes.set([0, 0, 0, 0], 20); // flags
  bytes.set([(width - 1) & 0xff, ((width - 1) >> 8) & 0xff, ((width - 1) >> 16) & 0xff], 24);
  bytes.set([(height - 1) & 0xff, ((height - 1) >> 8) & 0xff, ((height - 1) >> 16) & 0xff], 27);
  return bytes;
}

function webpVp8lBytes(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(25);
  const text = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) {
      bytes[offset + i] = value.charCodeAt(i);
    }
  };
  text(0, "RIFF");
  bytes.set([17, 0, 0, 0], 4);
  text(8, "WEBP");
  text(12, "VP8L");
  bytes.set([5, 0, 0, 0], 16);
  bytes.set([0x2f], 20);
  const bits =
    ((width - 1) & 0x3fff) | (((height - 1) & 0x3fff) << 14); // fits in 28 bits
  bytes.set(
    [
      bits & 0xff,
      (bits >>> 8) & 0xff,
      (bits >>> 16) & 0xff,
      (bits >>> 24) & 0xff,
    ],
    21,
  );
  return bytes;
}

function webpLossyBytes(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(30);
  const text = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) {
      bytes[offset + i] = value.charCodeAt(i);
    }
  };
  text(0, "RIFF");
  bytes.set([22, 0, 0, 0], 4);
  text(8, "WEBP");
  text(12, "VP8 ");
  bytes.set([10, 0, 0, 0], 16);
  bytes.set([0x30, 0x01, 0x00], 20); // frame tag
  bytes.set([0x9d, 0x01, 0x2a], 23); // start code
  bytes.set([width & 0xff, (width >> 8) & 0xff], 26);
  bytes.set([height & 0xff, (height >> 8) & 0xff], 28);
  return bytes;
}

test("png dimensions come from the IHDR block", () => {
  assert.deepEqual(imageDimensions(pngBytes(852, 1280), "image/png"), {
    height: 1280,
    width: 852,
  });
});

test("jpeg dimensions come from the SOF marker", () => {
  assert.deepEqual(imageDimensions(jpegBytes(800, 450), "image/jpeg"), {
    height: 450,
    width: 800,
  });
});

test("webp extended (VP8X) dimensions are stored minus one", () => {
  assert.deepEqual(imageDimensions(webpVp8xBytes(1024, 768), "image/webp"), {
    height: 768,
    width: 1024,
  });
});

test("webp lossless (VP8L) packs dimensions into 14 bits each", () => {
  assert.deepEqual(imageDimensions(webpVp8lBytes(640, 480), "image/webp"), {
    height: 480,
    width: 640,
  });
});

test("webp lossy (VP8) reads the frame header", () => {
  assert.deepEqual(imageDimensions(webpLossyBytes(320, 240), "image/webp"), {
    height: 240,
    width: 320,
  });
});

test("truncated buffers resolve to unknown dimensions", () => {
  assert.equal(imageDimensions(new Uint8Array(10), "image/png"), null);
  assert.equal(imageDimensions(new Uint8Array(4), "image/jpeg"), null);
  assert.equal(imageDimensions(new Uint8Array(12), "image/webp"), null);
});

test("unknown mimes and corrupt payloads resolve to unknown dimensions", () => {
  assert.equal(imageDimensions(pngBytes(10, 10), "image/gif"), null);
  assert.equal(imageDimensions(webpLossyBytes(0, 0), "image/webp"), null);

  const garbage = new Uint8Array(64).fill(0x41);
  assert.equal(imageDimensions(garbage, "image/png"), null);
  assert.equal(imageDimensions(garbage, "image/jpeg"), null);
});
