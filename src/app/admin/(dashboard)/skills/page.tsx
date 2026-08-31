import { listSkills } from "./data";
import { AdminPage } from "../admin-page";
import { SkillsBulkManager } from "./skills-bulk-manager";

export const metadata = {
  title: "Admin skills",
};

export default async function AdminSkillsPage() {
  const { skills, error } = await listSkills();

  if (error) {
    return (
      <AdminPage title="Skills">
        <p className="admin-error" role="alert">
          {error}
        </p>
      </AdminPage>
    );
  }

  return (
    <AdminPage title="Skills">
      {skills.length === 0 ? <p className="admin-empty">No skills yet.</p> : <SkillsBulkManager skills={skills} />}
    </AdminPage>
  );
}
