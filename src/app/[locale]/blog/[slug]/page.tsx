import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Article } from "@/components/blog/article";
import { JsonLdScript } from "@/components/blog/json-ld";
import { PageShell } from "@/components/layout/page-shell";
import { getPostBySlug } from "@/features/blog/repository";
import {
  blogPostingJsonLd,
  getBlogPostMetadata,
  postBreadcrumbJsonLd,
} from "@/features/blog/seo";
import { getMessages } from "@/features/i18n/messages";
import { getLocaleFromParams } from "@/features/i18n/server";

interface BlogPostPageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateMetadata({
  params,
}: Readonly<BlogPostPageProps>): Promise<Metadata> {
  const locale = await getLocaleFromParams(params);
  const { slug } = await params;
  const messages = await getMessages(locale);
  const post = await getPostBySlug(locale, slug);

  if (!post) {
    // Return safe defaults instead of empty metadata so crawlers get a canonical URL and OG
    const { getSeoMetadata } = await import("@/features/seo/metadata");
    return getSeoMetadata({
      locale,
      title: messages.metadata.title,
      description: messages.metadata.description,
      pathname: `/blog/${slug}`,
      robots: { index: false, follow: true },
    });
  }

  return getBlogPostMetadata(locale, post, messages.blog, messages.metadata.title);
}

export default async function BlogPostPage({
  params,
}: Readonly<BlogPostPageProps>) {
  const locale = await getLocaleFromParams(params);
  const { slug } = await params;
  const messages = await getMessages(locale);
  const post = await getPostBySlug(locale, slug);

  if (!post) notFound();

  return (
    <PageShell>
      <Article locale={locale} messages={messages.blog} post={post} />
      <JsonLdScript data={blogPostingJsonLd(locale, post)} />
      <JsonLdScript data={postBreadcrumbJsonLd(locale, post, messages.blog)} />
    </PageShell>
  );
}