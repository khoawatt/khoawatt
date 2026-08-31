import { notFound } from "next/navigation";

import { getProject } from "../data";
import { ProjectForm } from "../project-form";
import { AdminFormCard, AdminPage } from "../../admin-page";

interface AdminEditProjectPageProps {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: "Edit project",
};

export default async function AdminEditProjectPage({
  params,
}: AdminEditProjectPageProps) {
  const { id } = await params;
  const project = await getProject(id);

  if (!project) {
    notFound();
  }

  return (
    <AdminPage backHref="/admin/projects" title="Edit project">
      <AdminFormCard className="admin-form-card--wide">
        <h2>Project details</h2>
        <ProjectForm existing={project} />
      </AdminFormCard>
    </AdminPage>
  );
}
