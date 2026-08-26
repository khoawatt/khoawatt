import "server-only";

import { getServerClient } from "./session";
import {
  listMediaAssetsCore,
  type ListMediaAssetsRequest,
  type ListMediaAssetsResult,
} from "./media-library";

/** Server-action boundary: reads through the owner-session client. */
export async function listMediaAssets(
  request: ListMediaAssetsRequest,
): Promise<ListMediaAssetsResult> {
  const client = await getServerClient();
  return listMediaAssetsCore(client, request);
}