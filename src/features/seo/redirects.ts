import type { Locale } from "@/features/i18n/config";
import { getLocalizedPathname } from "@/features/i18n/routing";

export interface LegacyRedirectTarget {
  pathname: string;
  hash: string;
}

interface LegacyRedirectRule {
  /** Legacy pathname key. A trailing `*` matches any pathname with that prefix. */
  legacy: string;
  /** Locale-independent logical destination and fragment. */
  destination: {
    pathname: string;
    hash: string;
  };
}

const caseStudySlugs = [
  "atm-seeking",
  "readingtime",
  "comestic-beauty-store",
  "bakery-store",
  "dynamic-global-solution-landing-page",
  "scented-candles-store",
] as const;

const blogPostSlugs = [
  "what-is-a-web-server",
  "identify-a-seo-standard-website",
  "javascript-code-compilation-process",
  "a-brief-introduction-to-nextjs",
] as const;

const tagSlugs = [
  "cloud",
  "ecommerce",
  "edtech",
  "fb",
  "health-beauty",
  "javascript-news",
  "landing-page",
  "lifestyle",
  "lms",
  "nestjs",
  "nextjs",
  "nextjs-news",
  "reactjs",
  "seo-news",
  "utility",
  "web",
  "web-news",
  "wordpress",
] as const;

/**
 * Legacy WordPress redirect matrix per owner decision D7
 * (`docs/migration/owner-decision-capture.md`):
 * legacy URL with a meaningful equivalent → that new equivalent;
 * legacy URL with no equivalent → the homepage.
 *
 * Every destination is a logical root plus an optional fragment, so a
 * redirect can never point at another legacy route (no chains). Locale
 * prefixes are applied at lookup time.
 */
const legacyRedirectRules: ReadonlyArray<LegacyRedirectRule> = [
  ...caseStudySlugs.map(
    (slug) =>
      ({
        legacy: `/${slug}`,
        destination: { pathname: "/", hash: "#projects" },
      }) satisfies LegacyRedirectRule,
  ),
  { legacy: "/resume", destination: { pathname: "/", hash: "#resume" } },
  { legacy: "/case-studies", destination: { pathname: "/", hash: "#projects" } },
  {
    legacy: "/category/case-studies",
    destination: { pathname: "/", hash: "#projects" },
  },
  // `/blog` is intentionally NOT in the legacy matrix: the new site has a real
  // `/blog` route (superseding the old WordPress `/blog` → home redirect).
  ...blogPostSlugs.map(
    (slug) =>
      ({
        legacy: `/${slug}`,
        destination: { pathname: "/", hash: "" },
      }) satisfies LegacyRedirectRule,
  ),
  { legacy: "/category/tech-blog", destination: { pathname: "/", hash: "" } },
  { legacy: "/author/superuser", destination: { pathname: "/", hash: "" } },
  ...tagSlugs.map(
    (slug) =>
      ({
        legacy: `/tag/${slug}`,
        destination: { pathname: "/", hash: "" },
      }) satisfies LegacyRedirectRule,
  ),
  { legacy: "/blocks/*", destination: { pathname: "/", hash: "" } },
];

function normalizeLegacyPathname(pathname: string): string {
  if (pathname.length <= 1) {
    return pathname;
  }

  return pathname.replace(/\/+$/, "");
}

function matchesRule(pathname: string, legacy: string): boolean {
  const normalized = normalizeLegacyPathname(pathname);

  if (legacy.endsWith("*")) {
    return normalized.startsWith(legacy.slice(0, -1));
  }

  return normalized === legacy;
}

export function getLegacyRedirectTarget(
  locale: Locale,
  pathname: string,
): LegacyRedirectTarget | null {
  const rule = legacyRedirectRules.find((candidate) =>
    matchesRule(pathname, candidate.legacy),
  );

  if (!rule) {
    return null;
  }

  return {
    pathname: getLocalizedPathname(rule.destination.pathname, locale),
    hash: rule.destination.hash,
  };
}

export function normalizeTrailingSlash(pathname: string): string | null {
  if (pathname === "/" || !pathname.endsWith("/")) {
    return null;
  }

  return pathname.replace(/\/+$/, "") || "/";
}

export function buildRedirectUrl(
  origin: string,
  pathname: string,
  search: string,
  hash: string,
): URL {
  const target = new URL(origin);
  target.pathname = pathname;
  target.search = search;
  target.hash = hash;
  return target;
}
