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
import { getCategoryNav, getTagPage } from "@/features/blog/repository";
import { getBlogTagMetadata, tagBreadcrumbJsonLd } from "@/features/blog/seo";
import { getMessages } from "@/features/i18n/messages";
import { getLocalizedPathname } from "@/features/i18n/routing";
import { getLocaleFromParams } from "@/features/i18n/server";

interface BlogTagPageProps {
  params: Promise<{ locale: string; tag: string }>;
}

export async function generateMetadata({
  params,
}: Readonly<BlogTagPageProps>): Promise<Metadata> {
  const locale = await getLocaleFromParams(params);
  const { tag } = await params;
  const messages = await getMessages(locale);
  const tagView = await getTagPage(locale, tag, 1);

  if (!tagView) return {};

  return getBlogTagMetadata(locale, tagView, messages.blog, messages.metadata.title);
}

export default async function BlogTagPage({ params }: Readonly<BlogTagPageProps>) {
  const locale = await getLocaleFromParams(params);
  const { tag } = await params;
  const messages = await getMessages(locale);
  const [tagView, categories] = await Promise.all([
    getTagPage(locale, tag, 1),
    getCategoryNav(locale),
  ]);

  if (!tagView) notFound();

  const homePath = getLocalizedPathname("/", locale);
  const blogPath = getLocalizedPathname("/blog", locale);
  const tagBasePath = `/blog/tag/${tagView.slug}`;

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
            <li
              aria-current="page"
              className="blog-breadcrumb__item blog-breadcrumb__item--current"
            >
              {tagView.name}
            </li>
          </ol>
        </nav>
        <BlogHero eyebrow={messages.blog.eyebrow} size="compact" title={tagView.name} />
        <BlogCategoryDropdown
          activeSlug={null}
          entries={categories}
          locale={locale}
          messages={messages.blog}
        />
        <BlogCardGrid
          emptyLabel={messages.blog.emptyState}
          locale={locale}
          messages={messages.blog}
          posts={tagView.listing.posts}
        />
        <Pagination
          basePath={tagBasePath}
          locale={locale}
          messages={messages.blog}
          page={tagView.listing.page}
          totalPages={tagView.listing.totalPages}
        />
      </Section>
      <JsonLdScript data={tagBreadcrumbJsonLd(locale, tagView, messages.blog)} />
    </PageShell>
  );
}
