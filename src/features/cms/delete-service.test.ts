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
  console.error(`Refusing to run delete-service tests against non-local Supabase: ${url}`);
  process.exit(1);
}

import { createClient } from "@supabase/supabase-js";
import {
  analyzeDeleteCore,
  deleteEntitiesCore,
} from "./delete-service";

const client = createClient(url, serviceRole, {
  auth: { persistSession: false },
});

let OPERATOR_ID = "";

async function ensureOperator(): Promise<string> {
  if (OPERATOR_ID) return OPERATOR_ID;
  // The seeded local owner, or any auth user (audit FK needs a real user id).
  const { data: owner } = await client
    .from("admin_owner")
    .select("auth_uid")
    .maybeSingle();
  if (owner?.auth_uid) {
    OPERATOR_ID = owner.auth_uid;
    return OPERATOR_ID;
  }
  const { data: user } = await client.from("auth.users").select("id").limit(1).maybeSingle();
  if (user?.id) {
    OPERATOR_ID = user.id;
    return OPERATOR_ID;
  }
  throw new Error("No auth user available for the delete_audit FK.");
}

// Dedicated fixtures for the "blocked while referenced" test: an unused
// category and a category/tag that only the fixture post references. Using
// ambient rows (knowledge / seo / techniques) couples the test to whatever
// sample content happens to be seeded locally, so the assertion stays
// deterministic against a changing catalog.
const FREE_CATEGORY = "del-free-category";
const BUSY_CATEGORY = "del-busy-category";
const BUSY_TAG = "del-busy-tag";

async function insertBlockFixtures() {
  await client.from("blog_categories").upsert(
    [
      { id: FREE_CATEGORY, slug: FREE_CATEGORY, sort_order: 900 },
      { id: BUSY_CATEGORY, slug: BUSY_CATEGORY, sort_order: 901 },
    ],
    { onConflict: "id" },
  );
  await client.from("blog_category_translations").upsert(
    [
      { category_id: FREE_CATEGORY, locale: "en", name: "Free Category" },
      { category_id: FREE_CATEGORY, locale: "vi", name: "Free Category" },
      { category_id: BUSY_CATEGORY, locale: "en", name: "Busy Category" },
      { category_id: BUSY_CATEGORY, locale: "vi", name: "Busy Category" },
    ],
    { onConflict: "category_id,locale" },
  );
  await client.from("blog_tags").upsert(
    { id: BUSY_TAG, slug: BUSY_TAG },
    { onConflict: "id" },
  );
  await client.from("blog_tag_translations").upsert(
    [
      { tag_id: BUSY_TAG, locale: "en", name: "Busy Tag" },
      { tag_id: BUSY_TAG, locale: "vi", name: "Busy Tag" },
    ],
    { onConflict: "tag_id,locale" },
  );
}

async function insertPostFixture() {
  await client.from("blog_posts").upsert(
    {
      id: "del-alpha",
      slug: "del-alpha",
      category_id: BUSY_CATEGORY,
      cover_bucket_path: "del-alpha-cover.png",
      status: "published",
      published_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
    { onConflict: "id" },
  );
  await client.from("blog_post_translations").upsert(
    [
      { post_id: "del-alpha", locale: "en", title: "Del Alpha EN", summary: "s", content_md: "# a\n" },
      { post_id: "del-alpha", locale: "vi", title: "Del Alpha VI", summary: "s", content_md: "# a\n" },
    ],
    { onConflict: "post_id,locale" },
  );
  // The busy category/tag are referenced exactly by this single post.
  await client.from("blog_post_tags").upsert(
    { post_id: "del-alpha", tag_id: BUSY_TAG },
    { onConflict: "post_id,tag_id" },
  );
}

async function removePostFixture() {
  await client.from("blog_posts").delete().eq("id", "del-alpha");
}

async function removeBlockFixtures() {
  // Removing the post first breaks the reference, then the category/tag are free.
  await client.from("blog_posts").delete().eq("id", "del-alpha");
  await client.from("blog_categories").delete().in("id", [FREE_CATEGORY, BUSY_CATEGORY]);
  await client.from("blog_tags").delete().eq("id", BUSY_TAG);
}

async function clearAudit() {
  await client.from("delete_audit").delete().gte("created_at", "2026-01-01T00:00:00Z");
}

before(async () => {
  await ensureOperator();
  await clearAudit();
  await removePostFixture();
  await removeBlockFixtures();
  await insertBlockFixtures();
  await insertPostFixture();
});

after(async () => {
  await removeBlockFixtures();
  await removePostFixture();
});

test("analyze reports blog post dependent records + cover resource", async () => {
  const report = await analyzeDeleteCore(client, {
    entity: "blog-post",
    ids: ["del-alpha"],
  });
  assert.equal(report.items.length, 1);
  const item = report.items[0]!;
  assert.equal(item.id, "del-alpha");
  assert.equal(item.dependent, 3); // 2 translations + 1 tag link
  assert.equal(item.external, 1); // cover object
  assert.equal(item.blocked, null);
  assert.deepEqual(item.resources, ["del-alpha-cover.png"]);
  assert.equal(report.totalDependent, 3);
  assert.equal(report.blockedCount, 0);
});

test("analyze blocks categories and tags still referenced by posts", async () => {
  const busyCategory = await analyzeDeleteCore(client, {
    entity: "blog-category",
    ids: [BUSY_CATEGORY],
  });
  assert.match(busyCategory.items[0]?.blocked ?? "", /Referenced by 1 post\(s\)/);
  assert.equal(busyCategory.blockedCount, 1);

  const freeCategory = await analyzeDeleteCore(client, {
    entity: "blog-category",
    ids: [FREE_CATEGORY],
  });
  assert.equal(freeCategory.items[0]?.blocked, null);

  const tag = await analyzeDeleteCore(client, { entity: "blog-tag", ids: [BUSY_TAG] });
  assert.match(tag.items[0]?.blocked ?? "", /Referenced by 1 post\(s\)/);
});

test("analyze blocks media referenced as a blog cover, frees unreferenced files", async () => {
  const referenced = await analyzeDeleteCore(client, {
    entity: "media",
    ids: ["del-alpha-cover.png"],
  });
  assert.match(referenced.items[0]?.blocked ?? "", /Referenced by 1 location\(s\)/);
  assert.equal(referenced.blockedCount, 1);

  const free = await analyzeDeleteCore(client, {
    entity: "media",
    ids: ["unreferenced-file.png"],
  });
  assert.equal(free.items[0]?.blocked, null);
  assert.equal(free.blockedCount, 0);
});

test("blocked items never reach the DB and are reported as failures", async () => {
  // del-alpha still references the cover here, so the media delete is blocked.
  const result = await deleteEntitiesCore(client, OPERATOR_ID, {
    entity: "media",
    ids: ["del-alpha-cover.png"],
    bucket: "blog-media",
  });

  assert.equal(result.deleted, 0);
  assert.equal(result.failed.length, 1);
  assert.match(result.failed[0]!.reason, /Referenced by 1 location\(s\)/);

  const audit = await client
    .from("delete_audit")
    .select("result, entity_id")
    .eq("entity_type", "media")
    .eq("entity_id", "del-alpha-cover.png")
    .order("id", { ascending: false })
    .limit(1);
  assert.equal(audit.data?.[0]?.result, "failed");
});

test("deleteEntitiesCore hard-deletes a blog post, cascades children and audits", async () => {
  const result = await deleteEntitiesCore(client, OPERATOR_ID, {
    entity: "blog-post",
    ids: ["del-alpha"],
  });

  assert.deepEqual(result, { deleted: 1, failed: [] });

  // Rows are really gone (no soft delete anywhere).
  const post = await client
    .from("blog_posts")
    .select("id")
    .eq("id", "del-alpha")
    .maybeSingle();
  assert.equal(post.data, null);

  const tr = await client
    .from("blog_post_translations")
    .select("post_id")
    .eq("post_id", "del-alpha");
  assert.equal(tr.data?.length ?? 0, 0);

  const links = await client
    .from("blog_post_tags")
    .select("post_id")
    .eq("post_id", "del-alpha");
  assert.equal(links.data?.length ?? 0, 0);

  // Audit row carries impact + cleanup list.
  const audit = await client
    .from("delete_audit")
    .select("*")
    .eq("entity_type", "blog_post")
    .eq("entity_id", "del-alpha")
    .order("id", { ascending: false })
    .limit(1);
  const row = audit.data?.[0];
  assert.ok(row, "audit row exists");
  assert.equal(row.result, "success");
  assert.deepEqual(row.cleanup, ["del-alpha-cover.png"]);
  assert.equal(row.deleted_by, OPERATOR_ID);
  assert.equal(row.impact?.dependent, 3);
});
