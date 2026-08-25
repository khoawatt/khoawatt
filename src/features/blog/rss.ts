/**
 * RSS 2.0 feed generation (blog design spec §7).
 *
 * `/feed.xml` (en) and `/vi/feed.xml` (vi), latest 20 published posts. Feeds
 * read through the `blog`-tagged repository accessor, so `updateTag("blog")`
 * refreshes them together with every other blog read.
 */
import type { Locale } from "@/features/i18n/config";
import { getLocalizedPathname } from "@/features/i18n/routing";
import { getAbsoluteUrl } from "@/features/seo/config";
import type { RssPostRow } from "./repository";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
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

      return [
        "    <item>",
        `      <title>${escapeXml(post.title)}</title>`,
        `      <link>${postUrl}</link>`,
        `      <guid>${postUrl}</guid>`,
        `      <pubDate>${pubDate}</pubDate>`,
        `      <description>${escapeXml(post.summary)}</description>`,
        "    </item>",
      ].join("\n");
    })
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "  <channel>",
    `    <title>${escapeXml(feedTitle)}</title>`,
    `    <link>${blogUrl}</link>`,
    `    <description>${escapeXml(feedDescription)}</description>`,
    `    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml"/>`,
    items,
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");
}