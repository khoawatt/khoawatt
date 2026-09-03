import Image from "next/image";
import Link from "next/link";

import type { Locale } from "@/features/i18n/config";
import type { BlogMessages } from "@/features/i18n/messages/types";
import { getLocalizedPathname } from "@/features/i18n/routing";
import type { PostListItem } from "@/features/blog/types";

interface PostCardProps {
  locale: Locale;
  messages: BlogMessages;
  post: PostListItem;
}

export function PostCard({ locale, messages, post }: Readonly<PostCardProps>) {
  const href = getLocalizedPathname(`/blog/${post.slug}`, locale);
  const localeTag = locale === "vi" ? "vi-VN" : "en-US";
  const date = new Intl.DateTimeFormat(localeTag, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(post.publishedAt));
  const readTime = messages.readMinutes.replace(
    "{count}",
    String(post.readingTimeMinutes),
  );

  return (
    <article className="blog-card">
      {post.coverImage ? (
        <Image
          alt={post.coverImage.alt}
          className="blog-card__cover"
          height={post.coverImage.height}
          sizes="(min-width: 64rem) 22rem, (min-width: 48rem) 45vw, 90vw"
          src={post.coverImage.src}
          width={post.coverImage.width}
        />
      ) : (
        <div aria-hidden="true" className="blog-card__cover blog-card__cover--placeholder" />
      )}

      <div className="blog-card__body">
        <p className="blog-card__category">{post.category.name}</p>
        <h3 className="blog-card__title">
          <Link className="blog-card__link" href={href}>
            {post.title}
          </Link>
        </h3>
        <p className="blog-card__summary">{post.summary}</p>
        <p className="blog-card__meta">
          <time dateTime={post.publishedAt}>{date}</time>
          <span aria-hidden="true" className="blog-card__meta-separator">·</span>
          <span>{readTime}</span>
        </p>
        <p aria-hidden="true" className="blog-card__cta">
          {messages.readMoreLabel}
          <svg
            aria-hidden="true"
            className="blog-card__cta-arrow"
            fill="none"
            height="16"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            width="16"
          >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </p>
      </div>
    </article>
  );
}