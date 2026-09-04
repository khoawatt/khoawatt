import Image from "next/image";
import Link from "next/link";

import { Container } from "@/components/layout/container";
import { getPortfolioProfile } from "@/content/profile";
import { getTipContent } from "@/content/tip";
import type { PostDetail } from "@/features/blog/types";
import type { Locale } from "@/features/i18n/config";
import type { BlogMessages } from "@/features/i18n/messages/types";
import { getLocalizedPathname } from "@/features/i18n/routing";

import { MarkdownCopyButton } from "./markdown-copy-button";
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
  const profile = getPortfolioProfile(locale);
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
            <Link href={homePath}>
              <svg
                aria-hidden="true"
                className="blog-breadcrumb__icon"
                fill="none"
                height="14"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                width="14"
              >
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <path d="M9 22V12h6v10" />
              </svg>
              <span className="sr-only">{messages.homeLabel}</span>
            </Link>
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
        <TableOfContents
          collapseLabel={messages.tocCollapseLabel}
          expandLabel={messages.tocExpandLabel}
          label={messages.onThisPage}
          toc={post.toc}
        />

        <div className="blog-article__body">
          <header className="blog-article__header">
            <Link
              className="blog-article__chip"
              href={getLocalizedPathname(
                `/blog/category/${post.category.slug}`,
                locale,
              )}
            >
              {post.category.name}
            </Link>
            <h1 className="blog-article__title">{post.title}</h1>
            <div className="blog-article__byline-row">
              <div className="blog-article__byline">
                <span aria-hidden="true" className="blog-article__avatar">
                  <Image
                    alt=""
                    height={1280}
                    src={profile.hero.image.src}
                    style={{ objectPosition: profile.hero.image.focalPoint }}
                    width={852}
                  />
                </span>
                <span className="blog-article__byline-name">
                  {profile.name}
                  <span className="blog-article__byline-role">{profile.role}</span>
                </span>
                <span className="blog-article__byline-meta">
                  <svg
                    aria-hidden="true"
                    fill="none"
                    height="14"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    width="14"
                  >
                    <rect height="18" rx="2" width="18" x="3" y="4" />
                    <path d="M16 2v4M8 2v4M3 10h18" />
                  </svg>
                  <time dateTime={post.publishedAt}>{date}</time>
                  <svg
                    aria-hidden="true"
                    fill="none"
                    height="14"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    width="14"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                  <span>{readTime}</span>
                </span>
              </div>
              <MarkdownCopyButton
                contentMd={post.contentMd}
                locale={locale}
                messages={messages}
                slug={post.slug}
              />
            </div>
            {post.tags.length > 0 ? (
              <ul aria-label={messages.tagsLabel} className="blog-article__tags">
                {post.tags.map((tag) => (
                  <li className="blog-article__tag" key={tag.slug}>
                    <Link
                      className="blog-article__tag-link"
                      href={getLocalizedPathname(`/blog/tag/${tag.slug}`, locale)}
                    >
                      {tag.name}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </header>

          {post.coverImage ? (
            <Image
              alt={post.coverImage.alt}
              className="blog-article__cover"
              fetchPriority="high"
              height={post.coverImage.height}
              priority
              sizes="(min-width: 64rem) 42rem, 100vw"
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

          <footer className="mt-4 flex flex-col items-center gap-3 border-t border-[var(--color-border)] pt-4 text-[var(--color-text-muted)] transition-colors sm:flex-row sm:flex-nowrap sm:items-center sm:gap-4">
            <div className="whitespace-nowrap text-sm font-medium">{getTipContent(locale).label}</div>
            <ul className="flex flex-row flex-nowrap items-center gap-4">
              <li className="shrink-0">
                <a
                  href={getTipContent(locale).links.find((l) => l.id === "buymeacoffee")?.href ?? "https://www.buymeacoffee.com/khoawatt"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block shrink-0 rounded bg-white p-1 shadow-sm"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt="Buy Me a Coffee"
                    src="/images/brand/bmc-logo.svg"
                    className="h-6 w-auto shrink-0"
                  />
                </a>
              </li>
              <li className="shrink-0">
                <a
                  href={getTipContent(locale).links.find((l) => l.id === "kofi")?.href ?? "https://ko-fi.com/khoawatt"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block shrink-0"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt="Ko-fi"
                    src="https://storage.ko-fi.com/cdn/brandasset/v2/kofi_logo.png"
                    height={16}
                    width={64}
                    className="h-4 w-16 shrink-0 object-contain"
                  />
                </a>
              </li>
              <li className="shrink-0">
                <a
                  href={getTipContent(locale).links.find((l) => l.id === "momo")?.href ?? "/images/tip/momo-qr.jpg"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block overflow-hidden rounded bg-white p-1 shadow-sm"
                  title="Momo"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt="Momo"
                    src={getTipContent(locale).links.find((l) => l.id === "momo")?.href ?? "/images/tip/momo-qr.jpg"}
                    className="h-10 w-10 object-contain sm:h-8 sm:w-8"
                  />
                </a>
              </li>
            </ul>
          </footer>

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
