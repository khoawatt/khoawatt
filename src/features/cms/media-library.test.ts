import assert from "node:assert/strict";
import { after, before, test } from "node:test";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Local-only guard, same pattern as repository.test.ts.
if (!url || !serviceRole) {
  console.error(
    "Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (local Supabase).",
  );
  process.exit(1);
}

const LOCAL_HOST = /^http:\/\/127\.0\.0\.1(?::\d+)?$/;
if (!LOCAL_HOST.test(url)) {
  console.error(`Refusing to run media-library tests against non-local Supabase: ${url}`);
  process.exit(1);
}

import { createClient } from "@supabase/supabase-js";
import { listMediaAssetsCore } from "./media-library";
import { readImageDimensions } from "./image-dimensions";

const client = createClient(url, serviceRole, {
  auth: { persistSession: false },
});

const BUCKET = "blog-media";
const PREFIX = "del-media-test-";

// Tiny valid PNG (1x1) so catalog width/height are populated like a real upload.
const PNG_1x1 = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89,
]);

async function insertFixture(path: string, title: string, index: number) {
  const dimensions = readImageDimensions(PNG_1x1.buffer);
  await client.from("media_assets").upsert(
    {
      bucket: BUCKET,
      path,
      title,
      alt_en: `Alt EN ${title}`,
      alt_vi: `Alt VI ${title}`,
      width: dimensions?.width ?? null,
      height: dimensions?.height ?? null,
      size_bytes: PNG_1x1.length,
      mime: "image/png",
      // Future timestamp so fixtures sort above any ambient local content.
      created_at: `2026-09-01T00:00:${String(index).padStart(2, "0")}Z`,
    },
    { onConflict: "bucket,path" },
  );
}

async function removeFixtures() {
  await client
    .from("media_assets")
    .delete()
    .eq("bucket", BUCKET)
    .like("path", `${PREFIX}%`);
}

let BASELINE_TOTAL = 0;

before(async () => {
  await removeFixtures();
  // Capture the ambient blog-media catalog size so expectations stay correct
  // even when real content is seeded locally. Fixtures use future timestamps
  // (2026-09-01) so they sort above any real local rows.
  const { count } = await client
    .from("media_assets")
    .select("path", { count: "exact", head: true })
    .eq("bucket", BUCKET);
  BASELINE_TOTAL = count ?? 0;

  // Six fixtures with distinct created_at + a searchable title.
  for (let i = 0; i < 6; i++) {
    await insertFixture(`${PREFIX}${i}.png`, `Fixture ${i}${i % 2 === 0 ? " Cover" : " Note"}`, i);
  }
});

after(async () => {
  await removeFixtures();
});

test("page mode returns the requested page with a total count", async () => {
  const page1 = await listMediaAssetsCore(client, {
    mode: "page",
    bucket: BUCKET,
    page: 1,
    pageSize: 4,
  });
  // Fixtures (2026-09-01) sort above any real local rows, so page 1 holds the
  // four newest fixtures.
  assert.equal(page1.items.length, 4);
  assert.equal(page1.total, BASELINE_TOTAL + 6);
  assert.equal(page1.items[0]?.path, `${PREFIX}5.png`);

  // Page 2 holds the two remaining fixtures plus the ambient rows after them,
  // so its exact length depends on local content — assert the fixture slice.
  const page2 = await listMediaAssetsCore(client, {
    mode: "page",
    bucket: BUCKET,
    page: 2,
    pageSize: 4,
  });
  const fixturePaths = page2.items
    .filter((item) => item.path.startsWith(PREFIX))
    .map((item) => item.path)
    .sort();
  assert.deepEqual(fixturePaths, [`${PREFIX}0.png`, `${PREFIX}1.png`]);
});

test("page mode orders newest-first (created_at desc)", async () => {
  const { items } = await listMediaAssetsCore(client, {
    mode: "page",
    bucket: BUCKET,
    page: 1,
    pageSize: 6,
  });
  const createdAt = items.map((item) => item.createdAt);
  const sorted = [...createdAt].sort((a, b) => b.localeCompare(a));
  assert.deepEqual(createdAt, sorted);
});

test("search filters by title substring, case-insensitive", async () => {
  const { items, total } = await listMediaAssetsCore(client, {
    mode: "page",
    bucket: BUCKET,
    search: "cover",
    page: 1,
    pageSize: 10,
  });
  assert.equal(total, 3);
  assert.ok(items.every((item) => item.title.toLowerCase().includes("cover")));
});

test("cursor mode pages through the full set with no gaps or duplicates", async () => {
  // Scoped by a search term that only my fixtures match, so the assertion is
  // deterministic against ambient local content.
  const seen = new Set<string>();
  let cursor: string | undefined;
  let guard = 0;

  do {
    const { items, nextCursor } = await listMediaAssetsCore(client, {
      mode: "cursor",
      bucket: BUCKET,
      search: "del-media-test",
      pageSize: 2,
      cursor,
    });
    for (const item of items) {
      assert.ok(!seen.has(item.path), `duplicate path ${item.path}`);
      seen.add(item.path);
    }
    cursor = nextCursor ?? undefined;
    guard++;
    assert.ok(guard < 10, "cursor pagination did not terminate");
  } while (cursor);

  assert.equal(seen.size, 6);
  assert.deepEqual(
    [...seen].sort(),
    Array.from({ length: 6 }, (_, i) => `${PREFIX}${i}.png`),
  );
});

test("cursor mode respects search too", async () => {
  const seen = new Set<string>();
  let cursor: string | undefined;
  let guard = 0;

  do {
    const { items, nextCursor } = await listMediaAssetsCore(client, {
      mode: "cursor",
      bucket: BUCKET,
      search: "note",
      pageSize: 2,
      cursor,
    });
    for (const item of items) seen.add(item.path);
    cursor = nextCursor ?? undefined;
    guard++;
    assert.ok(guard < 10);
  } while (cursor);

  assert.equal(seen.size, 3);
});

test("cursor with no more rows returns null nextCursor", async () => {
  const { items, nextCursor } = await listMediaAssetsCore(client, {
    mode: "cursor",
    bucket: BUCKET,
    search: "del-media-test",
    pageSize: 100,
  });
  assert.equal(items.length, 6);
  assert.equal(nextCursor, null);
});