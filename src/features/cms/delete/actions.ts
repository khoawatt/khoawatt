"use server";

import { revalidatePath } from "next/cache";

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

export interface BulkResult {
  requested: number;
  deleted: string[];
  blocked: string[];
  failed: string[];
}

export async function bulkDelete(
  entity: string,
  ids: string[],
): Promise<{ ok: boolean; result?: BulkResult; error?: string }> {
  if (!(await isAdminUser())) return { ok: false, error: "Unauthorized." };
  if (ids.length === 0) return { ok: false, error: "No items selected." };
  if (ids.length > 100) return { ok: false, error: "Too many items (max 100)." };
  const client = await getServerClient();
  const { data, error } = await client.rpc("cms_bulk_soft_delete", {
    p_entity_type: entity,
    p_ids: ids,
  });
  if (error) return { ok: false, error: error.message };
  if (!data || typeof data !== "object") return { ok: false, error: "Bulk delete failed." };
  const res = data as BulkResult;
  // revalidate relevant paths
  revalidatePath("/admin/projects");
  revalidatePath("/admin/blog");
  revalidatePath("/admin/trash");
  revalidatePath("/");
  revalidatePath("/vi");
  return { ok: true, result: res };
}
