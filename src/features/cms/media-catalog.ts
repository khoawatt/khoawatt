import type { SupabaseClient } from "@supabase/supabase-js";

import type { MediaBucket } from "./media";

/**
 * Admin catalog over Storage objects (#102). The rows live in public.media_assets
 * and power listing/search/pagination for the media library surfaces; the
 * bytes stay in Storage and are addressed by (bucket, path).
 *
 * Query functions take the client as a parameter so tests can drive them with
 * a service-role client against local Supabase; production callers pass the
 * owner-session client from features/cms/session.
 */

export interface MediaAsset {
  bucket: MediaBucket;
  path: string;
  title: string;
  altEn: string;
  altVi: string;
  width: number | null;
  height: number | null;
  sizeBytes: number | null;
  mime: string | null;
  createdAt: string;
}

export interface MediaAssetRow {
  bucket: string;
  path: string;
  title: string;
  alt_en: string;
  alt_vi: string;
  width: number | null;
  height: number | null;
  size_bytes: number | null;
  mime: string | null;
  created_at: string;
}

export interface PageQuery {
  mode: "page";
  page: number;
}

export interface CursorQuery {
  mode: "cursor";
  /** Keyset position: everything strictly older than this pair. */
  createdAt: string;
  path: string;
}

export interface ListMediaAssetsParams {
  bucket: MediaBucket;
  cursor?: CursorQuery;
  limit?: number;
  query?: string;
  page?: PageQuery;
}

export interface ListMediaAssetsResult {
  items: MediaAsset[];
  /** Cursor to pass back for the next batch (cursor mode only). */
  nextCursor?: CursorQuery;
  /** Totals for pagination UI (page mode only). */
  total?: number;
  totalPages?: number;
}

/** Escape LIKE wildcards so search input cannot broaden the match. */
export function escapeLike(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
}

function mapRow(row: MediaAssetRow): MediaAsset {
  return {
    altEn: row.alt_en,
    altVi: row.alt_vi,
    bucket: row.bucket as MediaBucket,
    createdAt: row.created_at,
    height: row.height,
    mime: row.mime,
    path: row.path,
    sizeBytes: row.size_bytes,
    title: row.title,
    width: row.width,
  };
}

function titleFromPath(path: string): string {
  return path
    .replace(/\.[^.]+$/, "")
    .replace(/^\d+-/, "")
    .replace(/[-_]+/g, " ")
    .trim();
}

export async function upsertMediaAsset(
  client: SupabaseClient,
  asset: {
    altEn?: string;
    altVi?: string;
    bucket: MediaBucket;
    height?: number | null;
    mime?: string | null;
    path: string;
    sizeBytes?: number | null;
    title?: string;
    width?: number | null;
  },
): Promise<void> {
  const { error } = await client.from("media_assets").upsert(
    {
      alt_en: asset.altEn ?? "",
      alt_vi: asset.altVi ?? "",
      bucket: asset.bucket,
      height: asset.height ?? null,
      mime: asset.mime ?? null,
      path: asset.path,
      size_bytes: asset.sizeBytes ?? null,
      title: asset.title?.trim() || titleFromPath(asset.path),
      width: asset.width ?? null,
    },
    { onConflict: "bucket,path" },
  );
  if (error) throw new Error(`Catalog write failed: ${error.message}`);
}

export async function deleteMediaAsset(
  client: SupabaseClient,
  bucket: MediaBucket,
  path: string,
): Promise<void> {
  const { error } = await client
    .from("media_assets")
    .delete()
    .eq("bucket", bucket)
    .eq("path", path);
  if (error) throw new Error(`Catalog delete failed: ${error.message}`);
}

export async function updateMediaAssetMeta(
  client: SupabaseClient,
  bucket: MediaBucket,
  path: string,
  meta: { altEn?: string; altVi?: string; title?: string },
): Promise<MediaAsset | null> {
  const patch: Record<string, string> = { updated_at: new Date().toISOString() };
  if (meta.title !== undefined) patch.title = meta.title.trim();
  if (meta.altEn !== undefined) patch.alt_en = meta.altEn;
  if (meta.altVi !== undefined) patch.alt_vi = meta.altVi;

  const { data, error } = await client
    .from("media_assets")
    .update(patch)
    .eq("bucket", bucket)
    .eq("path", path)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(`Catalog update failed: ${error.message}`);
  return data ? mapRow(data as MediaAssetRow) : null;
}

export async function listMediaAssets(
  client: SupabaseClient,
  params: ListMediaAssetsParams,
): Promise<ListMediaAssetsResult> {
  const limit = Math.min(Math.max(params.limit ?? 24, 1), 100);

  let request = client
    .from("media_assets")
    .select("*", params.page ? { count: "exact" } : undefined)
    .eq("bucket", params.bucket)
    .is("deleted_at", null);

  if (params.query) {
    const safe = escapeLike(params.query.trim());
    if (safe) {
      request = request.or(`title.ilike.%${safe}%,path.ilike.%${safe}%`);
    }
  }

  request =
    params.cursor && !params.page
      ? request.or(
          `created_at.lt.${params.cursor.createdAt},and(created_at.eq.${params.cursor.createdAt},path.lt.${params.cursor.path})`,
        )
      : request;

  if (params.page) {
    const from = (params.page.page - 1) * limit;
    request = request.range(from, from + limit - 1);
  }

  const { data, error, count } = await request
    .order("created_at", { ascending: false })
    .order("path", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Catalog list failed: ${error.message}`);

  const items = ((data ?? []) as MediaAssetRow[]).map(mapRow);
  const last = items[items.length - 1];

  const result: ListMediaAssetsResult = { items };

  if (params.page) {
    result.total = count ?? 0;
    result.totalPages = Math.max(1, Math.ceil((count ?? 0) / limit));
  } else if (last) {
    // A full page hints there may be more; an empty next probe is avoided by
    // letting the UI fetch once more and render nothing extra.
    result.nextCursor = { createdAt: last.createdAt, mode: "cursor", path: last.path };
  }

  return result;
}

export interface CoverAltLookup {
  path: string;
  altEn: string;
  altVi: string;
}

/** Batch alt-text lookup for cover paths (public rendering enrichment). */
export async function getCoverAltTexts(
  client: SupabaseClient,
  bucket: MediaBucket,
  paths: string[],
): Promise<Map<string, CoverAltLookup>> {
  const map = new Map<string, CoverAltLookup>();
  if (paths.length === 0) return map;

  const { data, error } = await client
    .from("media_assets")
    .select("path, alt_en, alt_vi")
    .eq("bucket", bucket)
    .in("path", paths);

  if (error || !data) return map;

  for (const row of data as Array<{
    alt_en: string;
    alt_vi: string;
    path: string;
  }>) {
    map.set(row.path, {
      altEn: row.alt_en,
      altVi: row.alt_vi,
      path: row.path,
    });
  }
  return map;
}
