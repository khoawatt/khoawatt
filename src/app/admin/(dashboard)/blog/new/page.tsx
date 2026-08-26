import { PostForm } from "../post-form";
import { listCategories, listTags } from "../data";
import { AdminFormCard, AdminPage } from "../../admin-page";

export const metadata = {
  title: "New blog post",
};

export default async function AdminNewPostPage() {
  const [categories, tags] = await Promise.all([
    listCategories(),
    listTags(),
  ]);

  return (
    <AdminPage backHref="/admin/blog" title="New post">
      <AdminFormCard className="admin-form-card--wide">
        <h2>Post details</h2>
        <PostForm categories={categories} tags={tags} />
      </AdminFormCard>
    </AdminPage>
  );
}