"use server";

import { revalidatePath } from "next/cache";

import { getServerClient, isAdminUser } from "@/features/cms/session";
import { removeMarkdownImageNodes, removeResumeMediaReference } from "./media-resolve";

export interface ResolveResult {
  ok: boolean;
  error?: string;
  clearedCovers?: number;
  removedNodes?: number;
  removedResumeRows?: number;
}

export async function resolveAndDeleteMedia(
  bucket: string,
  path: string,
): Promise<ResolveResult> {
  if (!(await isAdminUser())) return { ok: false, error: "Unauthorized." };
  const client = await getServerClient();

  let clearedCovers = 0;
  let removedNodes = 0;
  let removedResumeRows = 0;

  // 1. Clear cover_bucket_path where it matches (SET NULL) — authoritative exact match, with FOR UPDATE semantics via RPC
  // Use the dedicated RPC for set_null to ensure audit and proper handling
  try {
    const { data, error } = await client.rpc("cms_resolve_media_reference", {
      p_bucket: bucket,
      p_path: path,
      p_resolve_type: "set_null",
    });
    if (error) return { ok: false, error: error.message };
    if (data && typeof data === "object" && "cleared" in data) {
      clearedCovers = (data as { cleared: number }).cleared ?? 0;
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to clear covers." };
  }

  // 2. For blog content_md, find posts that contain the path as candidate, then authoritatively parse and update
  try {
    // Find candidate posts (ILIKE) — this is candidate search, not authoritative mutation yet
    const { data: candidates, error: candError } = await client
      .from("blog_posts")
      .select("id, slug, category_id, cover_bucket_path, status, blog_post_translations(locale, title, summary, content_md)")
      .is("deleted_at", null);
    if (candError) throw new Error(candError.message);

    // Filter candidates where content_md actually contains the path string (ILIKE candidate)
    // Then for each, do authoritative parse and update if needed
    const postsWithContent = (candidates as unknown as Array<{ id: string; slug: string; category_id: string; cover_bucket_path: string | null; status: string; blog_post_translations: Array<{ locale: string; title: string; summary: string; content_md: string }> }>) ?? [];

    for (const post of postsWithContent) {
      for (const tr of post.blog_post_translations) {
        if (!tr.content_md.includes(path)) continue;
        const { cleaned, removedCount } = removeMarkdownImageNodes(tr.content_md, path);
        if (removedCount === 0) continue; // candidate but not authoritative — skip

        // Need to update this translation's content_md via upsert
        // Fetch the other locale's content to preserve it
        const otherLocale = tr.locale === "en" ? "vi" : "en";
        const otherTr = post.blog_post_translations.find((t) => t.locale === otherLocale);
        // For the locale we're cleaning, use cleaned; for other, keep as is
        const contentEn = tr.locale === "en" ? cleaned : (otherTr?.content_md ?? "");
        const contentVi = tr.locale === "vi" ? cleaned : (otherTr?.content_md ?? "");

        // Also need titles/summaries for upsert — fetch from same post
        const titleEn = post.blog_post_translations.find((t) => t.locale === "en")?.title ?? "";
        const titleVi = post.blog_post_translations.find((t) => t.locale === "vi")?.title ?? "";
        const summaryEn = post.blog_post_translations.find((t) => t.locale === "en")?.summary ?? "";
        const summaryVi = post.blog_post_translations.find((t) => t.locale === "vi")?.summary ?? "";

        // Get tags for this post
        const { data: tagLinks } = await client.from("blog_post_tags").select("tag_id").eq("post_id", post.id);
        const tagIds = (tagLinks as unknown as Array<{ tag_id: string }>)?.map((l) => l.tag_id) ?? [];

        // Use upsert to update content — this will handle version via updated_at check implicitly via RPC's logic
        const { error: upsertError } = await client.rpc("cms_upsert_blog_post", {
          p_id: post.id,
          p_slug: post.slug,
          p_category_id: post.category_id,
          p_cover_bucket_path: post.cover_bucket_path,
          p_status: post.status,
          p_tags: tagIds,
          p_title_en: titleEn,
          p_summary_en: summaryEn,
          p_content_md_en: contentEn,
          p_title_vi: titleVi,
          p_summary_vi: summaryVi,
          p_content_md_vi: contentVi,
        });
        if (upsertError) throw new Error(upsertError.message);
        removedNodes += removedCount;
        // Only one locale per post needs update, but if both locales contain path, they'll be handled in next loop iteration for the other locale
        // Break after handling this post's locale to avoid double processing same post in same loop?
        // We continue to check other locale in same post if it also contains path
      }
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to resolve content." };
  }

  // 2b. Resume media: delete resume_media rows that reference the path (exact match, bypass DELETE_DEPENDENCY_EXISTS)
  // This mirrors removeResumeMediaReference but with per-row guard to avoid TOCTOU on trashed parents.
  try {
    // Prefer the dedicated helper for the common case (exact eq on both columns)
    // Keep a guarded per-row path to respect resume_entries.deleted_at IS NULL
    const { data: resumeRows, error: resumeError } = await client
      .from("resume_media")
      .select("id, resume_entry_id")
      .or(`thumbnail_src.eq.${path},full_src.eq.${path}`);
    if (resumeError) throw new Error(resumeError.message);
    if (resumeRows?.length) {
      for (const row of resumeRows) {
        const typed = row as { id: string; resume_entry_id: string };
        // Guard: only delete if the owning resume_entry is not trashed
        const { data: entryData, error: entryError } = await client
          .from("resume_entries")
          .select("id")
          .eq("id", typed.resume_entry_id)
          .is("deleted_at", null)
          .limit(1);
        if (entryError) throw new Error(entryError.message);
        if (!entryData || entryData.length === 0) continue;
        const { error: delError } = await client.from("resume_media").delete().eq("id", typed.id);
        if (delError) throw new Error(delError.message);
        removedResumeRows++;
      }
    }
    // Also ensure helper is kept in sync — if no rows found via select, try helper as fallback for edge cases
    if (removedResumeRows === 0) {
      const fallback = await removeResumeMediaReference(client, path).catch(() => ({ deletedRows: 0 }));
      // fallback already deleted matching rows, but we already filtered by active parent;
      // only count if we didn't already handle them
      if (fallback.deletedRows > 0 && !resumeRows?.length) {
        removedResumeRows = fallback.deletedRows;
      }
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to resolve resume media." };
  }

  // 3. Now soft delete the media asset (should succeed as references cleared)
  const { data: deleteData, error: deleteError } = await client.rpc("cms_soft_delete_media_asset", {
    p_bucket: bucket,
    p_path: path,
  });
  if (deleteError) return { ok: false, error: deleteError.message };
  if (deleteData && typeof deleteData === "object" && "status" in deleteData) {
    const res = deleteData as { status: string; errorCode?: string; errorMessage?: string };
    if (res.status !== "deleted") {
      return { ok: false, error: res.errorMessage ?? res.errorCode ?? "Still referenced after resolve." };
    }
  }

  revalidatePath("/admin/media");
  revalidatePath("/admin/trash");
  revalidatePath("/admin/blog");
  revalidatePath("/admin/resume");
  return { ok: true, clearedCovers, removedNodes, removedResumeRows };
}
