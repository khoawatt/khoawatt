import type { Metadata } from "next";

import { JsonLdScript } from "@/components/blog/json-ld";
import { BlogCardGrid } from "@/components/blog/blog-card-grid";
import { BlogCategoryDropdown } from "@/components/blog/blog-category-dropdown";
import { BlogHero } from "@/components/blog/blog-hero";
import { Pagination } from "@/components/blog/pagination";
import { PageShell } from "@/components/layout/page-shell";
import { Section } from "@/components/layout/section";
import {
  getCategoryNav,
  getPublishedPosts,
} from "@/features/blog/repository";
import { blogIndexJsonLd, getBlogListingMetadata } from "@/features/blog/seo";
import { getMessages } from "@/features/i18n/messages";
import { getLocaleFromParams } from "@/features/i18n/server";

interface BlogPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: Readonly<BlogPageProps>): Promise<Metadata> {
  const locale = await getLocaleFromParams(params);
  const messages = await getMessages(locale);

  return getBlogListingMetadata(locale, messages.blog, messages.metadata.title);
}

export default async function BlogPage({ params }: Readonly<BlogPageProps>) {
  const locale = await getLocaleFromParams(params);
  const messages = await getMessages(locale);
  const [listing, categories] = await Promise.all([
    getPublishedPosts(locale, 1),
    getCategoryNav(locale),
  ]);

  return (
    <PageShell>
      <Section className="blog-section">
        <BlogHero
          eyebrow={messages.blog.eyebrow}
          intro={messages.blog.intro}
          title={messages.blog.title}
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
          posts={listing.posts}
        />
        <Pagination
          locale={locale}
          messages={messages.blog}
          page={listing.page}
          totalPages={listing.totalPages}
        />
      </Section>
      <JsonLdScript
        data={blogIndexJsonLd(locale, listing.posts, messages.blog)}
      />
    </PageShell>
  );
}
