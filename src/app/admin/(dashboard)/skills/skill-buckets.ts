import {
  otherGroupKeys,
  otherTaxonomy,
  type OtherCategoryKey,
  type SkillGroup,
} from "@/content/skills";

export interface AdminSkillRow {
  id: string;
  group: SkillGroup;
  categoryKey: OtherCategoryKey | null;
  iconKey: string | null;
  url: string | null;
  order: number;
  featured: boolean;
  nameEn: string;
  nameVi: string;
}

/**
 * Admin listing buckets, in stable display order: Tech Stack first, then the
 * code-owned Others groups, then anything unassigned/unknown so misfiled rows
 * are visible instead of silently hidden.
 */
export interface AdminSkillBucket {
  id: string;
  title: string;
  hint?: string;
  skills: AdminSkillRow[];
}

/** Display bucket id for a taxonomy key: sections roll up to their parent group. */
export function bucketIdForCategoryKey(key: OtherCategoryKey): string {
  const node = otherTaxonomy.find((candidate) => candidate.key === key);

  if (!node) return "unassigned";
  return node.kind === "section" && node.parentKey ? node.parentKey : node.key;
}

export const UNASSIGNED_BUCKET_ID = "unassigned";
export const TECH_STACK_BUCKET_ID = "tech-stack";

export function bucketizeSkills(skills: AdminSkillRow[]): AdminSkillBucket[] {
  const buckets: AdminSkillBucket[] = [
    { id: TECH_STACK_BUCKET_ID, title: "Tech Stack", skills: [] },
    ...otherGroupKeys.map((key) => ({
      id: key,
      title:
        otherTaxonomy.find((node) => node.kind === "group" && node.key === key)
          ?.label.en ?? key,
      skills: [],
    })),
    {
      id: UNASSIGNED_BUCKET_ID,
      title: "Unassigned",
      hint: "Others skills without a recognized category key. Edit each one to pick its group.",
      skills: [],
    },
  ];

  const byId = new Map(buckets.map((bucket) => [bucket.id, bucket]));

  for (const skill of skills) {
    let target = byId.get(skill.group);

    if (skill.group === "others") {
      target =
        (skill.categoryKey ? byId.get(bucketIdForCategoryKey(skill.categoryKey)) : undefined) ??
        byId.get(UNASSIGNED_BUCKET_ID);
    }

    target?.skills.push(skill);
  }

  return buckets.filter(
    (bucket) => bucket.skills.length > 0 || bucket.id !== UNASSIGNED_BUCKET_ID,
  );
}
