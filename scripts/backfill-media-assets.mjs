#!/usr/bin/env node
/**
 * Backfill the media_assets catalog from existing Storage objects (issue #102).
 *
 * The catalog is the source of truth for the admin media grid and the shared
 * picker modal. Objects uploaded BEFORE the catalog existed (or before this
 * migration) have no catalog row, so this script scans every known bucket,
 * reads each object's header to parse dimensions, and upserts a catalog row.
 * Idempotent: existing rows are preserved (title/alt untouched), missing ones
 * are created with a title derived from the filename.
 *
 * Usage (local-first):
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/backfill-media-assets.mjs
 * Verify locally, then re-run against the linked cloud project after the
 * migration is promoted there (human-approved production mutation).
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRole) {
  console.error(
    "Missing env: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
  );
  process.exit(1);
}

const client = createClient(url, serviceRole, {
  auth: { persistSession: false },
});

const BUCKETS = ["resume-media", "project-media", "blog-media", "portfolio"];

function parsePng(bytes) {
  if (bytes.length < 24) return null;
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < 8; i++) if (bytes[i] !== sig[i]) return null;
  const width =
    (bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19];
  const height =
    (bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23];
  return width > 0 && height > 0 ? { width, height } : null;
}

function parseJpeg(bytes) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  const sof = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
  let offset = 2;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    const marker = bytes[offset + 1];
    if (marker === 0xff || marker === 0x00) { offset += 1; continue; }
    if ((marker >= 0xd0 && marker <= 0xd7) || marker === 0x01 || marker === 0xd8 || marker === 0xd9) {
      offset += 2; continue;
    }
    const len = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if (len < 2) return null;
    if (sof.has(marker)) {
      if (offset + 9 > bytes.length) return null;
      const height = (bytes[offset + 5] << 8) | bytes[offset + 6];
      const width = (bytes[offset + 7] << 8) | bytes[offset + 8];
      return width > 0 && height > 0 ? { width, height } : null;
    }
    offset += 2 + len;
  }
  return null;
}

function parseWebp(bytes) {
  if (bytes.length < 25) return null;
  if (bytes[0] !== 0x52 || bytes[1] !== 0x49 || bytes[2] !== 0x46 || bytes[3] !== 0x46) return null;
  if (bytes[8] !== 0x57 || bytes[9] !== 0x45 || bytes[10] !== 0x42 || bytes[11] !== 0x50) return null;
  const chunk = String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15]);
  if (chunk === "VP8X") {
    if (bytes.length < 30) return null;
    const w = (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16)) + 1;
    const h = (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16)) + 1;
    return w > 0 && h > 0 ? { width: w, height: h } : null;
  }
  if (chunk === "VP8L") {
    if (bytes[20] !== 0x2f || bytes.length < 25) return null;
    const bits = bytes[21] | (bytes[22] << 8) | (bytes[23] << 16) | (bytes[24] << 24);
    const width = (bits & 0x3fff) + 1;
    const height = ((bits >> 14) & 0x3fff) + 1;
    return width > 0 && height > 0 ? { width, height } : null;
  }
  if (chunk === "VP8 ") {
    if (bytes.length < 27 || bytes[20] !== 0x9d) return null;
    const width = (bytes[23] | (bytes[24] << 8)) & 0x3fff;
    const height = (bytes[25] | (bytes[26] << 8)) & 0x3fff;
    return width > 0 && height > 0 ? { width, height } : null;
  }
  return null;
}

function readDimensions(buffer) {
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 8) return null;
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return parsePng(bytes);
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return parseJpeg(bytes);
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
    return parseWebp(bytes);
  }
  return null;
}

function titleFromPath(path) {
  return path
    .split("/")
    .pop()
    .replace(/\.[^.]+$/, "")
    .replace(/^\d+-/, "")
    .replace(/[-_]+/g, " ")
    .trim();
}

async function listAllObjects(client, bucket) {
  const all = [];
  const seen = new Set();

  async function walk(prefix) {
    let offset = 0;
    for (;;) {
      const { data, error } = await client.storage
        .from(bucket)
        .list(prefix, { limit: 100, offset });
      if (error) throw error;
      const entries = data ?? [];
      for (const entry of entries) {
        const fullPath = `${prefix}${entry.name}`;
        if (entry.id) {
          if (!seen.has(entry.id)) {
            seen.add(entry.id);
            // list() returns names relative to the prefix; reconstruct the
            // full storage path so catalog rows reference the real object.
            all.push({ ...entry, name: fullPath });
          }
        } else {
          // Folder entry: recurse into it so nested prefixes are covered.
          await walk(`${fullPath}/`);
        }
      }
      if (entries.length < 100) break;
      offset += entries.length;
    }
  }

  await walk("");
  return all;
}

async function backfillBucket(bucket) {
  const objects = await listAllObjects(client, bucket);
  let created = 0;
  let skipped = 0;

  for (const object of objects) {
    const path = object.name;
    // Skip objects already cataloged.
    const { data: existing } = await client
      .from("media_assets")
      .select("path")
      .eq("bucket", bucket)
      .eq("path", path)
      .maybeSingle();
    if (existing) { skipped += 1; continue; }

    const { data: blob } = await client.storage.from(bucket).download(path);
    const dims = blob ? readDimensions(await blob.arrayBuffer()) : null;

    const { error } = await client.from("media_assets").upsert(
      {
        bucket,
        path,
        title: titleFromPath(path),
        alt_en: "",
        alt_vi: "",
        width: dims?.width ?? null,
        height: dims?.height ?? null,
        size_bytes: object.metadata?.size ?? null,
        mime: object.metadata?.mimetype ?? null,
      },
      { onConflict: "bucket,path" },
    );
    if (error) throw error;
    created += 1;
  }
  return { created, skipped };
}

const totals = { created: 0, skipped: 0 };
for (const bucket of BUCKETS) {
  const result = await backfillBucket(bucket);
  totals.created += result.created;
  totals.skipped += result.skipped;
  console.log(`${bucket}: created=${result.created} skipped=${result.skipped}`);
}
console.log(`TOTAL created=${totals.created} skipped=${totals.skipped}`);

// Export internals for regression tests (nested-prefix enumeration).
export { listAllObjects, readDimensions };