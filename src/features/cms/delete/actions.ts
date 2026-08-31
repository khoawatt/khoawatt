"use server";

import { getServerClient, isAdminUser } from "@/features/cms/session";

export interface InspectResult {
  deletable: string[];
  blocked: string[];
  dependencies: Array<{ entity: string; id: string; field: string; count: number; type: string }>;
}

export async function inspectDelete(
  entity: string,
  ids: string[],
): Promise<{ ok: boolean; result?: InspectResult; error?: string }> {
  if (!(await isAdminUser())) return { ok: false, error: "Unauthorized." };
  const client = await getServerClient();
  const { data, error } = await client.rpc("cms_inspect_delete", {
    p_entity_type: entity,
    p_ids: ids,
  });
  if (error) return { ok: false, error: error.message };
  if (!data || typeof data !== "object") return { ok: false, error: "Inspect failed." };
  const res = data as InspectResult;
  return { ok: true, result: res };
}
