"use server";

import { revalidatePath } from "next/cache";

import { getServerClient, isAdminUser } from "@/features/cms/session";

export interface ResumeMediaActionResult {
  ok: boolean;
  error?: string;
}

interface UpsertMediaData {
  entryId: string;
  path: string; // storage path like "123-foo.jpg" or "codeforces.jpg"
  altEn: string;
  altVi: string;
  captionEn?: string;
  captionVi?: string;
}

/**
 * Create a resume_media row from a picked media_asset.
 * Uses the same file for thumbnail and full, served via /api/resume-media/.
 * Width/height are looked up from media_assets if available.
 */
export async function addResumeMedia(data: UpsertMediaData): Promise<ResumeMediaActionResult> {
  if (!(await isAdminUser())) return { ok: false, error: "Unauthorized." };
  const client = await getServerClient();
  if (!data.entryId || !data.path) return { ok: false, error: "Missing entry or file." };
  if (!data.altEn.trim() || !data.altVi.trim()) return { ok: false, error: "Alt text EN/VI required." };

  // Derive a stable media id from entry + file (avoid collisions)
  const base = data.path.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase();
  const id = `${data.entryId}-${base}`.slice(0, 80);

  const thumb = `/api/resume-media/${encodeURIComponent(data.path)}`;
  const full = `/api/resume-media/${encodeURIComponent(data.path)}`;

  // Try to get dimensions from media_assets
  let width: number | null = null;
  let height: number | null = null;
  try {
    const { data: asset } = await client.from("media_assets").select("width, height").eq("bucket", "resume-media").eq("path", data.path).maybeSingle();
    if (asset) {
      width = (asset as { width: number | null }).width ?? null;
      height = (asset as { height: number | null }).height ?? null;
    }
  } catch {
    // ignore
  }

  const { error } = await client.from("resume_media").upsert(
    {
      id,
      resume_entry_id: data.entryId,
      thumbnail_src: thumb,
      full_src: full,
      width,
      height,
    },
    { onConflict: "id" },
  );
  if (error) return { ok: false, error: error.message };

  const { error: transError } = await client.from("resume_media_translations").upsert(
    [
      { resume_media_id: id, locale: "en", alt: data.altEn.trim(), caption: data.captionEn?.trim() || null },
      { resume_media_id: id, locale: "vi", alt: data.altVi.trim(), caption: data.captionVi?.trim() || null },
    ],
    { onConflict: "resume_media_id,locale" },
  );
  if (transError) return { ok: false, error: transError.message };

  revalidatePath("/");
  revalidatePath("/vi");
  revalidatePath("/admin/resume");
  return { ok: true };
}

export async function updateResumeMedia(data: {
  id: string;
  altEn: string;
  altVi: string;
  captionEn?: string;
  captionVi?: string;
}): Promise<ResumeMediaActionResult> {
  if (!(await isAdminUser())) return { ok: false, error: "Unauthorized." };
  if (!data.id) return { ok: false, error: "Missing id." };
  const client = await getServerClient();
  const { error: enErr } = await client.from("resume_media_translations").update({ alt: data.altEn.trim(), caption: data.captionEn?.trim() || null }).eq("resume_media_id", data.id).eq("locale", "en");
  if (enErr) return { ok: false, error: enErr.message };
  const { error: viErr } = await client.from("resume_media_translations").update({ alt: data.altVi.trim(), caption: data.captionVi?.trim() || null }).eq("resume_media_id", data.id).eq("locale", "vi");
  if (viErr) return { ok: false, error: viErr.message };
  revalidatePath("/");
  revalidatePath("/vi");
  revalidatePath("/admin/resume");
  return { ok: true };
}

export async function deleteResumeMedia(id: string): Promise<ResumeMediaActionResult> {
  if (!(await isAdminUser())) return { ok: false, error: "Unauthorized." };
  const client = await getServerClient();
  const { error } = await client.from("resume_media").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/");
  revalidatePath("/vi");
  revalidatePath("/admin/resume");
  return { ok: true };
}
