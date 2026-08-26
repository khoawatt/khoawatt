import assert from "node:assert/strict";
import { after, before, test } from "node:test";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Local-only guard, same pattern as repository.test.ts: this suite writes CMS
// data and MUST never touch a cloud project.
if (!url || !serviceRole) {
  console.error(
    "Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (local Supabase).",
  );
  process.exit(1);
}

const LOCAL_HOST = /^http:\/\/127\.0\.0\.1(?::\d+)?$/;
if (!LOCAL_HOST.test(url)) {
  console.error(`Refusing to run catalog tests against non-local Supabase: ${url}`);
  process.exit(1);
}

import { createClient } from "@supabase/supabase-js";
import {
  deleteMediaAsset,
  getCoverAltTexts,
  listMediaAssets,
  updateMediaAssetMeta,
  upsertMediaAsset,
} from "./media-catalog";

const client = createClient(url, serviceRole, {
  auth: { persistSession: false },
});

const BUCKET = "blog-media";
const FIXTURES = [
  { altEn: "", altVi: "", createdAt: "2026-01-01T00:00:00Z", path: "cat-a.png", title: "Alpha" },
  { altEn: "Bravo en", altVi: "", createdAt: "2026-01-02T00:00:00Z", path: "bravo.jpg", title: "Bravo photo" },
  { altEn: "", altVi: "Charlie vi", createdAt: "2026-01-03T00:00:00Z", path: "cat-b.webp", title: "Charlie" },
  { altEn: "", altVi: "", createdAt: "2026-01-04T00:00:00Z", path: "delta.png", title: "Delta diagram" },
];

async function seedFixtures() {
  const { error } = await client
    .from("media_assets")
    .upsert(
      FIXTURES.map((f) => ({
        alt_en: f.altEn,
        alt_vi: f.altVi,
        bucket: BUCKET,
        created_at: f.createdAt,
        height: 100,
        mime: "image/png",
        path: f.path,
        size_bytes: 1024,
        title: f.title,
        width: 200,
      })),
      { onConflict: "bucket,path" },
    );
  if (error) throw error;
}

async function cleanupFixtures() {
  await client.from("media_assets").delete().eq("bucket", BUCKET)
    .in("path", FIXTURES.map((f) => f.path));
}

before(seedFixtures);
after(cleanupFixtures);

test("page mode paginates newest-first with totals", async () => {
  const page1 = await listMediaAssets(client, {
    bucket: BUCKET,
    limit: 2,
    page: { mode: "page", page: 1 },
  });
  assert.deepEqual(page1.items.map((i) => i.path), ["delta.png", "cat-b.webp"]);
  assert.equal(page1.total, FIXTURES.length);
  assert.equal(page1.totalPages, 2);

  const page2 = await listMediaAssets(client, {
    bucket: BUCKET,
    limit: 2,
    page: { mode: "page", page: 2 },
  });
  assert.deepEqual(page2.items.map((i) => i.path), ["bravo.jpg", "cat-a.png"]);
});

test("cursor mode walks the whole library without gaps or duplicates", async () => {
  const seen = [];
  let cursor;
  for (let guard = 0; guard < 10; guard += 1) {
    const result = await listMediaAssets(client, {
      bucket: BUCKET,
      cursor,
      limit: 2,
    });
    seen.push(...result.items.map((i) => i.path));
    if (!result.nextCursor || result.items.length === 0) break;
    cursor = result.nextCursor;
  }
  assert.deepEqual(seen, ["delta.png", "cat-b.webp", "bravo.jpg", "cat-a.png"]);
});

test("search matches titles and paths case-insensitively", async () => {
  const byTitle = await listMediaAssets(client, { bucket: BUCKET, query: "bravo" });
  assert.deepEqual(byTitle.items.map((i) => i.path), ["bravo.jpg"]);

  const byPath = await listMediaAssets(client, { bucket: BUCKET, query: ".webp" });
  assert.deepEqual(byPath.items.map((i) => i.path), ["cat-b.webp"]);
});

test("search input cannot inject LIKE wildcards", async () => {
  const wildcarded = await listMediaAssets(client, { bucket: BUCKET, query: "%a%" });
  // Literal % matches nothing; without escaping this would match every row.
  assert.deepEqual(wildcarded.items.map((i) => i.path), []);
});

test("upsert derives a readable default title when none given", async () => {
  await upsertMediaAsset(client, {
    bucket: BUCKET,
    mime: "image/png",
    path: "1730000000000-my-neat-cover.png",
  });

  try {
    const found = await listMediaAssets(client, {
      bucket: BUCKET,
      limit: 10,
      query: "my-neat-cover",
    });
    assert.equal(found.items.length, 1);
    assert.equal(found.items[0]?.title, "my neat cover");
  } finally {
    await deleteMediaAsset(client, BUCKET, "1730000000000-my-neat-cover.png");
  }
});

test("metadata updates persist and map back to camelCase", async () => {
  const updated = await updateMediaAssetMeta(client, BUCKET, "bravo.jpg", {
    altEn: "Updated alt",
    altVi: "Alt tiếng Việt",
    title: "Renamed asset",
  });
  assert.ok(updated);
  assert.equal(updated?.altEn, "Updated alt");
  assert.equal(updated?.altVi, "Alt tiếng Việt");
  assert.equal(updated?.title, "Renamed asset");
});

test("cover alt lookup batches by path", async () => {
  const alts = await getCoverAltTexts(client, BUCKET, ["bravo.jpg", "missing.png"]);
  assert.equal(alts.get("bravo.jpg")?.altEn, "Updated alt");
  assert.equal(alts.has("missing.png"), false);
});
