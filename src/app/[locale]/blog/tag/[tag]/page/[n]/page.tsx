import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";

import { BlogCardGrid } from "@/components/blog/blog-card-grid";
import { BlogCategoryDropdown } from "@/components/blog/blog-category-dropdown";
import { BlogHero } from "@/components/blog/blog-hero";
import { Pagination } from "@/components/blog/pagination";
import { PageShell } from "@/components/layout/page-shell";
import { Section } from "@/components/layout/section";
import { getCategoryNav, getTagPage } from "@/features/blog/repository";
import { getBlogTagMetadata, tagBreadcrumbJsonLd } from "@/features/blog/seo";
import { JsonLdScript } from "@/components/blog/json-ld";
import { getMessages } from "@/features/i18n/messages";
import { getLocalizedPathname } from "@/features/i18n/routing";
import { getLocaleFromParams } from "@/features/i18n/server";

interface BlogTagPageNumberProps {
  params: Promise<{ locale: string; tag: string; n: string }>;
}

export async function generateMetadata({
  params,
}: Readonly<BlogTagPageNumberProps>): Promise<Metadata> {
  const locale = await getLocaleFromParams(params);
  const { tag, n } = await params;
  const page = Number(n);
  if (!Number.isInteger(page) || page < 1) return {};
  const messages = await getMessages(locale);
  const tagView = await getTagPage(locale, tag, page);

  if (!tagView || page > tagView.listing.totalPages) return {};

  return getBlogTagMetadata(locale, tagView, messages.blog, messages.metadata.title, page);
}

export default async function BlogTagPageNumber({
  params,
}: Readonly<BlogTagPageNumberProps>) {
  const locale = await getLocaleFromParams(params);
  const { tag, n } = await params;
  const page = Number(n);

  if (!Number.isInteger(page) || page < 1) {
    notFound();
  }

  const tagRoot = getLocalizedPathname(`/blog/tag/${tag}`, locale);
  if (page === 1) {
    permanentRedirect(tagRoot);
  }

  const messages = await getMessages(locale);
  const [tagView, categories] = await Promise.all([
    getTagPage(locale, tag, page),
    getCategoryNav(locale),
  ]);

  if (!tagView || page > tagView.listing.totalPages) {
    notFound();
  }

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
        <BlogHero
          badge={messages.blog.pageNumberLabel.replace("{n}", String(page))}
          eyebrow={messages.blog.eyebrow}
          size="compact"
          title={tagView.name}
        />
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
