import { ProjectForm } from "../project-form";
import { AdminFormCard, AdminPage } from "../../admin-page";

export const metadata = {
  title: "New project",
};

export default function AdminNewProjectPage() {
  return (
    <AdminPage backHref="/admin/projects" title="New project">
      <AdminFormCard className="admin-form-card--wide">
        <h2>Project details</h2>
        <ProjectForm />
      </AdminFormCard>
    </AdminPage>
  );
}
