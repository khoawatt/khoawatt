import type { PostListItem } from "@/features/blog/types";
import type { Locale } from "@/features/i18n/config";
import type { BlogMessages } from "@/features/i18n/messages/types";

import { PostCard } from "./post-card";

interface BlogCardGridProps {
  emptyLabel: string;
  locale: Locale;
  messages: BlogMessages;
  posts: PostListItem[];
}

export function BlogCardGrid({
  emptyLabel,
  locale,
  messages,
  posts,
}: Readonly<BlogCardGridProps>) {
  if (posts.length === 0) {
    return <p className="blog-grid__empty">{emptyLabel}</p>;
  }

  return (
    <div className="blog-grid">
      {posts.map((post) => (
        <PostCard key={post.slug} locale={locale} messages={messages} post={post} />
      ))}
    </div>
  );
}