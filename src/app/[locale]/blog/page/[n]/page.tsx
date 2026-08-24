import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { BlogCardGrid } from "@/components/blog/blog-card-grid";
import { Pagination } from "@/components/blog/pagination";
import { PageShell } from "@/components/layout/page-shell";
import { Section } from "@/components/layout/section";
import { SectionHeading } from "@/components/ui/section-heading";
import { getPublishedPosts } from "@/features/blog/repository";
import { getBlogListingMetadata } from "@/features/blog/seo";
import { getMessages } from "@/features/i18n/messages";
import { getLocalizedPathname } from "@/features/i18n/routing";
import { getLocaleFromParams } from "@/features/i18n/server";

interface BlogPageNumberProps {
  params: Promise<{ locale: string; n: string }>;
}

export async function generateMetadata({
  params,
}: Readonly<BlogPageNumberProps>): Promise<Metadata> {
  const locale = await getLocaleFromParams(params);
  const messages = await getMessages(locale);
  const { n } = await params;

  return getBlogListingMetadata(
    locale,
    messages.blog,
    messages.metadata.title,
    `/blog/page/${n}`,
  );
}

export default async function BlogPageNumber({
  params,
}: Readonly<BlogPageNumberProps>) {
  const locale = await getLocaleFromParams(params);
  const { n } = await params;
  const page = Number(n);

  // Canonical/redirect policy (spec §6): page 1 is `/blog`; invalid or
  // out-of-range page numbers are soft-404s, never duplicated content.
  if (!Number.isInteger(page) || page < 1) {
    notFound();
  }
  if (page === 1) {
    permanentRedirect(getLocalizedPathname("/blog", locale));
  }

  const messages = await getMessages(locale);
  const listing = await getPublishedPosts(locale, page);

  if (page > listing.totalPages) {
    notFound();
  }

  return (
    <PageShell>
      <Section className="blog-section">
        <SectionHeading
          description={messages.blog.intro}
          eyebrow={messages.blog.eyebrow}
          level="h1"
          title={messages.blog.pageNumberLabel.replace("{n}", String(page))}
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
    </PageShell>
  );
}