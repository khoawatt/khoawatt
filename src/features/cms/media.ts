import type { SupabaseClient } from "@supabase/supabase-js";
import { getServerClient } from "./session";
import { publicMediaUrl } from "./media-url";

export type MediaBucket = "resume-media" | "project-media" | "portfolio" | "blog-media";

export interface StoredObject {
  name: string;
  id: string;
  metadata?: { size?: number };
  created_at?: string;
}

/**
 * Server-side read of a storage bucket's objects for the admin page. Uses the
 * authenticated owner-session server client so Storage RLS (private.is_owner())
 * authorizes the read, matching the accepted #18 design (no service-role on the
 * admin path). The admin page is gated by isAdminUser() at the layout boundary.
 */
export async function listBucketObjects(
  bucket: MediaBucket,
): Promise<StoredObject[]> {
  const client = await getServerClient();

  const { data, error } = await client.storage.from(bucket).list();
  if (error || !data) return [];

  return data as StoredObject[];
}

export function getMediaPublicUrl(bucket: MediaBucket, path: string): string {
  return publicMediaUrl(bucket, path);
}

/** Escape LIKE wildcards so a stored path can never broaden the reference match. */
function escapeLike(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
}

/**
 * Count how many published CMS media rows reference a stored object. Deletion
 * is blocked while referenced to satisfy Issue #21's reference/orphan criterion.
 * Accepts any Supabase-style client so it is testable against local Supabase.
 *
 * Fail-closed: if the reference query itself errors, this throws so the caller
 * cannot treat an unknown reference state as "safe to delete".
 */
export async function findMediaReferences(
  client: SupabaseClient,
  bucket: MediaBucket,
  path: string,
): Promise<number> {
  const safePath = escapeLike(path);

  if (bucket === "project-media") {
    const { data, error } = await client
      .from("project_media")
      .select("id")
      .or(`src.ilike.%${safePath}%`);
    if (error) throw new Error(`Reference check failed: ${error.message}`);
    return data?.length ?? 0;
  }
  if (bucket === "resume-media") {
    const { data, error } = await client
      .from("resume_media")
      .select("id")
      .or(`thumbnail_src.ilike.%${safePath}%,full_src.ilike.%${safePath}%`);
    if (error) throw new Error(`Reference check failed: ${error.message}`);
    return data?.length ?? 0;
  }
  return 0;
}