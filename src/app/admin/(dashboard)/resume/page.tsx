import Link from "next/link";

import { getSettingsView } from "../settings/data";
import { listResumeCategories, listResumeEntries } from "./data";
import { ResumeVisibilityForm } from "./resume-visibility-form";
import { AdminFormCard, AdminPage } from "../admin-page";
import { BulkResumeCategories, BulkResumeEntries } from "./bulk-resume-tables";

export const metadata = {
  title: "Admin resume",
};

export default async function AdminResumePage() {
  const [categories, entries, visibility] = await Promise.all([
    listResumeCategories(),
    listResumeEntries(),
    getSettingsView(),
  ]);

  return (
    <AdminPage title="Resume / CV">
      <AdminFormCard>
        <h2>Visibility</h2>
        <ResumeVisibilityForm initial={visibility} />
      </AdminFormCard>

      <section className="admin-section">
        <div className="admin-page-head">
          <h2>Categories</h2>
          <Link className="admin-button" href="/admin/resume/categories/new">
            New category
          </Link>
        </div>
        {categories.length === 0 ? <p className="admin-empty">No resume categories yet.</p> : <BulkResumeCategories categories={categories} />}
      </section>

      <section className="admin-section">
        <div className="admin-page-head">
          <h2>Entries</h2>
          <Link className="admin-button" href="/admin/resume/entries/new">
            New entry
          </Link>
        </div>
        {entries.length === 0 ? <p className="admin-empty">No resume entries yet.</p> : <BulkResumeEntries entries={entries} categories={categories} />}
      </section>
    </AdminPage>
  );
}
