"use server";

import { revalidatePath } from "next/cache";

import { getServerClient, isAdminUser } from "@/features/cms/session";

export interface TrashActionResult {
  ok: boolean;
  error?: string;
}

export async function restoreEntity(entity: string, id: string): Promise<TrashActionResult> {
  if (!(await isAdminUser())) return { ok: false, error: "Unauthorized." };
  const client = await getServerClient();

  if (entity === "media_asset") {
    const [bucket, ...rest] = id.split(":");
    const path = rest.join(":");
    const { data, error } = await client.rpc("cms_restore_media_asset", { p_bucket: bucket, p_path: path });
    if (error) return { ok: false, error: error.message };
    if (data && typeof data === "object" && "status" in data) {
      const res = data as { status: string; errorCode?: string; errorMessage?: string };
      if (res.status !== "deleted") return { ok: false, error: res.errorMessage ?? res.errorCode ?? "Restore failed." };
    }
  } else {
    const { data, error } = await client.rpc("cms_restore_entity", { p_entity_type: entity, p_id: id });
    if (error) return { ok: false, error: error.message };
    if (data && typeof data === "object" && "status" in data) {
      const res = data as { status: string; errorCode?: string; errorMessage?: string };
      if (res.status !== "deleted") return { ok: false, error: res.errorMessage ?? res.errorCode ?? "Restore failed." };
    }
  }

  revalidatePath("/admin/trash");
  revalidatePath("/admin/projects");
  revalidatePath("/admin/blog");
  revalidatePath("/admin/resume");
  revalidatePath("/admin/skills");
  revalidatePath("/admin/social");
  revalidatePath("/");
  revalidatePath("/vi");
  return { ok: true };
}

export async function hardDeleteEntity(entity: string, id: string): Promise<TrashActionResult> {
  if (!(await isAdminUser())) return { ok: false, error: "Unauthorized." };
  const client = await getServerClient();

  const { data, error } = await client.rpc("cms_hard_delete_entity", { p_entity_type: entity, p_id: id });
  if (error) return { ok: false, error: error.message };
  if (data && typeof data === "object" && "status" in data) {
    const res = data as { status: string; errorCode?: string; errorMessage?: string };
    if (res.status !== "deleted") return { ok: false, error: res.errorMessage ?? res.errorCode ?? "Cannot permanently delete yet (30 days retention) or not found." };
  }

  revalidatePath("/admin/trash");
  return { ok: true };
}

export async function forceHardDeleteEntity(entity: string, id: string): Promise<TrashActionResult> {
  if (!(await isAdminUser())) return { ok: false, error: "Unauthorized." };
  const client = await getServerClient();

  if (entity === "media_asset") {
    const [bucket, ...rest] = id.split(":");
    const path = rest.join(":");
    const { data, error } = await client.rpc("cms_force_hard_delete_media_asset", { p_bucket: bucket, p_path: path });
    if (error) return { ok: false, error: error.message };
    if (data && typeof data === "object" && "status" in data) {
      const res = data as { status: string; errorCode?: string; errorMessage?: string };
      if (res.status !== "deleted") return { ok: false, error: res.errorMessage ?? res.errorCode ?? "Force delete failed." };
    }
  } else {
    const { data, error } = await client.rpc("cms_force_hard_delete_entity", { p_entity_type: entity, p_id: id });
    if (error) return { ok: false, error: error.message };
    if (data && typeof data === "object" && "status" in data) {
      const res = data as { status: string; errorCode?: string; errorMessage?: string };
      if (res.status !== "deleted") return { ok: false, error: res.errorMessage ?? res.errorCode ?? "Force delete failed." };
    }
  }

  revalidatePath("/admin/trash");
  return { ok: true };
}
