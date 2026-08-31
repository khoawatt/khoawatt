import Link from "next/link";

import { listProjects } from "./data";
import { AdminPage } from "../admin-page";
import { BulkProjectsTable } from "./bulk-projects-table";

export const metadata = {
  title: "Admin projects",
};

export default async function AdminProjectsPage() {
  const projects = await listProjects();

  return (
    <AdminPage
      action={
        <Link className="admin-button" href="/admin/projects/new">
          New project
        </Link>
      }
      title="Projects"
    >
      <BulkProjectsTable projects={projects} />
    </AdminPage>
  );
}
