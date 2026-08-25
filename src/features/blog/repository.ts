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
import { getServiceClient } from "@/features/cms/server";
import { renderMarkdown } from "./markdown";
import { readingTimeMinutes } from "./reading-time";
import type {
  BlogCategoryView,
  BlogListingView,
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

function postSelect() {
  return [
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
      .order("published_at", { ascending: false })
      .order("id")
      .range(from, to);
    if (categoryId) query = query.eq("category_id", categoryId);

    const { data, error, count } = await query;
    if (error || !data) return { posts: [], page, totalPages: 1 };

    const posts = (data as unknown as PostRow[])
      .map((row) => mapPostListItem(row, locale))
      .filter((post): post is PostListItem => post !== null);

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

    return { ...item, tags, html, toc, relatedPosts };
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

/** Uncached core: category slugs that currently have published posts. */
export async function queryCategoryIndex(): Promise<{ slug: string }[]> {
  const client = getServiceClient();
  if (!hasCmsConfig() || !client) return [];

  try {
    const { data, error } = await client
      .from("blog_categories")
      .select("slug, blog_posts(id)")
      .eq("blog_posts.status", "published");
    if (error || !data) return [];

    return (data as unknown as { slug: string; blog_posts: unknown[] }[])
      .filter((row) => row.blog_posts.length > 0)
      .map((row) => ({ slug: row.slug }));
  } catch {
    return [];
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