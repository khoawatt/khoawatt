import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";

import { BlogCardGrid } from "@/components/blog/blog-card-grid";
import { BlogHero } from "@/components/blog/blog-hero";
import { CategoryNav } from "@/components/blog/category-nav";
import { Pagination } from "@/components/blog/pagination";
import { PageShell } from "@/components/layout/page-shell";
import { Section } from "@/components/layout/section";
import {
  getCategoryNav,
  getCategoryPage,
} from "@/features/blog/repository";
import { getBlogCategoryMetadata } from "@/features/blog/seo";
import { getMessages } from "@/features/i18n/messages";
import { getLocalizedPathname } from "@/features/i18n/routing";
import { getLocaleFromParams } from "@/features/i18n/server";

interface BlogCategoryPageNumberProps {
  params: Promise<{ locale: string; slug: string; n: string }>;
}

export async function generateMetadata({
  params,
}: Readonly<BlogCategoryPageNumberProps>): Promise<Metadata> {
  const locale = await getLocaleFromParams(params);
  const { slug, n } = await params;
  const messages = await getMessages(locale);
  const category = await getCategoryPage(locale, slug, 1);

  if (!category) return {};

  return getBlogCategoryMetadata(
    locale,
    category,
    messages.blog,
    messages.metadata.title,
    Number(n),
  );
}

export default async function BlogCategoryPageNumber({
  params,
}: Readonly<BlogCategoryPageNumberProps>) {
  const locale = await getLocaleFromParams(params);
  const { slug, n } = await params;
  const page = Number(n);

  // Same canonical policy as /blog/page/[n]: page 1 lives at the category
  // root; invalid or out-of-range pages are soft-404s.
  if (!Number.isInteger(page) || page < 1) {
    notFound();
  }

  const categoryRoot = getLocalizedPathname(`/blog/category/${slug}`, locale);
  if (page === 1) {
    permanentRedirect(categoryRoot);
  }

  const messages = await getMessages(locale);
  const [category, categories] = await Promise.all([
    getCategoryPage(locale, slug, page),
    getCategoryNav(locale),
  ]);

  if (!category || page > category.listing.totalPages) {
    notFound();
  }

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
          badge={messages.blog.pageNumberLabel.replace("{n}", String(page))}
          eyebrow={messages.blog.eyebrow}
          size="compact"
          title={category.name}
        />
        <CategoryNav
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
    </PageShell>
  );
}
