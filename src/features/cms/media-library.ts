import type { SupabaseClient } from "@supabase/supabase-js";

import type { MediaBucket } from "./media";

/**
 * Media asset catalog view model (#102). One row per stored object, carrying
 * editable title/alt plus upload-time dimensions. The admin grid and the
 * shared picker modal both read from here instead of listing Storage directly.
 *
 * This module is client-safe (no `next/headers`, no server client): it only
 * defines types, URL helpers, and the pure client-injected query core. The
 * getServerClient-backed `listMediaAssets` wrapper lives in
 * media-library-server.ts.
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
  updatedAt: string;
  url: string;
}

interface MediaAssetRow {
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
}

/** Shared page/cursor query result. */
export interface MediaAssetPage {
  items: MediaAsset[];
  /** Total matching rows for the page-mode callers (admin grid). */
  total: number;
}

/** Keyset pagination result for infinite scroll (picker modal). */
export interface MediaAssetCursorPage {
  items: MediaAsset[];
  /** Opaque next-page cursor; null when there are no more rows. */
  nextCursor: string | null;
}

export interface ListMediaAssetsBase {
  bucket: MediaBucket;
  /** Optional filename/title substring filter (case-insensitive). */
  search?: string;
  /** Optional locale alt/title preference for alt text (en | vi). */
  locale?: "en" | "vi";
  pageSize?: number;
}

export interface ListMediaAssetsPageRequest extends ListMediaAssetsBase {
  mode: "page";
  page: number;
}

export interface ListMediaAssetsCursorRequest extends ListMediaAssetsBase {
  mode: "cursor";
  /** Keyset cursor: `createdAt\u0000path` of the last returned row. */
  cursor?: string;
}

export type ListMediaAssetsRequest =
  | ListMediaAssetsPageRequest
  | ListMediaAssetsCursorRequest;

export interface ListMediaAssetsResult {
  items: MediaAsset[];
  total?: number;
  nextCursor?: string | null;
}

export function getMediaUrl(bucket: MediaBucket, path: string): string {
  if (bucket === "resume-media") {
    return `/api/resume-media/${encodeURIComponent(path)}`;
  }
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${bucket}/${encodeURIComponent(path)}`;
}

function toMediaAsset(row: MediaAssetRow): MediaAsset {
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

/**
 * Shared catalog read used by BOTH the management grid (mode "page", offset
 * pagination) and the picker modal (mode "cursor", keyset pagination). One
 * query function keeps ordering, search, and field mapping in a single place.
 * Accepts any Supabase-style client so it is testable against local Supabase.
 *
 * Orders by (created_at desc, path desc) — path is the stable tiebreak for
 * keyset pagination even when several rows share a timestamp.
 */
export async function listMediaAssetsCore(
  client: SupabaseClient,
  request: ListMediaAssetsRequest,
): Promise<ListMediaAssetsResult> {
  const pageSize = Math.min(request.pageSize ?? 24, 100);

  let query = client
    .from("media_assets")
    .select(
      "bucket, path, title, alt_en, alt_vi, width, height, size_bytes, mime, created_at, updated_at",
      { count: "exact" },
    )
    .eq("bucket", request.bucket);

  if (request.search && request.search.trim() !== "") {
    const term = `%${request.search.trim()}%`;
    query = query.or(`path.ilike.${term},title.ilike.${term}`);
  }

  if (request.mode === "cursor") {
    if (request.cursor) {
      // Composite keyset: (created_at desc, path desc). The cursor encodes the
      // previous row's created_at + path; fetch rows strictly after it.
      const sep = request.cursor.indexOf("\u0000");
      if (sep === -1) return { items: [], nextCursor: null };
      const cursorCreatedAt = request.cursor.slice(0, sep);
      const cursorPath = request.cursor.slice(sep + 1);
      query = query.or(
        `and(created_at.lt.${cursorCreatedAt},path.lte.zz),and(created_at.eq.${cursorCreatedAt},path.lt.${cursorPath})`,
      );
    }
    query = query.order("created_at", { ascending: false }).order("path", { ascending: false }).limit(pageSize + 1);
    const { data, error } = await query;
    if (error || !data) return { items: [] };

    const rows = data as unknown as MediaAssetRow[];
    const hasMore = rows.length > pageSize;
    const pageRows = hasMore ? rows.slice(0, pageSize) : rows;
    const last = pageRows[pageRows.length - 1];

    return {
      items: pageRows.map(toMediaAsset),
      nextCursor: hasMore && last ? `${last.created_at}\u0000${last.path}` : null,
    };
  }

  // Page mode: offset pagination with a total count.
  const from = Math.max(0, (request.page - 1) * pageSize);
  query = query
    .order("created_at", { ascending: false })
    .order("path", { ascending: false })
    .range(from, from + pageSize - 1);

  const { data, error, count } = await query;
  if (error || !data) return { items: [], total: 0 };

  return { items: (data as unknown as MediaAssetRow[]).map(toMediaAsset), total: count ?? 0 };
}