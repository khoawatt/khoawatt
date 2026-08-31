import Link from "next/link";

import { listPosts } from "./data";
import { AdminPage } from "../admin-page";
import { BulkBlogTable } from "./bulk-blog-table";

export const metadata = {
  title: "Admin blog",
};

export default async function AdminBlogPage() {
  const posts = await listPosts();

  return (
    <AdminPage
      action={
        <Link className="admin-button" href="/admin/blog/new">
          New post
        </Link>
      }
      title="Blog posts"
    >
      <BulkBlogTable posts={posts} />
    </AdminPage>
  );
}