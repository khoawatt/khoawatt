import { notFound } from "next/navigation";

import { getResumeEntry, listResumeCategories } from "../../data";
import { ResumeEntryForm } from "../../resume-entry-form";
import { AdminFormCard, AdminPage } from "../../../admin-page";

interface AdminEditResumeEntryPageProps {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: "Edit resume entry",
};

export default async function AdminEditResumeEntryPage({
  params,
}: AdminEditResumeEntryPageProps) {
  const { id } = await params;
  const [entry, categories] = await Promise.all([
    getResumeEntry(id),
    listResumeCategories(),
  ]);

  if (!entry) {
    notFound();
  }

  return (
    <AdminPage backHref="/admin/resume" title="Edit resume entry">
      <AdminFormCard className="admin-form-card--wide">
        <h2>Entry details</h2>
        <ResumeEntryForm existing={entry} categories={categories} />
      </AdminFormCard>
    </AdminPage>
  );
}
