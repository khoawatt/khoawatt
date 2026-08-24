/**
 * Blog SEO helpers (blog design spec §7).
 *
 * Per-route metadata (translated title/description, self-referencing canonical
 * per locale, hreflang pair en↔vi + x-default → en) plus the JSON-LD shapes:
 * `BlogPosting` + `BreadcrumbList` on detail, `Blog` + `ItemList` on listing
 * page 1, `BreadcrumbList` on category archives.
 */
import type { Metadata } from "next";

import { getPortfolioProfile } from "@/content/profile";
import type { Locale } from "@/features/i18n/config";
import type { BlogMessages } from "@/features/i18n/messages/types";
import { getLocalizedPathname } from "@/features/i18n/routing";
import { getAbsoluteUrl } from "@/features/seo/config";
import { getSeoMetadata } from "@/features/seo/metadata";

import type { BlogCategoryView, PostDetail, PostListItem } from "./types";

const ogLocaleBySiteLocale: Record<Locale, string> = {
  en: "en_US",
  vi: "vi_VN",
};

const personName = getPortfolioProfile("en").name;

export function getBlogListingMetadata(
  locale: Locale,
  messages: BlogMessages,
  metadataTitle: string,
  pathname = "/blog",
): Metadata {
  return getSeoMetadata({
    locale,
    title: `${messages.eyebrow} — ${metadataTitle}`,
    description: messages.intro,
    pathname,
    openGraph: {
      type: "website",
      locale: ogLocaleBySiteLocale[locale],
      url: getAbsoluteUrl(getLocalizedPathname(pathname, locale)),
      siteName: metadataTitle,
      title: messages.eyebrow,
      description: messages.intro,
    },
  });
}

export function getBlogCategoryMetadata(
  locale: Locale,
  category: BlogCategoryView,
  messages: BlogMessages,
  metadataTitle: string,
): Metadata {
  const description = `${messages.intro} ${category.name}.`;
  return getSeoMetadata({
    locale,
    title: `${category.name} — ${metadataTitle}`,
    description,
    pathname: `/blog/category/${category.slug}`,
  });
}

export function getBlogPostMetadata(
  locale: Locale,
  post: PostDetail,
  messages: BlogMessages,
  metadataTitle: string,
): Metadata {
  const pathname = `/blog/${post.slug}`;
  const datePublished = new Date(post.publishedAt).toISOString();
  const dateModified = post.updatedAt
    ? new Date(post.updatedAt).toISOString()
    : datePublished;
  const images = post.coverImage
    ? [
        {
          url: getAbsoluteUrl(post.coverImage.src),
          width: post.coverImage.width,
          height: post.coverImage.height,
          alt: post.coverImage.alt,
        },
      ]
    : undefined;

  return getSeoMetadata({
    locale,
    title: post.title,
    description: post.summary,
    pathname,
    openGraph: {
      type: "article",
      locale: ogLocaleBySiteLocale[locale],
      url: getAbsoluteUrl(getLocalizedPathname(pathname, locale)),
      siteName: metadataTitle,
      title: post.title,
      description: post.summary,
      images,
      publishedTime: datePublished,
      modifiedTime: dateModified,
      tags: post.tags.map((tag) => tag.name),
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.summary,
      images: post.coverImage ? [getAbsoluteUrl(post.coverImage.src)] : undefined,
    },
  });
}

function jsonLdString(graph: object): string {
  return JSON.stringify(graph);
}

export function blogPostingJsonLd(
  locale: Locale,
  post: PostDetail,
): string {
  const url = getAbsoluteUrl(getLocalizedPathname(`/blog/${post.slug}`, locale));
  const personUrl = getAbsoluteUrl(getLocalizedPathname("/", locale));

  return jsonLdString({
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.summary,
    datePublished: new Date(post.publishedAt).toISOString(),
    dateModified: post.updatedAt
      ? new Date(post.updatedAt).toISOString()
      : new Date(post.publishedAt).toISOString(),
    image: post.coverImage ? getAbsoluteUrl(post.coverImage.src) : undefined,
    inLanguage: locale,
    mainEntityOfPage: url,
    author: { "@type": "Person", name: personName, url: personUrl },
    publisher: { "@type": "Person", name: personName, url: personUrl },
    keywords: post.tags.map((tag) => tag.name).join(", "),
  });
}

export function postBreadcrumbJsonLd(
  locale: Locale,
  post: PostDetail,
  messages: BlogMessages,
): string {
  const homeUrl = getAbsoluteUrl(getLocalizedPathname("/", locale));
  const blogUrl = getAbsoluteUrl(getLocalizedPathname("/blog", locale));
  const postUrl = getAbsoluteUrl(getLocalizedPathname(`/blog/${post.slug}`, locale));

  return jsonLdString({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: messages.homeLabel, item: homeUrl },
      { "@type": "ListItem", position: 2, name: messages.eyebrow, item: blogUrl },
      { "@type": "ListItem", position: 3, name: post.title, item: postUrl },
    ],
  });
}

export function blogIndexJsonLd(
  locale: Locale,
  posts: PostListItem[],
  messages: BlogMessages,
): string {
  const url = getAbsoluteUrl(getLocalizedPathname("/blog", locale));
  const personUrl = getAbsoluteUrl(getLocalizedPathname("/", locale));

  return jsonLdString({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Blog",
        "@id": `${url}#blog`,
        url,
        name: messages.eyebrow,
        inLanguage: locale,
        publisher: { "@type": "Person", name: personName, url: personUrl },
      },
      {
        "@type": "ItemList",
        itemListElement: posts.map((post, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: getAbsoluteUrl(
            getLocalizedPathname(`/blog/${post.slug}`, locale),
          ),
          name: post.title,
        })),
      },
    ],
  });
}

export function categoryBreadcrumbJsonLd(
  locale: Locale,
  category: BlogCategoryView,
  messages: BlogMessages,
): string {
  const homeUrl = getAbsoluteUrl(getLocalizedPathname("/", locale));
  const blogUrl = getAbsoluteUrl(getLocalizedPathname("/blog", locale));
  const categoryUrl = getAbsoluteUrl(
    getLocalizedPathname(`/blog/category/${category.slug}`, locale),
  );

  return jsonLdString({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: messages.homeLabel, item: homeUrl },
      { "@type": "ListItem", position: 2, name: messages.eyebrow, item: blogUrl },
      { "@type": "ListItem", position: 3, name: category.name, item: categoryUrl },
    ],
  });
}