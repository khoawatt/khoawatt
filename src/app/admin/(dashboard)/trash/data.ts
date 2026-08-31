import { getServerClient } from "@/features/cms/session";

export interface TrashItem {
  entity: string;
  id: string;
  label: string;
  deletedAt: string;
}

export async function listTrash(): Promise<TrashItem[]> {
  const client = await getServerClient();
  const items: TrashItem[] = [];

  const queries: Array<{ entity: string; table: string; labelField?: string }> = [
    { entity: "skill", table: "skills", labelField: "id" },
    { entity: "social", table: "social_links", labelField: "label" },
    { entity: "project", table: "projects", labelField: "id" },
    { entity: "resume_category", table: "resume_categories", labelField: "id" },
    { entity: "resume_entry", table: "resume_entries", labelField: "id" },
    { entity: "blog_category", table: "blog_categories", labelField: "id" },
    { entity: "blog_tag", table: "blog_tags", labelField: "id" },
    { entity: "blog_post", table: "blog_posts", labelField: "id" },
    { entity: "profile", table: "profile", labelField: "slug" },
  ];

  for (const q of queries) {
    try {
      const res = (await client
        .from(q.table)
        .select(`id, deleted_at, ${q.labelField ?? "id"}`)
        .not("deleted_at", "is", null)
        .limit(100)) as unknown as { data: Array<Record<string, string>> | null };
      const data = res.data;
      if (data) {
        for (const row of data) {
          const id = row.id as string;
          const deletedAt = row.deleted_at as string;
          const label = (row[q.labelField ?? "id"] as string) ?? id;
          items.push({
            entity: q.entity,
            id,
            label,
            deletedAt,
          });
        }
      }
    } catch {
      // ignore
    }
  }

  // media_assets trash (bucket+path)
  try {
    const res = (await client
      .from("media_assets")
      .select("bucket, path, deleted_at, title")
      .not("deleted_at", "is", null)
      .limit(100)) as unknown as {
      data: Array<{ bucket: string; path: string; deleted_at: string; title: string }> | null;
    };
    const data = res.data;
    if (data) {
      for (const row of data) {
        items.push({
          entity: "media_asset",
          id: `${row.bucket}:${row.path}`,
          label: row.title || row.path,
          deletedAt: row.deleted_at,
        });
      }
    }
  } catch {}

  items.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
  return items;
}
