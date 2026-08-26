import type { Metadata } from "next";

import { getPortfolioProfile as getCmsProfile } from "@/features/cms/repository";
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

export function getSeoMetadata({
  locale,
  title,
  description,
  pathname = "/",
  openGraph,
  twitter,
  robots,
}: SeoMetadataInput): Promise<Metadata> {
  return getCmsProfile(locale).then((profile) => {
    const canonicalPath = getLocalizedPathname(pathname, locale);
    const url = getAbsoluteUrl(canonicalPath);
    const ogImage = getAbsoluteUrl(profile.hero.image.src);

    return {
      metadataBase: new URL(getSiteUrl()),
      title,
      description,
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
          siteName: title,
          title,
          description,
          images: [{ url: ogImage, width: 852, height: 1280, alt: profile.hero.image.alt }],
        },
      twitter:
        twitter ??
        {
          card: "summary",
          title,
          description,
          images: [ogImage],
        },
    };
  });
}