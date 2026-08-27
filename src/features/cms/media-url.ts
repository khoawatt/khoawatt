import type { MediaBucket } from "./media";

/**
 * Public URL for a stored object. Pure string building so both server
 * (features/cms/media.ts) and client components can use it without pulling
 * the server session module into client bundles.
 */
export function publicMediaUrl(bucket: MediaBucket, path: string): string {
  if (bucket === "resume-media") {
    return `/api/resume-media/${encodeURIComponent(path)}`;
  }
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${bucket}/${encodeURIComponent(path)}`;
}
