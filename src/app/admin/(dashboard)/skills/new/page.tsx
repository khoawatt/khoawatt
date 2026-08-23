import { isOtherCategoryKey, type OtherCategoryKey, type SkillGroup } from "@/content/skills";
import { SkillForm } from "../skill-form";
import { AdminFormCard, AdminPage } from "../../admin-page";

export const metadata = {
  title: "New skill",
};

interface AdminNewSkillPageProps {
  searchParams: Promise<{ group?: string; categoryKey?: string }>;
}

export default async function AdminNewSkillPage({
  searchParams,
}: AdminNewSkillPageProps) {
  const { group, categoryKey } = await searchParams;

  const defaultGroup: SkillGroup =
    group === "others" ? "others" : "tech-stack";
  const defaultCategoryKey: OtherCategoryKey | undefined =
    categoryKey && isOtherCategoryKey(categoryKey) ? categoryKey : undefined;

  return (
    <AdminPage backHref="/admin/skills" title="New skill">
      <AdminFormCard>
        <h2>Skill details</h2>
        <SkillForm
          defaultGroup={defaultGroup}
          defaultCategoryKey={defaultCategoryKey}
        />
      </AdminFormCard>
    </AdminPage>
  );
}
