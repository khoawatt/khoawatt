import type { MetadataRoute } from "next";

import {
  getCategoryIndex,
  getPublishedPostIndex,
  getTagIndex,
} from "@/features/blog/repository";
import { locales } from "@/features/i18n/config";
import { getLocalizedPathname } from "@/features/i18n/routing";
import { getAbsoluteUrl } from "@/features/seo/config";

function languagesFor(pathname: string): Record<string, string> {
  const languages: Record<string, string> = {};

  for (const locale of locales) {
    languages[locale] = getAbsoluteUrl(getLocalizedPathname(pathname, locale));
  }

  languages["x-default"] = getAbsoluteUrl(getLocalizedPathname(pathname, "en"));

  return languages;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, categories, tags] = await Promise.all([
    getPublishedPostIndex(),
    getCategoryIndex(),
    getTagIndex(),
  ]);

  const homeLanguages = languagesFor("/");
  const blogLanguages = languagesFor("/blog");

  return [
    {
      url: getAbsoluteUrl(getLocalizedPathname("/", "en")),
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
      alternates: { languages: homeLanguages },
    },
    ...locales
      .filter((locale) => locale !== "en")
      .map((locale) => ({
        url: getAbsoluteUrl(getLocalizedPathname("/", locale)),
        lastModified: new Date(),
        changeFrequency: "monthly" as const,
        priority: 1,
        alternates: { languages: homeLanguages },
      })),
    ...locales.map((locale) => ({
      url: getAbsoluteUrl(getLocalizedPathname("/blog", locale)),
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
      alternates: { languages: blogLanguages },
    })),
    ...posts.flatMap((post) =>
      locales.map((locale) => ({
        url: getAbsoluteUrl(getLocalizedPathname(`/blog/${post.slug}`, locale)),
        lastModified: new Date(post.updatedAt || post.publishedAt),
        changeFrequency: "monthly" as const,
        priority: 0.7,
        alternates: { languages: languagesFor(`/blog/${post.slug}`) },
      })),
    ),
    ...categories.flatMap((category) =>
      locales.map((locale) => ({
        url: getAbsoluteUrl(
          getLocalizedPathname(`/blog/category/${category.slug}`, locale),
        ),
        lastModified: new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.6,
        alternates: { languages: languagesFor(`/blog/category/${category.slug}`) },
      })),
    ),
    ...tags.flatMap((tag) =>
      locales.map((locale) => ({
        url: getAbsoluteUrl(getLocalizedPathname(`/blog/tag/${tag.slug}`, locale)),
        lastModified: new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.5,
        alternates: { languages: languagesFor(`/blog/tag/${tag.slug}`) },
      })),
    ),
  ];
}