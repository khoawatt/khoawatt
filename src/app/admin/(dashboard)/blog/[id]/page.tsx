import { notFound } from "next/navigation";

import { getPost } from "../data";
import { PostForm } from "../post-form";
import { listCategories, listTags } from "../data";
import { AdminFormCard, AdminPage } from "../../admin-page";

interface AdminEditPostPageProps {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: "Edit blog post",
};

export default async function AdminEditPostPage({
  params,
}: Readonly<AdminEditPostPageProps>) {
  const { id } = await params;
  const post = await getPost(id);

  if (!post) {
    notFound();
  }

  const [categories, tags] = await Promise.all([listCategories(), listTags()]);

  return (
    <AdminPage backHref="/admin/blog" title="Edit post">
      <AdminFormCard className="admin-form-card--wide">
        <h2>Post details</h2>
        <PostForm
          categories={categories}
          existing={post}
          tags={tags}
        />
      </AdminFormCard>
    </AdminPage>
  );
}