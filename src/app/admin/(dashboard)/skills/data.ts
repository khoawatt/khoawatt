import { getServerClient } from "@/features/cms/session";
import { isOtherCategoryKey, type SkillGroup } from "@/content/skills";

import type { AdminSkillRow } from "./skill-buckets";

export type { AdminSkillRow } from "./skill-buckets";

export interface SkillListResult {
  skills: AdminSkillRow[];
  error?: string;
}

function mapSkillRow(
  skill: {
    id: string;
    group_key: string;
    category_key: string | null;
    icon_key: string | null;
    url: string | null;
    order: number;
    featured: boolean;
    skill_translations: Array<{ locale: string; name: string }> | null;
  },
): AdminSkillRow {
  const translations = skill.skill_translations ?? [];
  const en = translations.find((t) => t.locale === "en");
  const vi = translations.find((t) => t.locale === "vi");
  const categoryKey = skill.category_key;

  return {
    id: skill.id,
    group: skill.group_key as SkillGroup,
    categoryKey:
      categoryKey && isOtherCategoryKey(categoryKey) ? categoryKey : null,
    iconKey: skill.icon_key,
    url: skill.url,
    order: skill.order,
    featured: skill.featured,
    nameEn: en?.name ?? "",
    nameVi: vi?.name ?? "",
  };
}

export async function listSkills(): Promise<SkillListResult> {
  const client = await getServerClient();

  const { data, error } = await client
    .from("skills")
    .select("id, group_key, category_key, icon_key, url, order, featured, skill_translations(locale, name)")
    .is("deleted_at", null)
    .order("group_key")
    .order("order")
    .order("id");

  if (error || !data) {
    return { skills: [], error: error?.message ?? "Failed to load skills." };
  }

  return {
    skills: data.map((skill) =>
      mapSkillRow(
        skill as unknown as Parameters<typeof mapSkillRow>[0],
      ),
    ),
  };
}

export async function getSkill(id: string): Promise<AdminSkillRow | null> {
  const client = await getServerClient();

  const { data, error } = await client
    .from("skills")
    .select("id, group_key, category_key, icon_key, url, order, featured, skill_translations(locale, name)")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data) return null;

  return mapSkillRow(data as unknown as Parameters<typeof mapSkillRow>[0]);
}
