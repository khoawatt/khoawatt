"use server";

import { revalidatePath, updateTag } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";

import { BLOG_CACHE_TAG } from "@/features/blog/cache-tag";
import type { MediaBucket } from "./media";
import { getServerClient, isAdminUser } from "./session";

/**
 * Unified hard-delete pipeline (#104).
 *
 * Every destructive operation goes through this single path:
 *   authz → analyze (impact) → execute (transactional RPC per item) →
 *   storage cleanup → append-only audit → cache revalidation.
 *
 * Bulk deletes allow partial success: each item is independent, successful
 * deletions stay committed, and the result reports {deleted, failed[]}.
 * The client-facing analyze step is advisory; the delete action re-analyzes
 * server-side so a stale dialog can never bypass a block.
 *
 * The pipeline core takes the client as a parameter so tests can drive it with
 * a service-role client; production callers pass the owner-session client.
 */

export type DeleteEntity =
  | "blog-post"
  | "blog-category"
  | "blog-tag"
  | "media";

export interface ImpactItem {
  id: string;
  dependent: number;
  external: number;
  blocked: string | null;
  /** Storage paths to remove after the DB rows are gone. */
  resources: string[];
}

export interface ImpactReport {
  items: ImpactItem[];
  totalDependent: number;
  totalExternal: number;
  blockedCount: number;
}

export interface AnalyzeRequest {
  entity: DeleteEntity;
  ids: string[];
}

export interface DeleteRequest {
  entity: DeleteEntity;
  ids: string[];
  /** Required for "media" — which bucket the paths belong to. */
  bucket?: MediaBucket;
}

export interface DeleteResult {
  deleted: number;
  failed: Array<{ id: string; reason: string }>;
}

type DbClient = SupabaseClient;

const ANALYZE_RPC: Record<DeleteEntity, string> = {
  "blog-category": "cms_analyze_delete_blog_category",
  "blog-post": "cms_analyze_delete_blog_post",
  "blog-tag": "cms_analyze_delete_blog_tag",
  "media": "cms_analyze_delete_media",
};

const AUDIT_ENTITY: Record<DeleteEntity, string> = {
  "blog-category": "blog_category",
  "blog-post": "blog_post",
  "blog-tag": "blog_tag",
  "media": "media",
};

const DELETE_RPC: Record<DeleteEntity, string> = {
  "blog-category": "cms_delete_blog_category",
  "blog-post": "cms_delete_blog_post",
  "blog-tag": "cms_delete_blog_tag",
  "media": "", // handled directly (storage + catalog), never via RPC
};

/** PostgREST matches RPC arguments by parameter name. */
const ANALYZE_ARG: Record<DeleteEntity, string> = {
  "blog-category": "p_ids",
  "blog-post": "p_ids",
  "blog-tag": "p_ids",
  "media": "p_paths",
};

async function runAnalyze(
  client: DbClient,
  entity: DeleteEntity,
  ids: string[],
): Promise<ImpactReport> {
  if (ids.length === 0) {
    return { items: [], totalDependent: 0, totalExternal: 0, blockedCount: 0 };
  }
  const { data, error } = await client.rpc(ANALYZE_RPC[entity], {
    [ANALYZE_ARG[entity]]: ids,
  });
  if (error) {
    throw new Error(`Impact analysis failed: ${error.message}`);
  }
  return data as ImpactReport;
}

/** Core analysis — exportable for tests with an injected client. */
export async function analyzeDeleteCore(
  client: DbClient,
  request: AnalyzeRequest,
): Promise<ImpactReport> {
  return runAnalyze(client, request.entity, request.ids);
}

export async function analyzeDelete(
  request: AnalyzeRequest,
): Promise<ImpactReport> {
  if (!(await isAdminUser())) {
    throw new Error("Unauthorized.");
  }
  const client = await getServerClient();
  if (!client) throw new Error("No database session.");
  return analyzeDeleteCore(client, request);
}

/**
 * Execute the delete pipeline. Callers must surface the impact summary to the
 * user first; this action re-analyzes before touching anything.
 */
export async function deleteEntities(
  request: DeleteRequest,
): Promise<DeleteResult> {
  if (!(await isAdminUser())) {
    return { deleted: 0, failed: request.ids.map((id) => ({ id, reason: "Unauthorized." })) };
  }

  const client = await getServerClient();
  if (!client) {
    return { deleted: 0, failed: request.ids.map((id) => ({ id, reason: "No database session." })) };
  }

  const { data: auth } = await client.auth.getUser();
  const deletedBy = auth.user?.id ?? null;

  const result = await deleteEntitiesCore(client, deletedBy, request);

  // Cache invalidation must run inside the request context (server action),
  // never from the testable core.
  revalidatePaths();

  return result;
}

/** Core pipeline — exportable for tests with an injected client + operator id. */
export async function deleteEntitiesCore(
  client: DbClient,
  deletedBy: string | null,
  request: DeleteRequest,
): Promise<DeleteResult> {
  // Server-side re-analysis: never trust a stale dialog.
  let report: ImpactReport;
  try {
    report = await runAnalyze(client, request.entity, request.ids);
  } catch {
    return { deleted: 0, failed: request.ids.map((id) => ({ id, reason: "Could not analyze impact." })) };
  }

  const deleted: string[] = [];
  const failed: DeleteResult["failed"] = [];
  const cleanups: Array<{ bucket: MediaBucket; path: string }> = [];

  for (const item of report.items) {
    if (item.blocked) {
      failed.push({ id: item.id, reason: item.blocked });
      await writeAudit(client, deletedBy, request.entity, item, false, item.blocked, []);
      continue;
    }

    let ok = false;
    let reason: string | undefined;
    let resources: string[] = item.resources;

    try {
      if (request.entity === "media") {
        const bucket = request.bucket ?? "blog-media";
        const remove = await client.storage.from(bucket).remove([item.id]);
        if (remove.error) throw new Error(remove.error.message);
        // Keep the media_assets catalog aligned with Storage.
        await client
          .from("media_assets")
          .delete()
          .eq("bucket", bucket)
          .eq("path", item.id);
        resources = [];
        ok = true;
      } else {
        const rpc = await client.rpc(DELETE_RPC[request.entity], {
          p_id: item.id,
        });
        if (rpc.error) throw new Error(rpc.error.message);
        ok = true;
      }
    } catch (error) {
      reason = error instanceof Error ? error.message : "Delete failed.";
    }

    if (ok) {
      deleted.push(item.id);
      const bucket =
        request.entity === "media"
          ? (request.bucket ?? "blog-media")
          : request.entity === "blog-post"
            ? "blog-media"
            : null;
      if (bucket) {
        for (const path of resources) cleanups.push({ bucket, path });
      }
    } else {
      failed.push({ id: item.id, reason: reason ?? "Delete failed." });
    }

    await writeAudit(client, deletedBy, request.entity, item, ok, reason, resources);
  }

  // Storage cleanup AFTER the DB commit, only for items that succeeded.
  const byBucket = new Map<MediaBucket, string[]>();
  for (const { bucket, path } of cleanups) {
    const list = byBucket.get(bucket) ?? [];
    list.push(path);
    byBucket.set(bucket, list);
  }
  for (const [bucket, paths] of byBucket) {
    await client.storage.from(bucket).remove(paths);
  }

  return { deleted: deleted.length, failed };
}

async function writeAudit(
  client: DbClient,
  deletedBy: string | null,
  entity: DeleteEntity,
  item: ImpactItem,
  ok: boolean,
  reason: string | undefined,
  resources: string[],
): Promise<void> {
  if (!deletedBy) return;
  try {
    await client.from("delete_audit").insert({
      cleanup: resources,
      deleted_by: deletedBy,
      entity_id: item.id,
      entity_type: AUDIT_ENTITY[entity],
      failure_reason: ok ? null : (reason ?? null),
      impact: { dependent: item.dependent, external: item.external },
      result: ok ? "success" : "failed",
    });
  } catch {
    // Audit failure must not roll back a completed deletion; log for operators.
    console.error(`delete_audit write failed for ${entity}/${item.id}`);
  }
}

function revalidatePaths(): void {
  // Public blog reads are tagged-cached, so a tag invalidation is required on
  // top of the path revalidations (same choke point as the blog admin actions).
  updateTag(BLOG_CACHE_TAG);
  revalidatePath("/admin/blog");
  revalidatePath("/admin/blog/categories");
  revalidatePath("/admin/media");
  revalidatePath("/blog");
  revalidatePath("/vi/blog");
  revalidatePath("/");
  revalidatePath("/vi");
}
