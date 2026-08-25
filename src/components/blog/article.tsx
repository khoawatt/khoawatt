import Image from "next/image";
import Link from "next/link";

import { Container } from "@/components/layout/container";
import type { PostDetail } from "@/features/blog/types";
import type { Locale } from "@/features/i18n/config";
import type { BlogMessages } from "@/features/i18n/messages/types";
import { getLocalizedPathname } from "@/features/i18n/routing";

import { PostCard } from "./post-card";
import { TableOfContents } from "./table-of-contents";

interface ArticleProps {
  locale: Locale;
  messages: BlogMessages;
  post: PostDetail;
}

export function Article({ locale, messages, post }: Readonly<ArticleProps>) {
  const homePath = getLocalizedPathname("/", locale);
  const blogPath = getLocalizedPathname("/blog", locale);
  const localeTag = locale === "vi" ? "vi-VN" : "en-US";
  const date = new Intl.DateTimeFormat(localeTag, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(post.publishedAt));
  const readTime = messages.readMinutes.replace(
    "{count}",
    String(post.readingTimeMinutes),
  );

  return (
    <article className="blog-article">
      <nav aria-label={messages.breadcrumbLabel} className="blog-breadcrumb">
        <ol className="blog-breadcrumb__list">
          <li className="blog-breadcrumb__item">
            <Link href={homePath}>{messages.homeLabel}</Link>
          </li>
          <li className="blog-breadcrumb__item">
            <Link href={blogPath}>{messages.eyebrow}</Link>
          </li>
          <li aria-current="page" className="blog-breadcrumb__item blog-breadcrumb__item--current">
            {post.title}
          </li>
        </ol>
      </nav>

      <div className="blog-article__layout">
        <TableOfContents label={messages.onThisPage} toc={post.toc} />

        <div className="blog-article__body">
          <header className="blog-article__header">
            <h1 className="blog-article__title">{post.title}</h1>
            <p className="blog-article__meta">
              <time dateTime={post.publishedAt}>
                {messages.publishedLabel}: {date}
              </time>
              <span aria-hidden="true" className="blog-article__meta-separator">·</span>
              <span>{readTime}</span>
              <span aria-hidden="true" className="blog-article__meta-separator">·</span>
              <Link
                className="blog-article__category"
                href={getLocalizedPathname(
                  `/blog/category/${post.category.slug}`,
                  locale,
                )}
              >
                {post.category.name}
              </Link>
            </p>
            {post.tags.length > 0 ? (
              <ul aria-label={messages.tagsLabel} className="blog-article__tags">
                {post.tags.map((tag) => (
                  <li className="blog-article__tag" key={tag.slug}>
                    {tag.name}
                  </li>
                ))}
              </ul>
            ) : null}
          </header>

          {post.coverImage ? (
            <Image
              alt={post.coverImage.alt}
              className="blog-article__cover"
              height={post.coverImage.height}
              src={post.coverImage.src}
              width={post.coverImage.width}
            />
          ) : null}

          {/* The HTML comes from the server-side Markdown pipeline, which has raw
              HTML passthrough disabled, so it is safe by construction. */}
          <div
            className="blog-article__prose"
            dangerouslySetInnerHTML={{ __html: post.html }}
          />

        </div>
      </div>

      {post.relatedPosts.length > 0 ? (
        <section
          aria-labelledby="related-posts-title"
          className="blog-article__related"
        >
          <Container>
            <h2 className="blog-article__related-title" id="related-posts-title">
              {messages.relatedPosts}
            </h2>
            <div className="blog-grid">
              {post.relatedPosts.map((related) => (
                <PostCard
                  key={related.slug}
                  locale={locale}
                  messages={messages}
                  post={related}
                />
              ))}
            </div>
          </Container>
        </section>
      ) : null}
    </article>
  );
}