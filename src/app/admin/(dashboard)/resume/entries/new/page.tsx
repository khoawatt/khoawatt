import { listResumeCategories } from "../../data";
import { ResumeEntryForm } from "../../resume-entry-form";
import { AdminFormCard, AdminPage } from "../../../admin-page";

export const metadata = {
  title: "New resume entry",
};

export default async function AdminNewResumeEntryPage() {
  const categories = await listResumeCategories();

  return (
    <AdminPage backHref="/admin/resume" title="New resume entry">
      <AdminFormCard className="admin-form-card--wide">
        <h2>Entry details</h2>
        <ResumeEntryForm categories={categories} />
      </AdminFormCard>
    </AdminPage>
  );
}
