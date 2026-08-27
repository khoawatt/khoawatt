"use server";

import { revalidatePath } from "next/cache";

import { getServerClient, isAdminUser } from "./session";
import { listMediaAssets } from "./media-library-server";
import { getMediaUrl, type MediaAsset } from "./media-library";
import { readImageDimensions } from "./image-dimensions";
import type { MediaBucket } from "./media";

export interface MediaUploadResult {
  ok: boolean;
  error?: string;
  warning?: string;
  path?: string;
  publicUrl?: string;
}

export interface MediaUploadInput {
  bucket: MediaBucket;
  file: File;
  /** Optional human title; defaults to a cleaned filename. */
  title?: string;
  /** Optional locale alt text captured at upload time. */
  altEn?: string;
  altVi?: string;
}

export interface MediaUpdateInput {
  bucket: MediaBucket;
  path: string;
  title: string;
  altEn: string;
  altVi: string;
}

export interface MediaUpdateResult {
  ok: boolean;
  error?: string;
}

function isAllowedMime(mime: string): boolean {
  return ["image/jpeg", "image/png", "image/webp"].includes(mime);
}

function sanitizeFilename(filename: string): string {
  const base = filename.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
  return base.replace(/^-+|-+$/g, "");
}

function titleFromFilename(filename: string): string {
  return filename
    .replace(/\.[^.]+$/, "")
    .replace(/^\d+-/, "")
    .replace(/[-_]+/g, " ")
    .trim();
}

/**
 * Upload an image to a media bucket and record its catalog row. Runs through
 * the authenticated owner-session server client (getServerClient), so Storage
 * RLS (private.is_owner()) authorizes the operation — matching the accepted
 * #18 design where admin/browser writes use the owner RLS path. Dimensions are
 * parsed from the file header (PNG/JPEG/WebP) so the catalog carries real
 * width/height for layout without layout shift.
 *
 * Supports both the new object signature `uploadMedia({bucket,file,title,altEn,altVi})`
 * and the legacy `uploadMedia(bucket,file,meta)` used by demo/21bec74's
 * MediaLibraryGrid/MediaUploadPanel for backwards compatibility.
 */
export async function uploadMedia(
  bucketOrInput: MediaBucket | MediaUploadInput,
  file?: File,
  meta?: MediaUploadMeta,
): Promise<MediaUploadResult> {
  const input: MediaUploadInput =
    typeof bucketOrInput === "string"
      ? {
          bucket: bucketOrInput as MediaBucket,
          file: file as File,
          title: meta?.title,
          altEn: meta?.altEn,
          altVi: meta?.altVi,
        }
      : (bucketOrInput as MediaUploadInput);

  if (!input.file) return { ok: false, error: "No file provided." };
  if (!(await isAdminUser())) return { ok: false, error: "Unauthorized." };

  if (!isAllowedMime(input.file.type)) {
    return { ok: false, error: "Only JPEG, PNG, or WebP images are allowed." };
  }
  if (input.file.size > 10 * 1024 * 1024) {
    return { ok: false, error: "Image must be 10 MB or smaller." };
  }

  const client = await getServerClient();

  const ext = input.file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const base = sanitizeFilename(input.file.name.replace(/\.[^.]+$/, ""));
  const path = `${Date.now()}-${base}.${ext}`;

  const arrayBuffer = await input.file.arrayBuffer();
  const dimensions = readImageDimensions(arrayBuffer);
  const { error } = await client.storage.from(input.bucket).upload(path, arrayBuffer, {
    contentType: input.file.type,
    cacheControl: "3600",
    upsert: false,
  });
  if (error) return { ok: false, error: error.message };

  const publicUrl = getMediaUrl(input.bucket, path);

  // Catalog row: title defaults to the filename, alt text defaults to title.
  const title = (input.title ?? titleFromFilename(input.file.name)).trim() || path;
  const { error: catalogError } = await client.from("media_assets").upsert(
    {
      bucket: input.bucket,
      path,
      title,
      alt_en: input.altEn?.trim() ?? "",
      alt_vi: input.altVi?.trim() ?? "",
      width: dimensions?.width ?? null,
      height: dimensions?.height ?? null,
      size_bytes: input.file.size,
      mime: input.file.type,
    },
    { onConflict: "bucket,path" },
  );
  if (catalogError) {
    // The object is uploaded but the catalog write failed. Surface the error
    // so the operator knows the metadata is missing; the object itself remains
    // in Storage (a re-upload would duplicate it, so we do NOT roll back here).
    return { ok: false, error: `Uploaded but could not index metadata: ${catalogError.message}` };
  }

  revalidatePath("/admin/media");
  return { ok: true, path, publicUrl };
}

/** Edit catalog metadata (title / locale alt) for an existing object. */
export async function updateMediaAsset(
  input: MediaUpdateInput,
): Promise<MediaUpdateResult> {
  if (!(await isAdminUser())) return { ok: false, error: "Unauthorized." };

  const title = input.title.trim();
  if (!title) return { ok: false, error: "Title is required." };

  const client = await getServerClient();
  const { error } = await client
    .from("media_assets")
    .update({
      title,
      alt_en: input.altEn.trim(),
      alt_vi: input.altVi.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq("bucket", input.bucket)
    .eq("path", input.path);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/media");
  return { ok: true };
}

/** Fetch a single catalog row for the admin edit grid. */
export async function getMediaAsset(
  bucket: MediaBucket,
  path: string,
): Promise<MediaAsset | null> {
  const client = await getServerClient();
  const { data, error } = await client
    .from("media_assets")
    .select(
      "bucket, path, title, alt_en, alt_vi, width, height, size_bytes, mime, created_at, updated_at",
    )
    .eq("bucket", bucket)
    .eq("path", path)
    .maybeSingle();
  if (error || !data) return null;

  const row = data as unknown as {
    bucket: MediaBucket;
    path: string;
    title: string;
    alt_en: string;
    alt_vi: string;
    width: number | null;
    height: number | null;
    size_bytes: number | null;
    mime: string | null;
    created_at: string;
    updated_at: string;
  };
  return {
    bucket: row.bucket,
    path: row.path,
    title: row.title,
    altEn: row.alt_en,
    altVi: row.alt_vi,
    width: row.width,
    height: row.height,
    sizeBytes: row.size_bytes,
    mime: row.mime,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    url: getMediaUrl(row.bucket, row.path),
  };
}

// ---------------------------------------------------------------------------
// Compatibility for demo/21bec74's MediaLibraryGrid (old API) — keep while
// both the new MediaPickerModal (new API) and the demo grid (old API) coexist.
// ---------------------------------------------------------------------------

export interface MediaUploadMeta {
  title: string;
  altEn: string;
  altVi: string;
}

/** Old signature: uploadMedia(bucket, file, meta) — delegate to new input object. */
export async function deleteMedia(
  bucket: MediaBucket,
  path: string,
): Promise<MediaUpdateResult> {
  if (!(await isAdminUser())) return { ok: false, error: "Unauthorized." };
  const client = await getServerClient();
  const { error } = await client.storage.from(bucket).remove([path]);
  if (error) return { ok: false, error: error.message };
  await client.from("media_assets").delete().eq("bucket", bucket).eq("path", path);
  revalidatePath("/admin/media");
  return { ok: true };
}

export async function updateMediaDetails(
  bucket: MediaBucket,
  path: string,
  meta: MediaUploadMeta,
): Promise<MediaUpdateResult> {
  return updateMediaAsset({ bucket, path, title: meta.title, altEn: meta.altEn, altVi: meta.altVi });
}

/**
 * Server action used by the client MediaPickerModal to page/search the catalog
 * (keyset cursor mode). Runs through the owner-session client.
 */
export async function listMediaAssetsAction(
  request: Parameters<typeof listMediaAssets>[0],
): Promise<Awaited<ReturnType<typeof listMediaAssets>>> {
  if (!(await isAdminUser())) return { items: [], nextCursor: null };
  return listMediaAssets(request);
}