"use server";

import { revalidatePath } from "next/cache";

import { getServerClient, isAdminUser } from "./session";
import type { MediaBucket } from "./media";

export interface MediaUploadResult {
  ok: boolean;
  error?: string;
  path?: string;
  publicUrl?: string;
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
 */
export async function uploadMedia(
  bucket: MediaBucket,
  file: File,
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

  revalidatePath("/admin/media");
  return { ok: true, path, publicUrl };
}