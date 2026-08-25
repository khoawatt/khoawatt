import { CategoryForm } from "../category-form";
import { AdminFormCard, AdminPage } from "../../../admin-page";

export const metadata = {
  title: "New blog category",
};

export default function AdminNewCategoryPage() {
  return (
    <AdminPage backHref="/admin/blog/categories" title="New category">
      <AdminFormCard>
        <h2>Category details</h2>
        <CategoryForm />
      </AdminFormCard>
    </AdminPage>
  );
}