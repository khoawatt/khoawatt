import type { Metadata } from "next";

import { getPortfolioProfile } from "@/content/profile";
import { locales, type Locale } from "@/features/i18n/config";
import { getLocalizedPathname } from "@/features/i18n/routing";

import { getAbsoluteUrl, getSiteUrl } from "./config";

const ogLocaleBySiteLocale: Record<Locale, string> = {
  en: "en_US",
  vi: "vi_VN",
};

function getAlternateLanguages(pathname: string): Record<string, string> {
  const languages: Record<string, string> = {};

  for (const locale of locales) {
    languages[locale] = getAbsoluteUrl(getLocalizedPathname(pathname, locale));
  }

  languages["x-default"] = getAbsoluteUrl(getLocalizedPathname(pathname, "en"));

  return languages;
}

export interface SeoMetadataInput {
  locale: Locale;
  title: string;
  description: string;
  /** Logical (unprefixed) pathname of the current route; defaults to "/". */
  pathname?: string;
  openGraph?: Metadata["openGraph"];
  twitter?: Metadata["twitter"];
  robots?: Metadata["robots"];
}

function sanitizeDescription(value: string): string {
  // Strip HTML, collapse whitespace, truncate to ~160 chars for meta
  const plain = value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (plain.length <= 165) return plain;
  return `${plain.slice(0, 162).trimEnd()}…`;
}

export function getSeoMetadata({
  locale,
  title,
  description,
  pathname = "/",
  openGraph,
  twitter,
  robots,
}: SeoMetadataInput): Metadata {
  const canonicalPath = getLocalizedPathname(pathname, locale);
  const url = getAbsoluteUrl(canonicalPath);
  // Default OG image is the file-based route at /[locale]/opengraph-image (1200x630, 1.91:1)
  const defaultOgImage = getAbsoluteUrl(getLocalizedPathname("/opengraph-image", locale));
  const sanitizedDescription = sanitizeDescription(description);

  return {
    metadataBase: new URL(getSiteUrl()),
    title,
    description: sanitizedDescription,
    alternates: {
      canonical: canonicalPath,
      languages: getAlternateLanguages(pathname),
    },
    robots: robots ?? {
      index: true,
      follow: true,
    },
    openGraph:
      openGraph ??
      {
        type: "website",
        locale: ogLocaleBySiteLocale[locale],
        url,
        siteName: "Khoa Watt",
        title,
        description: sanitizedDescription,
        images: [{ url: defaultOgImage, width: 1200, height: 630, alt: title }],
      },
    twitter:
      twitter ??
      {
        card: "summary_large_image",
        title,
        description: sanitizedDescription,
        images: [defaultOgImage],
      },
  };
}