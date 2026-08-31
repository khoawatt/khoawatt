"use server";

import { revalidatePath } from "next/cache";

import { getServerClient, isAdminUser } from "./session";
import type { MediaBucket } from "./media";
import { imageDimensions } from "./image-dimensions";
import { updateMediaAssetMeta, upsertMediaAsset } from "./media-catalog";

export interface MediaUploadResult {
  ok: boolean;
  error?: string;
  path?: string;
  publicUrl?: string;
  /** Upload succeeded but the metadata row write failed; edit later. */
  warning?: string;
}

export interface MediaDeleteResult {
  ok: boolean;
  error?: string;
}

/** Optional editable metadata supplied alongside a new upload (#102). */
export interface MediaUploadMeta {
  title?: string;
  altEn?: string;
  altVi?: string;
}

function isAllowedMime(mime: string): boolean {
  return ["image/jpeg", "image/png", "image/webp"].includes(mime);
}

function sanitizeFilename(filename: string): string {
  const base = filename.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
  return base.replace(/^-+|-+$/g, "");
}

/**
 * Upload an image to a media bucket. Runs through the authenticated owner-session
 * server client (getServerClient), so Storage RLS (private.is_owner()) authorizes
 * the actual operation — matching the accepted #18 design where admin/browser
 * writes use the normal owner RLS path rather than the service role.
 *
 * After Storage accepts the bytes, dimensions are parsed from the buffer and a
 * media_assets catalog row is written (#102); a failed catalog write degrades
 * to a warning because the file itself is usable.
 */
export async function uploadMedia(
  bucket: MediaBucket,
  file: File,
  meta?: MediaUploadMeta,
): Promise<MediaUploadResult> {
  if (!(await isAdminUser())) return { ok: false, error: "Unauthorized." };

  if (!isAllowedMime(file.type)) {
    return { ok: false, error: "Only JPEG, PNG, or WebP images are allowed." };
  }
  if (file.size > 10 * 1024 * 1024) {
    return { ok: false, error: "Image must be 10 MB or smaller." };
  }

  const client = await getServerClient();

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const base = sanitizeFilename(file.name.replace(/\.[^.]+$/, ""));
  const path = `${Date.now()}-${base}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error } = await client.storage.from(bucket).upload(path, arrayBuffer, {
    contentType: file.type,
    cacheControl: "3600",
    upsert: false,
  });
  if (error) return { ok: false, error: error.message };

  const publicUrl = bucket === "resume-media"
    ? `/api/resume-media/${encodeURIComponent(path)}`
    : client.storage.from(bucket).getPublicUrl(path).data.publicUrl;

  const dimensions = imageDimensions(new Uint8Array(arrayBuffer), file.type);

  let warning: string | undefined;
  try {
    await upsertMediaAsset(client, {
      altEn: meta?.altEn,
      altVi: meta?.altVi,
      bucket,
      height: dimensions?.height ?? null,
      mime: file.type,
      path,
      sizeBytes: file.size,
      title: meta?.title,
      width: dimensions?.width ?? null,
    });
  } catch {
    warning =
      "Uploaded, but saving metadata failed. You can edit this image's details later.";
  }

  revalidatePath("/admin/media");
  return { ok: true, path, publicUrl, warning };
}

export async function deleteMedia(
  bucket: MediaBucket,
  path: string,
): Promise<MediaDeleteResult> {
  if (!(await isAdminUser())) return { ok: false, error: "Unauthorized." };

  const client = await getServerClient();

  const { data, error } = await client.rpc("cms_soft_delete_media_asset", {
    p_bucket: bucket,
    p_path: path,
  });
  if (error) return { ok: false, error: error.message };
  if (data && typeof data === "object" && "status" in data) {
    const res = data as { status: string; errorCode?: string; errorMessage?: string; dependencyCount?: number };
    if (res.status === "blocked") {
      return {
        ok: false,
        error: res.errorMessage ?? `Cannot delete: still referenced by ${res.dependencyCount ?? 0} item(s).`,
      };
    }
    if (res.status !== "deleted") {
      return { ok: false, error: res.errorMessage ?? res.errorCode ?? "Delete failed." };
    }
  }

  revalidatePath("/");
  revalidatePath("/vi");
  revalidatePath("/admin/media");
  revalidatePath("/admin/trash");
  return { ok: true };
}

export interface MediaDetailsResult {
  ok: boolean;
  error?: string;
}

/** Editable metadata for one asset (#102) — title + bilingual alt text. */
export async function updateMediaDetails(
  bucket: MediaBucket,
  path: string,
  meta: { altEn: string; altVi: string; title: string },
): Promise<MediaDetailsResult> {
  if (!(await isAdminUser())) return { ok: false, error: "Unauthorized." };
  if (!meta.title.trim()) {
    return { ok: false, error: "Title is required." };
  }

  const client = await getServerClient();
  try {
    await updateMediaAssetMeta(client, bucket, path, meta);
  } catch {
    return { ok: false, error: "Could not save the media details. Retry shortly." };
  }

  revalidatePath("/admin/media");
  return { ok: true };
}