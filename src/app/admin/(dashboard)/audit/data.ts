import { getServerClient } from "@/features/cms/session";

export interface AuditRow {
  id: string;
  actorId: string | null;
  actorType: string;
  entityType: string;
  entityId: string;
  entityLabel: string | null;
  operation: string;
  dependencyCount: number;
  resolutionType: string | null;
  snapshot: unknown | null;
  createdAt: string;
}

export async function listAudit(limit = 100): Promise<AuditRow[]> {
  const client = await getServerClient();
  const { data, error } = await client
    .from("admin_delete_audit")
    .select("id, actor_id, actor_type, entity_type, entity_id, entity_label, operation, dependency_count, resolution_type, snapshot, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return (data as unknown as Array<{
    id: string;
    actor_id: string | null;
    actor_type: string;
    entity_type: string;
    entity_id: string;
    entity_label: string | null;
    operation: string;
    dependency_count: number;
    resolution_type: string | null;
    snapshot: unknown | null;
    created_at: string;
  }>).map((row) => ({
    id: row.id,
    actorId: row.actor_id,
    actorType: row.actor_type,
    entityType: row.entity_type,
    entityId: row.entity_id,
    entityLabel: row.entity_label,
    operation: row.operation,
    dependencyCount: row.dependency_count,
    resolutionType: row.resolution_type,
    snapshot: row.snapshot,
    createdAt: row.created_at,
  }));
}
