import { getServerClient } from "@/features/cms/session";

export interface AdminSocialLink {
  id: string;
  label: string;
  url: string;
  iconKey: string | null;
  order: number;
}

export async function listSocialLinks(): Promise<AdminSocialLink[]> {
  const client = await getServerClient();

  const { data, error } = await client
    .from("social_links")
    .select("id, label, url, icon_key, order")
    .is("deleted_at", null)
    .order("order")
    .order("id");

  if (error || !data) return [];

  return data.map((link) => ({
    id: link.id,
    label: link.label,
    url: link.url,
    iconKey: link.icon_key,
    order: link.order,
  }));
}
