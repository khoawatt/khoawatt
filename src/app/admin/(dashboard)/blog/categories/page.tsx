import Link from "next/link";

import { listCategories } from "../data";
import { AdminPage } from "../../admin-page";
import { BulkCategoriesTable } from "./bulk-categories-table";

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
      <BulkCategoriesTable categories={categories} />
    </AdminPage>
  );
}