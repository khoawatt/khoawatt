/**
 * Blog repository adapter (blog design spec §4).
 *
 * Maps Supabase rows → blog view models behind typed accessors. Public reads
 * run through the narrow service-role client (anon has zero privileges); the
 * published-only filter is enforced here at the query boundary, fail-closed,
 * matching resume publicity.
 *
 * Caching — single choke point: every public read runs through an
 * `unstable_cache` wrapper tagged `blog`, so one `updateTag("blog")` from any
 * admin Server Action refreshes listing, detail, category, related, sitemap,
 * and feed reads together. The `revalidate` window is only a safety net for
 * missed invalidations; freshness is driven by `updateTag`. (`"use cache"` +
 * `cacheTag` would be the preferred primitive but requires the global
 * `cacheComponents` flag, which is too invasive for the existing app; the
 * tagged data-cache contract is identical.)
 *
 * The `query*` functions are the uncached core (exported for tests). They never
 * throw on DB failure: missing translation, unpublished post, or a read error
 * resolves to `null` / an empty listing so routes can map to `notFound()` /
 * empty state rather than a 500.
 */
import type { Locale } from "@/features/i18n/config";
import { unstable_cache } from "next/cache";

import { hasCmsConfig } from "@/features/cms/config";
import { getMediaPublicUrl } from "@/features/cms/media";
import { getCoverAltTexts } from "@/features/cms/media-catalog";
import { getServiceClient } from "@/features/cms/server";
import { renderMarkdown } from "./markdown";
import { readingTimeMinutes } from "./reading-time";
import type {
  BlogCategoryNavEntry,
  BlogCategoryView,
  BlogListingView,
  BlogTagView,
  PostDetail,
  PostListItem,
} from "./types";

export const BLOG_CACHE_TAG = "blog";

const PAGE_SIZE = 6;
const RELATED_POSTS_LIMIT = 3;
const COVER_FRAME = { width: 800, height: 450 };
/** Safety net only: refresh cached reads at most this often if `updateTag` is missed. */
const BLOG_SAFETY_NET_SECONDS = 60 * 60 * 24;

interface CategoryNameRow {
  locale: string;
  name: string;
}

interface CategoryRow {
  id: string;
  slug: string;
  blog_category_translations: CategoryNameRow[];
}

interface TagRow {
  slug: string;
  blog_tag_translations: CategoryNameRow[];
}

interface PostTranslationRow {
  locale: string;
  title: string;
  summary: string;
  content_md: string;
}

interface PostTagLinkRow {
  tag_id: string;
  blog_tags?: TagRow | null;
}

interface PostRow {
  id: string;
  slug: string;
  cover_bucket_path: string | null;
  status: string;
  published_at: string | null;
  updated_at: string;
  blog_categories: CategoryRow | null;
  blog_post_translations: PostTranslationRow[];
  blog_post_tags: PostTagLinkRow[] | null;
}

function localeRow<T extends { locale: string }>(
  rows: T[] | null | undefined,
  locale: Locale,
): T | undefined {
  return rows?.find((row) => row.locale === locale);
}

/** Map a row → listing item for the requested locale, or null when not renderable. */
function mapPostListItem(row: PostRow, locale: Locale): PostListItem | null {
  const translation = localeRow(row.blog_post_translations, locale);
  const category = row.blog_categories;
  const categoryName = localeRow(category?.blog_category_translations, locale);
  if (!translation || !category || !categoryName) return null;

  const coverImage = row.cover_bucket_path
    ? {
        src: getMediaPublicUrl("blog-media", row.cover_bucket_path),
        alt: translation.title,
        width: COVER_FRAME.width,
        height: COVER_FRAME.height,
      }
    : undefined;

  return {
    slug: row.slug,
    title: translation.title,
    summary: translation.summary,
    category: { slug: category.slug, name: categoryName.name },
    coverImage,
    publishedAt: row.published_at ?? row.updated_at,
    updatedAt: row.updated_at,
    readingTimeMinutes: readingTimeMinutes(translation.content_md),
  };
}

/**
 * Override cover alt text from the media_assets catalog (#102) when the owner
 * has written one for the requested locale; the post title stays the fallback.
 */
async function enrichCoverAlts<T extends { coverImage?: { alt: string } }>(
  items: T[],
  coverPaths: (string | undefined)[],
  locale: Locale,
): Promise<T[]> {
  const paths = [...new Set(coverPaths.filter((p): p is string => Boolean(p)))];
  if (paths.length === 0) return items;

  const client = getServiceClient();
  if (!client) return items;

  try {
    const alts = await getCoverAltTexts(client, "blog-media", paths);
    if (alts.size === 0) return items;

    let index = 0;
    return items.map((item) => {
      const path = coverPaths[index++];
      const lookup = path ? alts.get(path) : undefined;
      if (!lookup || !item.coverImage) return item;
      const catalogAlt = locale === "vi" ? lookup.altVi : lookup.altEn;
      if (!catalogAlt.trim()) return item;
      return { ...item, coverImage: { ...item.coverImage, alt: catalogAlt } };
    });
  } catch {
    return items;
  }
}

function postSelect() {  return [
    "id, slug, cover_bucket_path, status, published_at, updated_at",
    "blog_categories(id, slug, blog_category_translations(locale, name))",
    "blog_post_translations(locale, title, summary, content_md)",
  ].join(", ");
}

async function loadPublishedPosts(
  locale: Locale,
  page: number,
  categoryId?: string,
): Promise<BlogListingView> {
  const client = getServiceClient();
  if (!hasCmsConfig() || !client) return { posts: [], page, totalPages: 1 };

  try {
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = client
      .from("blog_posts")
      .select(postSelect(), { count: "exact" })
      .eq("status", "published")
      .is("deleted_at", null)
      .order("published_at", { ascending: false })
      .order("id")
      .range(from, to);
    if (categoryId) query = query.eq("category_id", categoryId);

    const { data, error, count } = await query;
    if (error || !data) return { posts: [], page, totalPages: 1 };

    const posts = await enrichCoverAlts(
      (data as unknown as PostRow[])
        .map((row) => mapPostListItem(row, locale))
        .filter((post): post is PostListItem => post !== null),
      (data as unknown as PostRow[]).map((row) => row.cover_bucket_path ?? undefined),
      locale,
    );

    return {
      posts,
      page,
      totalPages: Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE)),
    };
  } catch {
    return { posts: [], page, totalPages: 1 };
  }
}

async function queryRelatedPosts(
  locale: Locale,
  excludeId: string,
  tagIds: string[],
): Promise<PostListItem[]> {
  const client = getServiceClient();
  if (!hasCmsConfig() || !client) return [];

  try {
    const { data, error } = await client
      .from("blog_posts")
      .select(`${postSelect()}, blog_post_tags(tag_id)` as string)
      .eq("status", "published")
      .is("deleted_at", null)
      .neq("id", excludeId)
      .order("published_at", { ascending: false })
      .limit(50);
    if (error || !data) return [];

    const scored = (data as unknown as PostRow[])
      .map((row) => {
        const item = mapPostListItem(row, locale);
        if (!item) return null;
        const shared = (row.blog_post_tags ?? []).filter((link) =>
          tagIds.includes(link.tag_id),
        ).length;
        return { item, shared };
      })
      .filter((entry): entry is { item: PostListItem; shared: number } => entry !== null)
      .sort(
        (a, b) =>
          b.shared - a.shared ||
          String(b.item.publishedAt).localeCompare(String(a.item.publishedAt)),
      );

    // Posts with no tags score 0 for everyone and still fall back to recency,
    // so a tagless post never shows an empty related section.
    return scored.slice(0, RELATED_POSTS_LIMIT).map((entry) => entry.item);
  } catch {
    return [];
  }
}

/** Uncached core: publish-gated listing by locale + page (optionally a category). */
export async function queryPublishedPosts(
  locale: Locale,
  page: number,
): Promise<BlogListingView> {
  return loadPublishedPosts(locale, page);
}

/** Uncached core: article detail by slug (404-safe), including rendered HTML and related posts. */
export async function queryPostBySlug(
  locale: Locale,
  slug: string,
): Promise<PostDetail | null> {
  const client = getServiceClient();
  if (!hasCmsConfig() || !client) return null;

  try {
    const { data, error } = await client
      .from("blog_posts")
      .select(
        `${postSelect()}, blog_post_tags(tag_id, blog_tags(slug, blog_tag_translations(locale, name)))` as string,
      )
      .eq("slug", slug)
      .eq("status", "published")
      .is("deleted_at", null)
      .maybeSingle();
    if (error || !data) return null;

    const row = data as unknown as PostRow;
    const item = mapPostListItem(row, locale);
    const translation = localeRow(row.blog_post_translations, locale);
    if (!item || !translation) return null;

    const tags = (row.blog_post_tags ?? [])
      .map((link) => {
        const tagName = localeRow(link.blog_tags?.blog_tag_translations, locale);
        return link.blog_tags && tagName
          ? { slug: link.blog_tags.slug, name: tagName.name }
          : null;
      })
      .filter((tag): tag is { slug: string; name: string } => tag !== null);

    const { html, toc } = await renderMarkdown(translation.content_md);
    const tagIds = (row.blog_post_tags ?? []).map((link) => link.tag_id);
    const relatedPosts = await queryRelatedPosts(locale, row.id, tagIds);

    const [detail] = await enrichCoverAlts(
      [{ ...item, tags, html, toc, contentMd: translation.content_md, relatedPosts }],
      [row.cover_bucket_path ?? undefined],
      locale,
    );
    return detail;
  } catch {
    return null;
  }
}

/** Uncached core: category archive header + its published listing. */
export async function queryCategoryPage(
  locale: Locale,
  slug: string,
  page: number,
): Promise<BlogCategoryView | null> {
  const client = getServiceClient();
  if (!hasCmsConfig() || !client) return null;

  try {
    const { data, error } = await client
      .from("blog_categories")
      .select("id, slug, blog_category_translations(locale, name)")
      .eq("slug", slug)
      .is("deleted_at", null)
      .maybeSingle();
    if (error || !data) return null;

    const category = data as CategoryRow;
    const categoryName = localeRow(category.blog_category_translations, locale);
    if (!categoryName) return null;

    const listing = await loadPublishedPosts(locale, page, category.id);
    return { slug: category.slug, name: categoryName.name, listing };
  } catch {
    return null;
  }
}

interface TagRowWithTranslations {
  id: string;
  slug: string;
  blog_tag_translations: CategoryNameRow[];
}

async function loadPublishedPostsByTag(
  locale: Locale,
  page: number,
  tagId: string,
): Promise<BlogListingView> {
  const client = getServiceClient();
  if (!hasCmsConfig() || !client) return { posts: [], page, totalPages: 1 };

  try {
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error, count } = await client
      .from("blog_posts")
      .select(`${postSelect()}, blog_post_tags!inner(tag_id)`, { count: "exact" })
      .eq("status", "published")
      .is("deleted_at", null)
      .eq("blog_post_tags.tag_id", tagId)
      .order("published_at", { ascending: false })
      .order("id")
      .range(from, to);

    if (error || !data) return { posts: [], page, totalPages: 1 };

    const posts = await enrichCoverAlts(
      (data as unknown as PostRow[])
        .map((row) => mapPostListItem(row, locale))
        .filter((post): post is PostListItem => post !== null),
      (data as unknown as PostRow[]).map((row) => row.cover_bucket_path ?? undefined),
      locale,
    );

    return {
      posts,
      page,
      totalPages: Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE)),
    };
  } catch {
    return { posts: [], page, totalPages: 1 };
  }
}

/** Uncached core: tag archive header + its published listing. */
export async function queryTagPage(
  locale: Locale,
  slug: string,
  page: number,
): Promise<BlogTagView | null> {
  const client = getServiceClient();
  if (!hasCmsConfig() || !client) return null;

  try {
    const { data, error } = await client
      .from("blog_tags")
      .select("id, slug, blog_tag_translations(locale, name)")
      .eq("slug", slug)
      .is("deleted_at", null)
      .maybeSingle();
    if (error || !data) return null;

    const tag = data as TagRowWithTranslations;
    const tagName = localeRow(tag.blog_tag_translations, locale);
    if (!tagName) return null;

    const listing = await loadPublishedPostsByTag(locale, page, tag.id);
    // If tag has no published posts, treat as not found for SEO (avoid empty tag pages)
    if (listing.posts.length === 0 && listing.totalPages === 1) {
      // Check if there are any published posts at all for this tag
      const { count } = await client
        .from("blog_posts")
        .select("id, blog_post_tags!inner(tag_id)", { count: "exact", head: true })
        .eq("status", "published")
        .is("deleted_at", null)
        .eq("blog_post_tags.tag_id", tag.id);
      if (!count || count === 0) return null;
    }

    return { slug: tag.slug, name: tagName.name, listing };
  } catch {
    return null;
  }
}

/** Uncached core: all published post slugs + dates for sitemap/feed data. */
export async function queryPublishedPostIndex(): Promise<
  { slug: string; publishedAt: string; updatedAt: string }[]
> {
  const client = getServiceClient();
  if (!hasCmsConfig() || !client) return [];

  try {
    const { data, error } = await client
      .from("blog_posts")
      .select("slug, published_at, updated_at")
      .eq("status", "published")
      .is("deleted_at", null)
      .order("published_at", { ascending: false });
    if (error || !data) return [];

    return (data as unknown as { slug: string; published_at: string; updated_at: string }[]).map(
      (row) => ({
        slug: row.slug,
        publishedAt: row.published_at,
        updatedAt: row.updated_at,
      }),
    );
  } catch {
    return [];
  }
}

/** Uncached core: category slugs that currently have published posts, with lastModified derived from the newest post in each category. */
export async function queryCategoryIndex(): Promise<{ slug: string; updatedAt: string | null }[]> {
  const client = getServiceClient();
  if (!hasCmsConfig() || !client) return [];

  try {
    // Fetch categories and the latest published post's updated_at per category.
    // Supabase does not expose MAX() directly, so we fetch (category_id, updated_at)
    // for all published posts and reduce in JS — bounded by published post count
    // (blog is small; sitemap is cached 1d and tagged `blog`).
    const [catResult, postResult] = await Promise.all([
      client.from("blog_categories").select("id, slug").is("deleted_at", null),
      client
        .from("blog_posts")
        .select("category_id, updated_at")
        .eq("status", "published")
        .is("deleted_at", null),
    ]);

    if (catResult.error || !catResult.data) return [];
    if (postResult.error || !postResult.data) {
      // Fallback: return slugs without dates
      return (catResult.data as unknown as { slug: string }[]).map((r) => ({
        slug: r.slug,
        updatedAt: null,
      }));
    }

    const maxByCategory = new Map<string, string>();
    for (const row of postResult.data as unknown as { category_id: string; updated_at: string }[]) {
      const prev = maxByCategory.get(row.category_id);
      if (!prev || row.updated_at > prev) maxByCategory.set(row.category_id, row.updated_at);
    }

    return (catResult.data as unknown as { id: string; slug: string }[])
      .filter((row) => maxByCategory.has(row.id))
      .map((row) => ({ slug: row.slug, updatedAt: maxByCategory.get(row.id) ?? null }));
  } catch {
    return [];
  }
}

/** Uncached core: tag slugs that currently have published posts, with lastModified derived from the newest post carrying each tag. */
export async function queryTagIndex(): Promise<{ slug: string; updatedAt: string | null }[]> {
  const client = getServiceClient();
  if (!hasCmsConfig() || !client) return [];

  try {
    const [tagResult, postTagResult] = await Promise.all([
      client.from("blog_tags").select("id, slug").is("deleted_at", null),
      // Join through blog_post_tags → blog_posts to get updated_at per tag.
      // We fetch (tag_id, blog_posts.updated_at) and reduce to max per tag.
      client
        .from("blog_post_tags")
        .select("tag_id, blog_posts!inner(updated_at, status, deleted_at)")
        .eq("blog_posts.status", "published")
        .is("blog_posts.deleted_at", null),
    ]);

    if (tagResult.error || !tagResult.data) return [];
    if (postTagResult.error || !postTagResult.data) {
      return (tagResult.data as unknown as { slug: string }[]).map((r) => ({
        slug: r.slug,
        updatedAt: null,
      }));
    }

    const maxByTag = new Map<string, string>();
    for (const row of postTagResult.data as unknown as { tag_id: string; blog_posts: { updated_at: string } }[]) {
      const updatedAt = row.blog_posts.updated_at;
      const prev = maxByTag.get(row.tag_id);
      if (!prev || updatedAt > prev) maxByTag.set(row.tag_id, updatedAt);
    }

    return (tagResult.data as unknown as { id: string; slug: string }[])
      .filter((row) => maxByTag.has(row.id))
      .map((row) => ({ slug: row.slug, updatedAt: maxByTag.get(row.id) ?? null }));
  } catch {
    return [];
  }
}

interface CategoryNavRow extends CategoryRow {
  blog_posts?: unknown[] | null;
}

/** Uncached core: categories with ≥1 published post, localized name + count. */
export async function queryCategoryNav(
  locale: Locale,
): Promise<BlogCategoryNavEntry[]> {
  const client = getServiceClient();
  if (!hasCmsConfig() || !client) return [];

  try {
    const { data, error } = await client
      .from("blog_categories")
      .select(
        "slug, sort_order, blog_category_translations(locale, name), blog_posts(id)",
      )
      .is("deleted_at", null)
      .eq("blog_posts.status", "published")
      .order("sort_order")
      .order("slug");
    if (error || !data) return [];

    return (data as unknown as CategoryNavRow[])
      .map((row) => ({
        slug: row.slug,
        name: localeRow(row.blog_category_translations, locale)?.name ?? "",
        postCount: row.blog_posts?.length ?? 0,
      }))
      .filter((entry) => entry.name !== "" && entry.postCount > 0);
  } catch {
    return [];
  }
}

export interface RssPostRow {
  title: string;
  slug: string;
  summary: string;
  publishedAt: string;
  updatedAt: string;
  category: { slug: string; name: string };
  tags: { slug: string; name: string }[];
}

/** Uncached core: latest published posts for the RSS/Atom/JSON feed (spec §7). */
export async function queryRssPosts(
  locale: Locale,
  limit = 20,
  offset = 0,
): Promise<RssPostRow[]> {
  const client = getServiceClient();
  if (!hasCmsConfig() || !client) return [];

  try {
    const { data, error } = await client
      .from("blog_posts")
      .select(
        `${postSelect()}, blog_post_tags(tag_id, blog_tags(slug, blog_tag_translations(locale, name)))` as string,
      )
      .eq("status", "published")
      .is("deleted_at", null)
      .order("published_at", { ascending: false })
      .order("id")
      .range(offset, offset + limit - 1);
    if (error || !data) return [];

    return (data as unknown as (PostRow & { blog_post_tags: PostTagLinkRow[] })[])
      .map((row) => {
        const item = mapPostListItem(row as unknown as PostRow, locale);
        if (!item) return null;
        const tags = (row.blog_post_tags ?? [])
          .map((link) => {
            const tagName = localeRow(link.blog_tags?.blog_tag_translations, locale);
            return link.blog_tags && tagName
              ? { slug: link.blog_tags.slug, name: tagName.name }
              : null;
          })
          .filter((tag): tag is { slug: string; name: string } => tag !== null);

        return {
          title: item.title,
          slug: item.slug,
          summary: item.summary,
          publishedAt: item.publishedAt,
          updatedAt: item.updatedAt,
          category: item.category,
          tags,
        };
      })
      .filter((row): row is RssPostRow => row !== null);
  } catch {
    return [];
  }
}

/** Total count of published posts for feed pagination (used by Atom/JSON feeds). */
export async function queryRssPostCount(): Promise<number> {
  const client = getServiceClient();
  if (!hasCmsConfig() || !client) return 0;
  try {
    const { count, error } = await client
      .from("blog_posts")
      .select("id", { count: "exact", head: true })
      .eq("status", "published")
      .is("deleted_at", null);
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Cached public accessors. Every read is tagged `blog` at the single choke
 * point; `updateTag("blog")` from an admin Server Action invalidates them all
 * together. The `revalidate` window is only a safety net for missed
 * invalidations.
 */

export const getPublishedPosts = unstable_cache(
  (locale: Locale, page: number) => queryPublishedPosts(locale, page),
  ["blog", "published-posts"],
  { tags: [BLOG_CACHE_TAG], revalidate: BLOG_SAFETY_NET_SECONDS },
);

export const getPostBySlug = unstable_cache(
  (locale: Locale, slug: string) => queryPostBySlug(locale, slug),
  ["blog", "post-by-slug"],
  { tags: [BLOG_CACHE_TAG], revalidate: BLOG_SAFETY_NET_SECONDS },
);

export const getCategoryPage = unstable_cache(
  (locale: Locale, slug: string, page: number) =>
    queryCategoryPage(locale, slug, page),
  ["blog", "category-page"],
  { tags: [BLOG_CACHE_TAG], revalidate: BLOG_SAFETY_NET_SECONDS },
);

export const getTagPage = unstable_cache(
  (locale: Locale, slug: string, page: number) => queryTagPage(locale, slug, page),
  ["blog", "tag-page"],
  { tags: [BLOG_CACHE_TAG], revalidate: BLOG_SAFETY_NET_SECONDS },
);

export const getPublishedPostIndex = unstable_cache(
  () => queryPublishedPostIndex(),
  ["blog", "published-post-index"],
  { tags: [BLOG_CACHE_TAG], revalidate: BLOG_SAFETY_NET_SECONDS },
);

export const getCategoryIndex = unstable_cache(
  () => queryCategoryIndex(),
  ["blog", "category-index"],
  { tags: [BLOG_CACHE_TAG], revalidate: BLOG_SAFETY_NET_SECONDS },
);

export const getTagIndex = unstable_cache(
  () => queryTagIndex(),
  ["blog", "tag-index"],
  { tags: [BLOG_CACHE_TAG], revalidate: BLOG_SAFETY_NET_SECONDS },
);

export const getCategoryNav = unstable_cache(
  (locale: Locale) => queryCategoryNav(locale),
  ["blog", "category-nav"],
  { tags: [BLOG_CACHE_TAG], revalidate: BLOG_SAFETY_NET_SECONDS },
);

export const getRssPosts = unstable_cache(
  (locale: Locale) => queryRssPosts(locale, 20, 0),
  ["blog", "rss-posts"],
  { tags: [BLOG_CACHE_TAG], revalidate: BLOG_SAFETY_NET_SECONDS },
);

export const getRssPostsPaginated = unstable_cache(
  (locale: Locale, limit: number, offset: number) => queryRssPosts(locale, limit, offset),
  ["blog", "rss-posts-paginated"],
  { tags: [BLOG_CACHE_TAG], revalidate: BLOG_SAFETY_NET_SECONDS },
);

export const getRssPostCount = unstable_cache(
  () => queryRssPostCount(),
  ["blog", "rss-post-count"],
  { tags: [BLOG_CACHE_TAG], revalidate: BLOG_SAFETY_NET_SECONDS },
);