import type { ReactNode } from "react";

import { SiteHeader } from "@/components/navigation/site-header";
import { StructuredData } from "@/components/seo/structured-data";
import { FooterSection } from "@/components/sections/footer/footer-section";
import { getFooterContent } from "@/content/footer";
import { locales } from "@/features/i18n/config";
import { getMessages } from "@/features/i18n/messages";
import { getLocaleFromParams } from "@/features/i18n/server";
import { getLocalizedPathname } from "@/features/i18n/routing";
import { getGithubUrl } from "@/features/cms/repository";
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
  const footerContent = getFooterContent(locale);
  const githubUrl = await getGithubUrl();

  return (
    <html data-theme="light" lang={locale} suppressHydrationWarning>
      <head>
        <ThemeScript />
        {/* RSS autodiscovery (spec §7): `/feed.xml` (en) / `/vi/feed.xml` (vi) */}
        <link
          href={getLocalizedPathname("/feed.xml", locale)}
          rel="alternate"
          title="RSS"
          type="application/rss+xml"
        />
      </head>
      <body>
        <StructuredData locale={locale} />
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
      </body>
    </html>
  );
}
