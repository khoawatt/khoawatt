import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BlogCardGrid } from "@/components/blog/blog-card-grid";
import { JsonLdScript } from "@/components/blog/json-ld";
import { PageShell } from "@/components/layout/page-shell";
import { Section } from "@/components/layout/section";
import { SectionHeading } from "@/components/ui/section-heading";
import { getCategoryPage } from "@/features/blog/repository";
import {
  categoryBreadcrumbJsonLd,
  getBlogCategoryMetadata,
} from "@/features/blog/seo";
import { getMessages } from "@/features/i18n/messages";
import { getLocalizedPathname } from "@/features/i18n/routing";
import { getLocaleFromParams } from "@/features/i18n/server";

interface BlogCategoryPageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateMetadata({
  params,
}: Readonly<BlogCategoryPageProps>): Promise<Metadata> {
  const locale = await getLocaleFromParams(params);
  const { slug } = await params;
  const messages = await getMessages(locale);
  const category = await getCategoryPage(locale, slug, 1);

  if (!category) return {};

  return getBlogCategoryMetadata(locale, category, messages.blog, messages.metadata.title);
}

export default async function BlogCategoryPage({
  params,
}: Readonly<BlogCategoryPageProps>) {
  const locale = await getLocaleFromParams(params);
  const { slug } = await params;
  const messages = await getMessages(locale);
  const category = await getCategoryPage(locale, slug, 1);

  if (!category) notFound();

  const homePath = getLocalizedPathname("/", locale);
  const blogPath = getLocalizedPathname("/blog", locale);

  return (
    <PageShell>
      <Section className="blog-section">
        <nav aria-label={messages.blog.breadcrumbLabel} className="blog-breadcrumb">
          <ol className="blog-breadcrumb__list">
            <li className="blog-breadcrumb__item">
              <Link href={homePath}>{messages.blog.homeLabel}</Link>
            </li>
            <li className="blog-breadcrumb__item">
              <Link href={blogPath}>{messages.blog.eyebrow}</Link>
            </li>
            <li aria-current="page" className="blog-breadcrumb__item blog-breadcrumb__item--current">
              {category.name}
            </li>
          </ol>
        </nav>
        <SectionHeading
          description={messages.blog.intro}
          eyebrow={messages.blog.eyebrow}
          level="h1"
          title={category.name}
        />
        <BlogCardGrid
          emptyLabel={messages.blog.emptyState}
          locale={locale}
          messages={messages.blog}
          posts={category.listing.posts}
        />
      </Section>
      <JsonLdScript
        data={categoryBreadcrumbJsonLd(locale, category, messages.blog)}
      />
    </PageShell>
  );
}