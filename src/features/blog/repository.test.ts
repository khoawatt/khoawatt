import assert from "node:assert/strict";
import { after, before, test } from "node:test";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Hard local-only guard: this test mutates CMS data and MUST never run against a
// cloud/production project (same pattern as cms/repository.test.ts).
if (!url || !serviceRole) {
  console.error(
    "Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (local Supabase).",
  );
  process.exit(1);
}

const LOCAL_HOST = /^http:\/\/127\.0\.0\.1(?::\d+)?$/;
if (!LOCAL_HOST.test(url)) {
  console.error(
    `Refusing to run blog repository test against non-local Supabase: ${url}`,
  );
  process.exit(1);
}

import { createClient } from "@supabase/supabase-js";
import {
  queryCategoryPage,
  queryPostBySlug,
  queryPublishedPosts,
} from "./repository";

const client = createClient(url, serviceRole, {
  auth: { persistSession: false },
});

const EN_MD = [
  "# Alpha",
  "",
  "Intro paragraph.",
  "",
  "## Section one",
  "",
  "### Sub section",
  "",
  "```ts",
  "const x = 1",
  "```",
].join("\n");

const VI_MD = ["# Alpha VI", "", "Đoạn giới thiệu.", "", "## Phần một", ""].join("\n");

const POSTS = {
  alpha: "post-alpha",
  beta: "post-beta",
  gamma: "post-gamma",
  delta: "post-delta",
};

async function insertFixture() {
  await client.from("blog_posts").upsert(
    [
      {
        id: POSTS.alpha,
        slug: "post-alpha",
        category_id: "knowledge",
        cover_bucket_path: "covers/alpha.png",
        status: "published",
        published_at: "2026-01-03T00:00:00Z",
        updated_at: "2026-01-03T00:00:00Z",
      },
      {
        id: POSTS.beta,
        slug: "post-beta",
        category_id: "techniques",
        status: "draft",
        published_at: null,
        updated_at: "2026-01-02T00:00:00Z",
      },
      {
        id: POSTS.gamma,
        slug: "post-gamma",
        category_id: "knowledge",
        status: "published",
        published_at: "2026-01-02T00:00:00Z",
        updated_at: "2026-01-02T00:00:00Z",
      },
      {
        id: POSTS.delta,
        slug: "post-delta",
        category_id: "reviews",
        status: "published",
        published_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    ],
    { onConflict: "id" },
  );

  await client.from("blog_post_translations").upsert(
    [
      { post_id: POSTS.alpha, locale: "en", title: "Alpha EN", summary: "Alpha summary EN", content_md: EN_MD },
      { post_id: POSTS.alpha, locale: "vi", title: "Alpha VI", summary: "Alpha summary VI", content_md: VI_MD },
      { post_id: POSTS.beta, locale: "en", title: "Beta EN", summary: "Beta summary", content_md: "# Beta\n" },
      { post_id: POSTS.beta, locale: "vi", title: "Beta VI", summary: "Beta summary VI", content_md: "# Beta VI\n" },
      { post_id: POSTS.gamma, locale: "en", title: "Gamma EN", summary: "Gamma summary", content_md: "# Gamma\n" },
      { post_id: POSTS.gamma, locale: "vi", title: "Gamma VI", summary: "Gamma summary VI", content_md: "# Gamma VI\n" },
      { post_id: POSTS.delta, locale: "en", title: "Delta EN", summary: "Delta summary", content_md: "# Delta\n" },
      { post_id: POSTS.delta, locale: "vi", title: "Delta VI", summary: "Delta summary VI", content_md: "# Delta VI\n" },
    ],
    { onConflict: "post_id,locale" },
  );

  await client.from("blog_post_tags").upsert(
    [
      { post_id: POSTS.alpha, tag_id: "nextjs" },
      { post_id: POSTS.alpha, tag_id: "seo" },
      { post_id: POSTS.gamma, tag_id: "seo" },
      { post_id: POSTS.delta, tag_id: "ux" },
    ],
    { onConflict: "post_id,tag_id" },
  );
}

async function cleanupFixture() {
  for (const id of Object.values(POSTS)) {
    await client.from("blog_posts").delete().eq("id", id);
  }
  await client.from("blog_posts").delete().eq("id", "post-solo");
}

before(insertFixture);
after(cleanupFixture);

test("published listing maps rows to view models in the requested locale", async () => {
  const en = await queryPublishedPosts("en", 1);
  assert.deepEqual(
    en.posts.map((p) => p.slug),
    [POSTS.alpha, POSTS.gamma, POSTS.delta],
    "published-only, ordered by published_at desc",
  );
  assert.equal(en.posts[0]?.title, "Alpha EN");
  assert.equal(en.posts[0]?.category.name, "Knowledge");
  assert.ok(en.posts[0]?.coverImage, "cover maps to a ManagedImage");
  assert.equal(en.posts[0]?.coverImage?.width, 800);
  assert.ok(en.posts[0]?.coverImage?.src.includes("/blog-media/"));
  assert.ok(
    (en.posts[0]?.readingTimeMinutes ?? 0) > 0,
    "reading time is computed from content_md",
  );
  assert.equal(en.totalPages, 1);

  const vi = await queryPublishedPosts("vi", 1);
  assert.equal(vi.posts[0]?.title, "Alpha VI");
  assert.equal(vi.posts[0]?.category.name, "Kiến thức");

  const draftSlugs = en.posts.map((p) => p.slug);
  assert.ok(!draftSlugs.includes(POSTS.beta), "draft post is excluded");
});

test("out-of-range listing page resolves to an empty page", async () => {
  const page2 = await queryPublishedPosts("en", 2);
  assert.deepEqual(page2.posts, []);
  assert.equal(page2.totalPages, 1);
});

test("detail maps post, rendered html, toc, tags, and related posts", async () => {
  const post = await queryPostBySlug("en", "post-alpha");
  assert.ok(post, "published post resolves");
  assert.equal(post.title, "Alpha EN");
  assert.ok(post.html.includes('<h2 id="section-one">'), "markdown rendered");
  assert.ok(post.html.includes("hljs"), "code block highlighted");
  assert.ok(
    post.toc.some((e) => e.id === "section-one" && e.depth === 2),
    "toc includes h2",
  );
  assert.deepEqual(
    post.tags.map((t) => t.slug),
    ["nextjs", "seo"],
  );
  assert.deepEqual(
    post.relatedPosts.map((p) => p.slug),
    [POSTS.gamma, POSTS.delta],
    "related posts ranked by shared tags, then recency",
  );
});

test("unpublished or unknown slugs resolve to null (404-safe)", async () => {
  assert.equal(await queryPostBySlug("en", "post-beta"), null, "draft post is not public");
  assert.equal(await queryPostBySlug("en", "does-not-exist"), null);
});

test("a published post missing the requested locale translation is not renderable", async () => {
  await client.from("blog_posts").upsert(
    {
      id: "post-solo",
      slug: "post-solo",
      category_id: "knowledge",
      status: "published",
      published_at: "2026-01-04T00:00:00Z",
      updated_at: "2026-01-04T00:00:00Z",
    },
    { onConflict: "id" },
  );
  await client.from("blog_post_translations").upsert(
    {
      post_id: "post-solo",
      locale: "en",
      title: "Solo EN",
      summary: "Solo summary",
      content_md: "# Solo\n",
    },
    { onConflict: "post_id,locale" },
  );

  try {
    assert.equal(await queryPostBySlug("vi", "post-solo"), null, "missing vi translation -> null");
    assert.ok(await queryPostBySlug("en", "post-solo"), "en translation still renders");
  } finally {
    await client.from("blog_posts").delete().eq("id", "post-solo");
  }
});

test("a published post with no tags still gets recency-based related posts", async () => {
  await client.from("blog_posts").upsert(
    {
      id: "post-nolink",
      slug: "post-nolink",
      category_id: "reviews",
      status: "published",
      published_at: "2026-01-05T00:00:00Z",
      updated_at: "2026-01-05T00:00:00Z",
    },
    { onConflict: "id" },
  );
  await client.from("blog_post_translations").upsert(
    [
      { post_id: "post-nolink", locale: "en", title: "NoLink EN", summary: "NoLink summary", content_md: "# NoLink\n" },
      { post_id: "post-nolink", locale: "vi", title: "NoLink VI", summary: "NoLink summary VI", content_md: "# NoLink VI\n" },
    ],
    { onConflict: "post_id,locale" },
  );

  try {
    const post = await queryPostBySlug("en", "post-nolink");
    assert.ok(post, "tagless published post resolves");
    assert.deepEqual(
      post.relatedPosts.map((p) => p.slug),
      [POSTS.alpha, POSTS.gamma, POSTS.delta],
      "no-tag post falls back to the 3 most recent published posts",
    );
  } finally {
    await client.from("blog_posts").delete().eq("id", "post-nolink");
  }
});

test("category page returns header + only that category's published posts", async () => {
  const category = await queryCategoryPage("en", "knowledge", 1);
  assert.ok(category, "known category resolves");
  assert.equal(category.name, "Knowledge");
  assert.deepEqual(
    category.listing.posts.map((p) => p.slug),
    [POSTS.alpha, POSTS.gamma],
  );

  const vi = await queryCategoryPage("vi", "knowledge", 1);
  assert.equal(vi?.name, "Kiến thức");

  assert.equal(await queryCategoryPage("en", "does-not-exist", 1), null);
});