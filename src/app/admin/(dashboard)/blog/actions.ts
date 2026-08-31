"use server";

import { revalidatePath, updateTag as updateCacheTag } from "next/cache";

import { renderMarkdown } from "@/features/blog/markdown";
import { BLOG_CACHE_TAG } from "@/features/blog/repository";
import { getServerClient, isAdminUser } from "@/features/cms/session";
import { required } from "@/features/cms/validation";

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function invalidSlug(slug: string): string | null {
  if (!required(slug)) return "Slug is required.";
  if (!SLUG_RE.test(slug)) {
    return "Slug must be lowercase letters, numbers, and single hyphens.";
  }
  return null;
}

function publishGateMessage(error: { message: string }): string {
  const message = error.message;
  if (message.includes("Cannot publish: missing required translation(s)")) {
    return message;
  }
  return message;
}

export interface BlogPostFormData {
  id?: string;
  slug: string;
  categoryId: string;
  coverBucketPath: string;
  status: "draft" | "published";
  tagIds: string[];
  titleEn: string;
  summaryEn: string;
  contentMdEn: string;
  titleVi: string;
  summaryVi: string;
  contentMdVi: string;
}

export interface BlogCategoryFormData {
  id?: string;
  sortOrder: number;
  nameEn: string;
  nameVi: string;
}

export interface BlogActionResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

function validatePost(data: BlogPostFormData): BlogActionResult | null {
  const errors: Record<string, string> = {};

  const slugError = invalidSlug(data.slug);
  if (slugError) errors.slug = slugError;
  if (!required(data.categoryId)) errors.categoryId = "Category is required.";
  if (!required(data.titleEn)) errors.titleEn = "EN title is required.";
  if (!required(data.titleVi)) errors.titleVi = "VI title is required.";
  if (!required(data.summaryEn)) errors.summaryEn = "EN summary is required.";
  if (!required(data.summaryVi)) errors.summaryVi = "VI summary is required.";

  if (Object.keys(errors).length > 0) return { ok: false, fieldErrors: errors };
  return null;
}

async function withBlogClient() {
  if (!(await isAdminUser())) return null;
  return getServerClient();
}

/** Single cache choke point: every successful blog mutation refreshes all
 *  cached blog reads together (spec §4 + §9). */
function invalidateBlog() {
  updateCacheTag(BLOG_CACHE_TAG);
}

// --- Posts --------------------------------------------------------------------

export async function createPost(
  data: BlogPostFormData,
): Promise<BlogActionResult> {
  const client = await withBlogClient();
  if (!client) return { ok: false, error: "Unauthorized." };

  const invalid = validatePost(data);
  if (invalid) return invalid;

  const id = data.id && data.id.length > 0 ? data.id : data.slug;

  const { error } = await client.rpc("cms_upsert_blog_post", {
    p_id: id,
    p_slug: data.slug.trim(),
    p_category_id: data.categoryId,
    p_cover_bucket_path: data.coverBucketPath || null,
    p_status: data.status,
    p_tags: data.tagIds,
    p_title_en: data.titleEn.trim(),
    p_summary_en: data.summaryEn.trim(),
    p_content_md_en: data.contentMdEn,
    p_title_vi: data.titleVi.trim(),
    p_summary_vi: data.summaryVi.trim(),
    p_content_md_vi: data.contentMdVi,
  });
  if (error) return { ok: false, error: publishGateMessage(error) };

  invalidateBlog();
  revalidatePath("/admin/blog");
  revalidatePath("/admin/blog/[id]");
  return { ok: true };
}

export async function updatePost(
  data: BlogPostFormData,
): Promise<BlogActionResult> {
  const client = await withBlogClient();
  if (!client) return { ok: false, error: "Unauthorized." };

  const invalid = validatePost(data);
  if (invalid) return invalid;
  if (!data.id) return { ok: false, error: "Missing post id." };

  const { error } = await client.rpc("cms_upsert_blog_post", {
    p_id: data.id,
    p_slug: data.slug.trim(),
    p_category_id: data.categoryId,
    p_cover_bucket_path: data.coverBucketPath || null,
    p_status: data.status,
    p_tags: data.tagIds,
    p_title_en: data.titleEn.trim(),
    p_summary_en: data.summaryEn.trim(),
    p_content_md_en: data.contentMdEn,
    p_title_vi: data.titleVi.trim(),
    p_summary_vi: data.summaryVi.trim(),
    p_content_md_vi: data.contentMdVi,
  });
  if (error) return { ok: false, error: publishGateMessage(error) };

  invalidateBlog();
  revalidatePath("/admin/blog");
  revalidatePath(`/admin/blog/${data.id}`);
  return { ok: true };
}

export async function deletePost(id: string): Promise<BlogActionResult> {
  const client = await withBlogClient();
  if (!client) return { ok: false, error: "Unauthorized." };

  const { data, error } = await client.rpc("cms_delete_blog_post", { p_id: id });
  if (error) return { ok: false, error: error.message };
  if (data && typeof data === "object" && "status" in data) {
    const res = data as { status: string; errorCode?: string; errorMessage?: string };
    if (res.status !== "deleted") return { ok: false, error: res.errorMessage ?? res.errorCode ?? "Failed to delete." };
  }

  invalidateBlog();
  revalidatePath("/admin/blog");
  return { ok: true };
}

// --- Categories ---------------------------------------------------------------

export async function createCategory(
  data: BlogCategoryFormData,
): Promise<BlogActionResult> {
  const client = await withBlogClient();
  if (!client) return { ok: false, error: "Unauthorized." };

  const id = data.id && data.id.length > 0 ? data.id : slugify(data.nameEn);
  if (invalidSlug(id)) return { ok: false, fieldErrors: { id: "Invalid category slug." } };
  if (!required(data.nameEn) || !required(data.nameVi)) {
    return { ok: false, fieldErrors: { nameEn: "EN and VI names are required." } };
  }

  const { error } = await client.rpc("cms_upsert_blog_category", {
    p_id: id,
    p_sort_order: data.sortOrder,
    p_name_en: data.nameEn.trim(),
    p_name_vi: data.nameVi.trim(),
  });
  if (error) return { ok: false, error: error.message };

  invalidateBlog();
  revalidatePath("/admin/blog/categories");
  return { ok: true };
}

export async function updateCategory(
  data: BlogCategoryFormData,
): Promise<BlogActionResult> {
  const client = await withBlogClient();
  if (!client) return { ok: false, error: "Unauthorized." };
  if (!data.id) return { ok: false, error: "Missing category id." };

  const { error } = await client.rpc("cms_upsert_blog_category", {
    p_id: data.id,
    p_sort_order: data.sortOrder,
    p_name_en: data.nameEn.trim(),
    p_name_vi: data.nameVi.trim(),
  });
  if (error) return { ok: false, error: error.message };

  invalidateBlog();
  revalidatePath("/admin/blog/categories");
  return { ok: true };
}

export async function deleteCategory(id: string): Promise<BlogActionResult> {
  const client = await withBlogClient();
  if (!client) return { ok: false, error: "Unauthorized." };

  const { data, error } = await client.rpc("cms_delete_blog_category", { p_id: id });
  if (error) return { ok: false, error: error.message };
  if (data && typeof data === "object" && "status" in data) {
    const res = data as { status: string; errorCode?: string; errorMessage?: string };
    if (res.status !== "deleted") return { ok: false, error: res.errorMessage ?? res.errorCode ?? "Failed to delete." };
  }

  invalidateBlog();
  revalidatePath("/admin/blog/categories");
  revalidatePath("/admin/blog");
  return { ok: true };
}

// --- Tags (admin + inline creation) ----------------------------------------

export interface BlogTagFormData {
  id?: string;
  nameEn: string;
  nameVi: string;
}

export interface CreateTagResult {
  ok: boolean;
  id?: string;
  error?: string;
}

export async function createTag(name: string): Promise<CreateTagResult> {
  const client = await withBlogClient();
  if (!client) return { ok: false, error: "Unauthorized." };

  const id = slugify(name);
  if (invalidSlug(id)) return { ok: false, error: "Invalid tag name." };

  const { error } = await client.rpc("cms_upsert_blog_tag", {
    p_id: id,
    p_name_en: name.trim(),
    p_name_vi: name.trim(),
  });
  if (error) return { ok: false, error: error.message };

  invalidateBlog();
  revalidatePath("/admin/blog/tags");
  return { ok: true, id };
}

export async function createTagFull(data: BlogTagFormData): Promise<BlogActionResult> {
  const client = await withBlogClient();
  if (!client) return { ok: false, error: "Unauthorized." };
  const id = data.id && data.id.length > 0 ? data.id : slugify(data.nameEn);
  if (invalidSlug(id)) return { ok: false, fieldErrors: { id: "Invalid tag slug." } };
  if (!required(data.nameEn) || !required(data.nameVi)) {
    return { ok: false, fieldErrors: { nameEn: "EN and VI names are required." } };
  }
  const { error } = await client.rpc("cms_upsert_blog_tag", {
    p_id: id,
    p_name_en: data.nameEn.trim(),
    p_name_vi: data.nameVi.trim(),
  });
  if (error) return { ok: false, error: error.message };
  invalidateBlog();
  revalidatePath("/admin/blog/tags");
  return { ok: true };
}

export async function updateTag(data: BlogTagFormData): Promise<BlogActionResult> {
  const client = await withBlogClient();
  if (!client) return { ok: false, error: "Unauthorized." };
  if (!data.id) return { ok: false, error: "Missing tag id." };
  if (!required(data.nameEn) || !required(data.nameVi)) {
    return { ok: false, fieldErrors: { nameEn: "EN and VI names are required." } };
  }
  const { error } = await client.rpc("cms_upsert_blog_tag", {
    p_id: data.id,
    p_name_en: data.nameEn.trim(),
    p_name_vi: data.nameVi.trim(),
  });
  if (error) return { ok: false, error: error.message };
  invalidateBlog();
  revalidatePath("/admin/blog/tags");
  revalidatePath(`/admin/blog/tags/${data.id}`);
  return { ok: true };
}

export async function deleteTag(id: string): Promise<BlogActionResult> {
  const client = await withBlogClient();
  if (!client) return { ok: false, error: "Unauthorized." };
  const { data, error } = await client.rpc("cms_delete_blog_tag", { p_id: id });
  if (error) return { ok: false, error: error.message };
  if (data && typeof data === "object" && "status" in data) {
    const res = data as { status: string; errorCode?: string; errorMessage?: string };
    if (res.status !== "deleted") return { ok: false, error: res.errorMessage ?? res.errorCode ?? "Failed to delete." };
  }
  invalidateBlog();
  revalidatePath("/admin/blog/tags");
  revalidatePath("/admin/blog");
  return { ok: true };
}

// --- Markdown preview (shared pipeline, same as the public site) --------------

export async function previewMarkdown(
  markdown: string,
): Promise<{ ok: boolean; html?: string; error?: string }> {
  if (!(await isAdminUser())) return { ok: false, error: "Unauthorized." };

  try {
    const { html } = await renderMarkdown(markdown);
    return { ok: true, html };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Preview failed.",
    };
  }
}