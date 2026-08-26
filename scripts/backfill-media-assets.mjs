#!/usr/bin/env node
/**
 * Backfill the media_assets catalog (#102) from existing Storage objects.
 *
 * For every object in every media bucket: download the bytes, parse pixel
 * dimensions, and upsert a catalog row (title derived from the filename).
 * Idempotent — safe to re-run; existing rows keep their edited metadata.
 *
 * Usage (local-first, per AGENTS.md):
 *   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54331 \
 *   SUPABASE_SERVICE_ROLE_KEY=... \
 *   node scripts/backfill-media-assets.mjs [--apply]
 *
 * Without --apply it performs a dry run and writes nothing.
 * Refuses non-local hosts unless --force is also passed (cloud promotion is a
 * separate human-approved step in the local-first workflow).
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const apply = process.argv.includes("--apply");
const force = process.argv.includes("--force");

if (!url || !serviceRole) {
  console.error(
    "Missing env: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
  );
  process.exit(1);
}

const isLocal = /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(url);
if (!isLocal && !force) {
  console.error(
    `Refusing non-local host ${url} without --force (local-first workflow).`,
  );
  process.exit(1);
}

const { imageDimensions } = await import("../src/features/cms/image-dimensions.ts");

const client = createClient(url, serviceRole, {
  auth: { persistSession: false },
});

const BUCKETS = ["resume-media", "project-media", "blog-media", "portfolio"];

function titleFromPath(path) {
  return path
    .replace(/\.[^.]+$/, "")
    .replace(/^\d+-/, "")
    .replace(/[-_]+/g, " ")
    .trim();
}

async function listAllObjects(bucket) {
  const objects = [];
  const pageSize = 100;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await client.storage
      .from(bucket)
      .list("", { limit: pageSize, offset, sortBy: { column: "created_at", order: "asc" } });
    if (error) throw new Error(`${bucket}: list failed: ${error.message}`);
    // Storage list returns an implicit folder entry named "" — skip it.
    const real = (data ?? []).filter((o) => o.name && o.name !== "");
    objects.push(...real);
    if ((data ?? []).length < pageSize) break;
  }
  return objects;
}

async function backfillBucket(bucket) {
  const objects = await listAllObjects(bucket);
  console.log(`${bucket}: ${objects.length} object(s)`);

  let written = 0;
  for (const object of objects) {
    const path = object.name;
    const sizeBytes = object.metadata?.size ?? null;
    const mime = object.metadata?.mimetype ?? null;

    let width = null;
    let height = null;
    try {
      const { data: blob, error } = await client.storage.from(bucket).download(path);
      if (!error && blob) {
        const dims = imageDimensions(
          new Uint8Array(await blob.arrayBuffer()),
          mime ?? "",
        );
        width = dims?.width ?? null;
        height = dims?.height ?? null;
      }
    } catch (downloadError) {
      console.warn(`  ! ${path}: download failed (${downloadError.message})`);
    }

    const row = {
      bucket,
      path,
      title: titleFromPath(path),
      alt_en: "",
      alt_vi: "",
      width,
      height,
      size_bytes: sizeBytes,
      mime,
    };

    if (apply) {
      const { error } = await client
        .from("media_assets")
        .upsert(row, { onConflict: "bucket,path" });
      if (error) throw new Error(`${bucket}/${path}: ${error.message}`);
    }

    console.log(
      `  ${apply ? "upserted" : "would upsert"} ${path}` +
        ` (${width ?? "?"}x${height ?? "?"}, ${mime ?? "unknown"})`,
    );
    written += 1;
  }
  return written;
}

console.log(apply ? "Applying catalog backfill..." : "Dry run (pass --apply to write):");
let total = 0;
for (const bucket of BUCKETS) {
  total += await backfillBucket(bucket);
}
console.log(`Done. ${total} row(s) ${apply ? "written" : "scanned"}.`);
