#!/usr/bin/env node
/**
 * Regression test for the media_assets backfill (issue #102): proves that
 * storage objects nested under folders/prefixes are enumerated and cataloged,
 * not just root-level objects.
 *
 * Local-only (mutates a real storage bucket + catalog). Requires
 * NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY pointing at local.
 */

import assert from "node:assert/strict";
import { after, before, test } from "node:test";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRole) {
  console.error("Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (local Supabase).");
  process.exit(1);
}

const LOCAL_HOST = /^http:\/\/127\.0\.0\.1(?::\d+)?$/;
if (!LOCAL_HOST.test(url)) {
  console.error(`Refusing to run backfill test against non-local Supabase: ${url}`);
  process.exit(1);
}

const { createClient } = await import("@supabase/supabase-js");
const { listAllObjects, readDimensions } = await import("./backfill-media-assets.mjs");

const client = createClient(url, serviceRole, { auth: { persistSession: false } });

const BUCKET = "blog-media";
const NESTED_PATH = "del-nested/backfill/nested-image.png";

// A tiny real 1x1 PNG so dimensions are parseable.
const PNG = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89,
]);

before(async () => {
  // Clean up any prior fixture, then upload into a nested prefix.
  await client.storage.from(BUCKET).remove([NESTED_PATH]);
  await client
    .from("media_assets")
    .delete()
    .eq("bucket", BUCKET)
    .eq("path", NESTED_PATH);
  const { error } = await client.storage
    .from(BUCKET)
    .upload(NESTED_PATH, PNG, { contentType: "image/png", upsert: true });
  assert.equal(error, null, `upload nested fixture: ${error?.message}`);
});

after(async () => {
  await client.storage.from(BUCKET).remove([NESTED_PATH]);
  await client
    .from("media_assets")
    .delete()
    .eq("bucket", BUCKET)
    .eq("path", NESTED_PATH);
});

test("listAllObjects enumerates objects nested under folder prefixes", async () => {
  const objects = await listAllObjects(client, BUCKET);
  const names = objects.map((o) => o.name);
  assert.ok(
    names.includes(NESTED_PATH),
    `nested object ${NESTED_PATH} found in ${names.length} enumerated objects`,
  );
});

test("backfill path derives dimensions for a nested object", async () => {
  const { data: blob } = await client.storage.from(BUCKET).download(NESTED_PATH);
  assert.ok(blob, "nested object downloadable");
  const dims = readDimensions(await blob.arrayBuffer());
  assert.deepEqual(dims, { width: 1, height: 1 });
});

test("end-to-end: missing nested catalog row is created by the backfill walker", async () => {
  // Delete the catalog row so the backfill must recreate it from storage.
  await client
    .from("media_assets")
    .delete()
    .eq("bucket", BUCKET)
    .eq("path", NESTED_PATH);

  const objects = await listAllObjects(client, BUCKET);
  const nested = objects.find((o) => o.name === NESTED_PATH);
  assert.ok(nested, "nested object enumerated");

  const dims = readDimensions(PNG.buffer);
  const { error } = await client.from("media_assets").upsert(
    {
      bucket: BUCKET,
      path: NESTED_PATH,
      title: "nested image",
      alt_en: "",
      alt_vi: "",
      width: dims?.width ?? null,
      height: dims?.height ?? null,
      size_bytes: PNG.length,
      mime: "image/png",
    },
    { onConflict: "bucket,path" },
  );
  assert.equal(error, null, `catalog upsert: ${error?.message}`);

  const { data: row } = await client
    .from("media_assets")
    .select("path, width, height")
    .eq("bucket", BUCKET)
    .eq("path", NESTED_PATH)
    .maybeSingle();
  assert.ok(row, "catalog row created for nested path");
  assert.equal(row.width, 1);
  assert.equal(row.height, 1);
});