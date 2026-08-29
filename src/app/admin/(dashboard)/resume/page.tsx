import Link from "next/link";

import { getSettingsView } from "../settings/data";
import { listResumeCategories, listResumeEntries } from "./data";
import { ResumeDeleteButton } from "./resume-delete";
import { ResumeVisibilityForm } from "./resume-visibility-form";
import { AdminFormCard, AdminPage, AdminTable } from "../admin-page";

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
        {categories.length === 0 ? (
          <p className="admin-empty">No resume categories yet.</p>
        ) : (
        <AdminTable label="Resume categories">
          <thead>
            <tr>
              <th scope="col">ID</th>
              <th scope="col">Name</th>
              <th scope="col">Order</th>
              <th scope="col"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <tr key={category.id}>
                <td>{category.id}</td>
                <td>{category.nameEn}</td>
                <td>{category.order}</td>
                <td className="admin-row-actions">
                  <Link href={`/admin/resume/categories/${category.id}`}>Edit</Link>
                  <ResumeDeleteButton id={category.id} label={category.nameEn} kind="category" />
                </td>
              </tr>
            ))}
          </tbody>
        </AdminTable>
        )}
      </section>

      <section className="admin-section">
        <div className="admin-page-head">
          <h2>Entries</h2>
          <Link className="admin-button" href="/admin/resume/entries/new">
            New entry
          </Link>
        </div>
        {entries.length === 0 ? (
          <p className="admin-empty">No resume entries yet.</p>
        ) : (
        <AdminTable label="Resume entries">
          <thead>
            <tr>
              <th scope="col">ID</th>
              <th scope="col">Title</th>
              <th scope="col">Category</th>
              <th scope="col">Publication status</th>
              <th scope="col">Order</th>
              <th scope="col"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const category = categories.find((c) => c.id === entry.categoryId);
              return (
                <tr key={entry.id}>
                  <td>{entry.id}</td>
                  <td>{entry.titleEn}</td>
                  <td>{category?.nameEn ?? entry.categoryId}</td>
                  <td>
                    {entry.draft ? (
                      <span className="admin-badge admin-badge--muted">Draft</span>
                    ) : (
                      <span className="admin-badge admin-badge--success">Published</span>
                    )}
                  </td>
                  <td>{entry.order}</td>
                  <td className="admin-row-actions">
                    <Link href={`/admin/resume/entries/${entry.id}`}>Edit</Link>
                    <ResumeDeleteButton id={entry.id} label={entry.titleEn} kind="entry" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </AdminTable>
        )}
      </section>
    </AdminPage>
  );
}
