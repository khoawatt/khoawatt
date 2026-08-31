import { getServerClient } from "@/features/cms/session";

export interface AdminPostRow {
  id: string;
  slug: string;
  categoryId: string;
  categorySlug: string;
  categoryNameEn: string;
  categoryNameVi: string;
  coverBucketPath: string | null;
  status: "draft" | "published";
  publishedAt: string | null;
  updatedAt: string;
  titleEn: string;
  summaryEn: string;
  contentMdEn: string;
  titleVi: string;
  summaryVi: string;
  contentMdVi: string;
  tagIds: string[];
}

export interface AdminCategoryRow {
  id: string;
  slug: string;
  sortOrder: number;
  nameEn: string;
  nameVi: string;
}

export interface AdminTagRow {
  id: string;
  slug: string;
  nameEn: string;
  nameVi: string;
}

interface PostTranslation {
  locale: string;
  title: string;
  summary: string;
  content_md: string;
}

interface CategoryName {
  locale: string;
  name: string;
}

interface PostCategory {
  id: string;
  slug: string;
  blog_category_translations: CategoryName[];
}

interface PostTagLink {
  tag_id: string;
}

interface PostRowWithChildren {
  id: string;
  slug: string;
  category_id: string;
  cover_bucket_path: string | null;
  status: string;
  published_at: string | null;
  updated_at: string;
  blog_categories: PostCategory | null;
  blog_post_translations: PostTranslation[];
  blog_post_tags: PostTagLink[] | null;
}

function localeValue<T extends { locale: string }>(
  rows: T[] | null | undefined,
  locale: string,
): T | undefined {
  return rows?.find((row) => row.locale === locale);
}

export async function listPosts(): Promise<AdminPostRow[]> {
  const client = await getServerClient();

  const { data, error } = await client
    .from("blog_posts")
    .select(
      "id, slug, category_id, cover_bucket_path, status, published_at, updated_at, blog_categories(id, slug, blog_category_translations(locale, name)), blog_post_translations(locale, title, summary, content_md), blog_post_tags(tag_id)",
    )
    .is("deleted_at", null)
    .order("published_at", { ascending: false })
    .order("updated_at", { ascending: false })
    .order("id");

  if (error || !data) return [];

  return (data as unknown as PostRowWithChildren[]).map((row) => {
    const en = localeValue(row.blog_post_translations, "en");
    const vi = localeValue(row.blog_post_translations, "vi");
    const categoryNameEn = localeValue(
      row.blog_categories?.blog_category_translations,
      "en",
    );
    const categoryNameVi = localeValue(
      row.blog_categories?.blog_category_translations,
      "vi",
    );

    return {
      id: row.id,
      slug: row.slug,
      categoryId: row.category_id,
      categorySlug: row.blog_categories?.slug ?? "",
      categoryNameEn: categoryNameEn?.name ?? "",
      categoryNameVi: categoryNameVi?.name ?? "",
      coverBucketPath: row.cover_bucket_path,
      status: row.status === "published" ? "published" : "draft",
      publishedAt: row.published_at,
      updatedAt: row.updated_at,
      titleEn: en?.title ?? "",
      summaryEn: en?.summary ?? "",
      contentMdEn: en?.content_md ?? "",
      titleVi: vi?.title ?? "",
      summaryVi: vi?.summary ?? "",
      contentMdVi: vi?.content_md ?? "",
      tagIds: (row.blog_post_tags ?? []).map((link) => link.tag_id),
    };
  });
}

export async function getPost(id: string): Promise<AdminPostRow | null> {
  const posts = await listPosts();
  return posts.find((post) => post.id === id) ?? null;
}

export async function listCategories(): Promise<AdminCategoryRow[]> {
  const client = await getServerClient();

  const { data, error } = await client
    .from("blog_categories")
    .select(
      "id, slug, sort_order, blog_category_translations(locale, name)",
    )
    .is("deleted_at", null)
    .order("sort_order")
    .order("id");

  if (error || !data) return [];

  return (data as unknown as {
    id: string;
    slug: string;
    sort_order: number;
    blog_category_translations: CategoryName[];
  }[]).map((row) => {
    const en = localeValue(row.blog_category_translations, "en");
    const vi = localeValue(row.blog_category_translations, "vi");
    return {
      id: row.id,
      slug: row.slug,
      sortOrder: row.sort_order,
      nameEn: en?.name ?? "",
      nameVi: vi?.name ?? "",
    };
  });
}

export async function getCategory(id: string): Promise<AdminCategoryRow | null> {
  const categories = await listCategories();
  return categories.find((category) => category.id === id) ?? null;
}

export async function listTags(): Promise<AdminTagRow[]> {
  const client = await getServerClient();

  const { data, error } = await client
    .from("blog_tags")
    .select("id, slug, blog_tag_translations(locale, name)")
    .is("deleted_at", null)
    .order("id");

  if (error || !data) return [];

  return (data as unknown as {
    id: string;
    slug: string;
    blog_tag_translations: CategoryName[];
  }[]).map((row) => {
    const en = localeValue(row.blog_tag_translations, "en");
    const vi = localeValue(row.blog_tag_translations, "vi");
    return {
      id: row.id,
      slug: row.slug,
      nameEn: en?.name ?? "",
      nameVi: vi?.name ?? "",
    };
  });
}