import type { ReactNode } from "react";

import { SpeedInsights } from "@vercel/speed-insights/next";
import { SiteHeader } from "@/components/navigation/site-header";
import { StructuredData } from "@/components/seo/structured-data";
import { FooterSection } from "@/components/sections/footer/footer-section";
import { locales } from "@/features/i18n/config";
import { getMessages } from "@/features/i18n/messages";
import { getLocaleFromParams } from "@/features/i18n/server";
import { getLocalizedPathname } from "@/features/i18n/routing";
import {
  getFooterContent,
  getGithubUrl,
} from "@/features/cms/repository";
import { GeolocationPermissionPrompt } from "@/features/geolocation/geolocation-permission-prompt";
import { ThemeProvider } from "@/features/theme/theme-provider";
import { ThemeScript } from "@/features/theme/theme-script";

import "@/styles/globals.css";

interface LocaleLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<LocaleLayoutProps>) {
  const locale = await getLocaleFromParams(params);
  const messages = await getMessages(locale);
  const [footerContent, githubUrl] = await Promise.all([
    getFooterContent(locale),
    getGithubUrl(),
  ]);

  return (
    <html data-theme="light" lang={locale} suppressHydrationWarning>
      <head>
        <ThemeScript />
        {/* Feed autodiscovery: RSS (per-locale) + Atom/JSONFeed (global, spec §7) */}
        <link
          href={getLocalizedPathname("/feed.xml", locale)}
          rel="alternate"
          title="RSS"
          type="application/rss+xml"
        />
        <link href="/feeds.atom" rel="alternate" title="Atom" type="application/atom+xml" />
        <link href="/feeds.json" rel="alternate" title="JSON Feed" type="application/feed+json" />
      </head>
      <body>
        <StructuredData locale={locale} />
        <GeolocationPermissionPrompt />
        <ThemeProvider>
          <SiteHeader
            githubUrl={githubUrl}
            locale={locale}
            localeSwitcherMessages={messages.localeSwitcher}
            messages={messages.header}
            themeToggleMessages={messages.themeToggle}
          />
          {children}
          <FooterSection
            content={footerContent}
            locale={locale}
            messages={messages.header}
          />
        </ThemeProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
