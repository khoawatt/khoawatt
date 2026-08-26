"use server";

import { getServerClient, isAdminUser } from "./session";
import {
  listMediaAssets,
  type ListMediaAssetsResult,
} from "./media-catalog";
import type { MediaBucket } from "./media";

/**
 * Server actions backing the media library surfaces (#102). Query logic lives
 * in media-catalog.ts (injectable client, unit-tested); these bind it to the
 * owner-session client and are callable from both server components and the
 * library's client components.
 */

export async function fetchMediaPage(
  bucket: MediaBucket,
  page: number,
  query?: string,
  limit = 24,
): Promise<ListMediaAssetsResult> {
  if (!(await isAdminUser())) return { items: [] };
  const client = await getServerClient();
  if (!client) return { items: [] };
  try {
    return await listMediaAssets(client, {
      bucket,
      limit,
      page: { mode: "page", page },
      query,
    });
  } catch {
    return { items: [] };
  }
}

export async function fetchMediaBatch(
  bucket: MediaBucket,
  cursor?: { createdAt: string; path: string },
  query?: string,
  limit = 24,
): Promise<ListMediaAssetsResult> {
  if (!(await isAdminUser())) return { items: [] };
  const client = await getServerClient();
  if (!client) return { items: [] };
  try {
    return await listMediaAssets(client, {
      bucket,
      cursor: cursor
        ? { createdAt: cursor.createdAt, mode: "cursor", path: cursor.path }
        : undefined,
      limit,
      query,
    });
  } catch {
    return { items: [] };
  }
}
