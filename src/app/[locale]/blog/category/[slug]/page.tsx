import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BlogCardGrid } from "@/components/blog/blog-card-grid";
import { BlogCategoryDropdown } from "@/components/blog/blog-category-dropdown";
import { BlogHero } from "@/components/blog/blog-hero";
import { JsonLdScript } from "@/components/blog/json-ld";
import { Pagination } from "@/components/blog/pagination";
import { PageShell } from "@/components/layout/page-shell";
import { Section } from "@/components/layout/section";
import {
  getCategoryNav,
  getCategoryPage,
} from "@/features/blog/repository";
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
  const [category, categories] = await Promise.all([
    getCategoryPage(locale, slug, 1),
    getCategoryNav(locale),
  ]);

  if (!category) notFound();

  const homePath = getLocalizedPathname("/", locale);
  const blogPath = getLocalizedPathname("/blog", locale);
  const categoryBasePath = `/blog/category/${category.slug}`;

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
        <BlogHero
          eyebrow={messages.blog.eyebrow}
          size="compact"
          title={category.name}
        />
        <BlogCategoryDropdown
          activeSlug={category.slug}
          entries={categories}
          locale={locale}
          messages={messages.blog}
        />
        <BlogCardGrid
          emptyLabel={messages.blog.emptyState}
          locale={locale}
          messages={messages.blog}
          posts={category.listing.posts}
        />
        <Pagination
          basePath={categoryBasePath}
          locale={locale}
          messages={messages.blog}
          page={category.listing.page}
          totalPages={category.listing.totalPages}
        />
      </Section>
      <JsonLdScript
        data={categoryBreadcrumbJsonLd(locale, category, messages.blog)}
      />
    </PageShell>
  );
}
