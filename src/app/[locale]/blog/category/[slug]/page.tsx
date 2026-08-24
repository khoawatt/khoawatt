import type { Metadata } from "next";
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

  return (
    <PageShell>
      <Section className="blog-section">
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