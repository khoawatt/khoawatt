import { notFound } from "next/navigation";

import { getPost } from "../data";
import { PostForm } from "../post-form";
import { listCategories, listBlogMedia, listTags } from "../data";
import { getMediaPublicUrl } from "@/features/cms/media";
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

  const [categories, tags, media] = await Promise.all([
    listCategories(),
    listTags(),
    listBlogMedia(),
  ]);

  return (
    <AdminPage backHref="/admin/blog" title="Edit post">
      <AdminFormCard>
        <h2>Post details</h2>
        <PostForm
          categories={categories}
          coverOptions={media.map((object) => ({
            name: object.name,
            url: getMediaPublicUrl("blog-media", object.name),
          }))}
          existing={post}
          tags={tags}
        />
      </AdminFormCard>
    </AdminPage>
  );
}