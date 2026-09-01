import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Remove resume_media rows that reference the given path via thumbnail_src or full_src.
 * Exact match (not substring/ILIKE) — the caller has already verified the path is the
 * stored object path, and the DB check in cms_soft_delete_media_asset uses ilike for
 * candidate but this authoritative delete uses exact eq.
 */
export async function removeResumeMediaReference(
  client: SupabaseClient,
  path: string,
): Promise<{ deletedRows: number }> {
  const { data, error } = await client
    .from("resume_media")
    .delete()
    .or(`thumbnail_src.eq.${path},full_src.eq.${path}`)
    .select("id");
  if (error) throw new Error(error.message);
  return { deletedRows: data?.length ?? 0 };
}

/**
 * Precise removal of embedded image nodes containing a given path.
 * This is the authoritative parser step for P4 — candidate ILIKE is not used for mutation.
 * Supports:
 *  - Markdown image: ![alt](path) or ![alt](path "title")
 *  - HTML img: <img src="path" ...> or <img src='path' ...>
 *
 * It removes the entire image node, not just the URL substring, and preserves surrounding content.
 * Generic replace(path, "") is forbidden.
 */

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Remove markdown image nodes where url === path (exact match, trimmed).
 * Returns { cleaned, removedCount }.
 */
export function removeMarkdownImageNodes(contentMd: string, path: string): { cleaned: string; removedCount: number } {
  let removedCount = 0;
  const escaped = escapeRegExp(path);

  // Markdown image: ![alt](path) or ![alt](path "title") — allow spaces, optional title
  // We match the whole image syntax and remove it, including preceding newline if it's a block image line
  const mdImageRegex = new RegExp(`!\\[[^\\]]*\\]\\(\\s*${escaped}(?:\\s+\"[^\"]*\"|\\s+'[^']*'|\\s+\\([^)]*\\))?\\s*\\)`, "g");

  let cleaned = contentMd.replace(mdImageRegex, () => {
    removedCount++;
    return "";
  });

  // HTML img: <img ... src="path" ...> or src='path'
  const htmlImgRegex = new RegExp(`<img[^>]*src\\s*=\\s*(?:\"${escaped}\"|'${escaped}')[^>]*>`, "gi");
  cleaned = cleaned.replace(htmlImgRegex, () => {
    removedCount++;
    return "";
  });

  // Clean up artifacts: multiple blank lines left by removed block images
  // Collapse 3+ newlines to 2, and remove lines that are now empty but had only the image
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
  // Remove empty image markdown leftovers like ![]( ) or ![]()
  cleaned = cleaned.replace(/!\[\s*\]\(\s*\)/g, "");

  return { cleaned, removedCount };
}

/**
 * For a given bucket path, return whether contentMd contains an exact image node for that path.
 * Used to verify candidate vs authoritative.
 */
export function hasExactImageNode(contentMd: string, path: string): boolean {
  const { removedCount } = removeMarkdownImageNodes(contentMd, path);
  return removedCount > 0;
}
