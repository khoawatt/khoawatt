import Link from "next/link";

import { listCategories } from "../data";
import { AdminPage, AdminTable } from "../../admin-page";
import {
  BulkDeleteBar,
  BulkSelectionProvider,
  DeleteActionButton,
  SelectAllCheckbox,
  SelectionCheckbox,
} from "@/features/cms/delete-actions";

export const metadata = {
  title: "Admin blog categories",
};

export default async function AdminBlogCategoriesPage() {
  const categories = await listCategories();
  const items = categories.map((category) => ({
    id: category.id,
    label: category.nameEn || category.id,
  }));

  return (
    <AdminPage
      action={
        <Link className="admin-button" href="/admin/blog/categories/new">
          New category
        </Link>
      }
      backHref="/admin/blog"
      backLabel="Posts"
      title="Blog categories"
    >
      <BulkSelectionProvider>
        <BulkDeleteBar entity="blog-category" items={items} noun="category" />

        {categories.length === 0 ? (
          <p className="admin-empty">No categories yet.</p>
        ) : (
          <AdminTable label="Blog categories">
            <thead>
              <tr>
                <th scope="col">
                  <SelectAllCheckbox ids={items.map((item) => item.id)} label="Select all categories" />
                </th>
                <th scope="col">ID</th>
                <th scope="col">Name</th>
                <th scope="col">Order</th>
                <th scope="col"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id}>
                  <td>
                    <SelectionCheckbox id={category.id} label={category.nameEn || category.id} />
                  </td>
                  <td>{category.id}</td>
                  <td>{category.nameEn} / {category.nameVi}</td>
                  <td>{category.sortOrder}</td>
                  <td className="admin-row-actions">
                    <Link href={`/admin/blog/categories/${category.id}`}>Edit</Link>
                    <DeleteActionButton
                      entity="blog-category"
                      item={{ id: category.id, label: category.nameEn || category.id }}
                      noun="category"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </AdminTable>
        )}
      </BulkSelectionProvider>
    </AdminPage>
  );
}
