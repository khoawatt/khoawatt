import Link from "next/link";

import { listCategories } from "../data";
import { DeleteCategoryButton } from "./delete-category";
import { AdminPage, AdminTable } from "../../admin-page";

export const metadata = {
  title: "Admin blog categories",
};

export default async function AdminBlogCategoriesPage() {
  const categories = await listCategories();

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
      {categories.length === 0 ? (
        <p className="admin-empty">No categories yet.</p>
      ) : (
        <AdminTable label="Blog categories">
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
                <td>{category.nameEn} / {category.nameVi}</td>
                <td>{category.sortOrder}</td>
                <td className="admin-row-actions">
                  <Link href={`/admin/blog/categories/${category.id}`}>Edit</Link>
                  {category.id !== "uncategorized" ? <DeleteCategoryButton id={category.id} name={category.nameEn} /> : <span className="admin-note">protected</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      )}
    </AdminPage>
  );
}