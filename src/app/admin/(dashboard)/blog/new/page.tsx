import { PostForm } from "../post-form";
import { listCategories, listBlogMedia, listTags } from "../data";
import { getMediaPublicUrl } from "@/features/cms/media";
import { AdminFormCard, AdminPage } from "../../admin-page";

export const metadata = {
  title: "New blog post",
};

export default async function AdminNewPostPage() {
  const [categories, tags, media] = await Promise.all([
    listCategories(),
    listTags(),
    listBlogMedia(),
  ]);

  return (
    <AdminPage backHref="/admin/blog" title="New post">
      <AdminFormCard className="admin-form-card--wide">
        <h2>Post details</h2>
        <PostForm
          categories={categories}
          coverOptions={media.map((object) => ({
            name: object.name,
            url: getMediaPublicUrl("blog-media", object.name),
          }))}
          tags={tags}
        />
      </AdminFormCard>
    </AdminPage>
  );
}