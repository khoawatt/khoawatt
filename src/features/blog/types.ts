/**
 * Blog view models (slice 2 of the blog design spec, §4).
 *
 * Public UI consumes these typed view models only — never raw Supabase rows.
 * Missing/incomplete records resolve to `notFound()`/empty at the repository
 * boundary, never a partial render.
 */

export interface ManagedImage {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export interface PostListItem {
  slug: string;
  title: string;
  summary: string;
  category: { slug: string; name: string };
  coverImage?: ManagedImage;
  publishedAt: string;
  updatedAt?: string;
  readingTimeMinutes: number;
}

export type TocEntry = { id: string; text: string; depth: 2 | 3 };

export type PostDetail = PostListItem & {
  tags: { slug: string; name: string }[];
  toc: TocEntry[];
  html: string;
  relatedPosts: PostListItem[];
};

export interface BlogListingView {
  posts: PostListItem[];
  page: number;
  totalPages: number;
}

export interface BlogCategoryView {
  slug: string;
  name: string;
  listing: BlogListingView;
}