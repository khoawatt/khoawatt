import { notFound } from "next/navigation";

import { getCategory } from "../../data";
import { CategoryForm } from "../category-form";
import { AdminFormCard, AdminPage } from "../../../admin-page";

interface AdminEditCategoryPageProps {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: "Edit blog category",
};

export default async function AdminEditCategoryPage({
  params,
}: Readonly<AdminEditCategoryPageProps>) {
  const { id } = await params;
  const category = await getCategory(id);

  if (!category) {
    notFound();
  }

  return (
    <AdminPage backHref="/admin/blog/categories" title="Edit category">
      <AdminFormCard>
        <h2>Category details</h2>
        <CategoryForm existing={category} />
      </AdminFormCard>
    </AdminPage>
  );
}