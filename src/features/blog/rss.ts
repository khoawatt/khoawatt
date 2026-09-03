/**
 * Feed generation (RSS 2.0, Atom 1.0, JSONFeed 1.1) — blog design spec §7.
 *
 * - `/feed.xml` (en) and `/vi/feed.xml` (vi) → RSS 2.0, latest 20 posts.
 * - `/feeds.atom` and `/feeds.json` → Atom / JSONFeed, paginated, mixed locales
 *   (mirrors the reference site quan.hoabinh.vn/feeds.*).
 * All reads go through the `blog`-tagged repository accessor so
 * `updateTag("blog")` refreshes them together with every other blog read.
 */
import type { Locale } from "@/features/i18n/config";
import { getLocalizedPathname } from "@/features/i18n/routing";
import { getAbsoluteUrl, getSiteUrl } from "@/features/seo/config";
import type { RssPostRow } from "./repository";

const FEED_AUTHOR_NAME = "Khoa Watt";
const FEED_AUTHOR_EMAIL = "contact@khoawatt.com";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function escapeHtmlForAtom(value: string): string {
  return escapeXml(value);
}

export function buildRssFeed(
  locale: Locale,
  posts: RssPostRow[],
  feedTitle: string,
  feedDescription: string,
): string {
  const blogUrl = getAbsoluteUrl(getLocalizedPathname("/blog", locale));
  const feedUrl = getAbsoluteUrl(getLocalizedPathname("/feed.xml", locale));

  const items = posts
    .map((post) => {
      const postUrl = getAbsoluteUrl(
        getLocalizedPathname(`/blog/${post.slug}`, locale),
      );
      const pubDate = new Date(post.publishedAt).toUTCString();
      const categories = [
        `<category>${escapeXml(post.category.name)}</category>`,
        ...post.tags.map((t) => `<category>${escapeXml(t.name)}</category>`),
      ].join("\n");

      return [
        "    <item>",
        `      <title>${escapeXml(post.title)}</title>`,
        `      <link>${postUrl}</link>`,
        `      <guid isPermaLink="true">${postUrl}</guid>`,
        `      <pubDate>${pubDate}</pubDate>`,
        `      <description>${escapeXml(post.summary)}</description>`,
        `      <author>${escapeXml(FEED_AUTHOR_EMAIL)} (${escapeXml(FEED_AUTHOR_NAME)})</author>`,
        categories ? `      ${categories.replaceAll("\n", "\n      ")}` : null,
        "    </item>",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "  <channel>",
    `    <title>${escapeXml(feedTitle)}</title>`,
    `    <link>${blogUrl}</link>`,
    `    <description>${escapeXml(feedDescription)}</description>`,
    "    <language>" + (locale === "vi" ? "vi-vn" : "en-us") + "</language>",
    `    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml"/>`,
    items ? items : "",
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");
}

export interface AtomFeedOptions {
  page: number;
  totalPages: number;
  totalItems: number;
}

export function buildAtomFeed(
  posts: RssPostRow[],
  feedTitle: string,
  opts: AtomFeedOptions,
): string {
  const siteUrl = getSiteUrl();
  const feedUrl = `${siteUrl}/feeds.atom`;
  const updated = posts[0]?.updatedAt
    ? new Date(posts[0].updatedAt).toISOString()
    : new Date().toISOString();
  const feedId = `${siteUrl}/feeds.atom`;

  const paginationLinks = [
    `  <link href="${feedUrl}" rel="self"/>`,
    `  <link href="${feedUrl}?page=1" rel="first"/>`,
    `  <link href="${feedUrl}?page=${opts.totalPages}" rel="last"/>`,
    opts.page < opts.totalPages ? `  <link href="${feedUrl}?page=${opts.page + 1}" rel="next"/>` : null,
    opts.page > 1 ? `  <link href="${feedUrl}?page=${opts.page - 1}" rel="prev"/>` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const entries = posts
    .map((post) => {
      // Detect locale for this post by checking which translation exists; fallback to en.
      // RssPostRow comes from a specific locale query, but Atom feed mixes locales,
      // so we store the post's locale-agnostic URL as /blog/slug and let content negotiation handle it.
      // For hreflang correctness we still emit the locale in <link> via xhtml? Atom uses category for language.
      const postUrl = `${siteUrl}/blog/${post.slug}`;
      const published = new Date(post.publishedAt).toISOString();
      const updatedAt = new Date(post.updatedAt).toISOString();
      const categories = [
        `<category term="${escapeXml(post.category.slug)}" label="${escapeXml(post.category.name)}"/>`,
        ...post.tags.map(
          (t) => `<category term="${escapeXml(t.slug)}" label="${escapeXml(t.name)}"/>`,
        ),
      ].join("\n      ");

      return [
        "  <entry>",
        `    <title type="html">${escapeXml(post.title)}</title>`,
        `    <id>${postUrl}</id>`,
        `    <updated>${updatedAt}</updated>`,
        `    <published>${published}</published>`,
        `    <author><name>${escapeXml(FEED_AUTHOR_NAME)}</name><email>${escapeXml(FEED_AUTHOR_EMAIL)}</email></author>`,
        categories ? `    ${categories}` : null,
        `    <link href="${postUrl}" rel="alternate" type="text/html"/>`,
        `    <summary type="html">${escapeHtmlForAtom(post.summary)}</summary>`,
        "  </entry>",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<feed xmlns="http://www.w3.org/2005/Atom">',
    `  <title>${escapeXml(feedTitle)}</title>`,
    `  <id>${feedId}</id>`,
    `  <updated>${updated}</updated>`,
    paginationLinks,
    entries,
    "</feed>",
    "",
  ]
    .filter(Boolean)
    .join("\n");
}

export interface JsonFeedOptions {
  page: number;
  totalPages: number;
  totalItems: number;
}

export function buildJsonFeed(
  posts: RssPostRow[],
  feedTitle: string,
  feedDescription: string,
  opts: JsonFeedOptions,
): string {
  const siteUrl = getSiteUrl();
  const feedUrl = `${siteUrl}/feeds.json`;

  const items = posts.map((post) => {
    const postUrl = `${siteUrl}/blog/${post.slug}`;
    return {
      id: postUrl,
      url: postUrl,
      title: post.title,
      summary: post.summary,
      content_text: null as string | null,
      content_html: null as string | null,
      date_published: new Date(post.publishedAt).toISOString(),
      date_modified: new Date(post.updatedAt).toISOString(),
      author: { name: FEED_AUTHOR_NAME, url: null as string | null },
      tags: [post.category.name, ...post.tags.map((t) => t.name)],
      language: "en" as string,
    };
  });

  const feed: Record<string, unknown> = {
    version: "https://jsonfeed.org/version/1",
    title: feedTitle,
    home_page_url: siteUrl,
    feed_url: feedUrl,
    description: feedDescription,
    icon: null,
    favicon: null,
    author: null,
    items,
  };

  if (opts.page < opts.totalPages) {
    feed.next_url = `${feedUrl}?page=${opts.page + 1}`;
  }

  return JSON.stringify(feed, null, 2);
}