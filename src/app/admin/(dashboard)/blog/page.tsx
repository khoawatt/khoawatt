import Link from "next/link";

import { listPosts } from "./data";
import { DeletePostButton } from "./delete-post";
import { AdminPage, AdminTable } from "../admin-page";

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
      {posts.length === 0 ? (
        <p className="admin-empty">No posts yet.</p>
      ) : (
        <AdminTable label="Blog posts">
          <thead>
            <tr>
              <th scope="col">Title</th>
              <th scope="col">Category</th>
              <th scope="col">Status</th>
              <th scope="col">Published</th>
              <th scope="col"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => (
              <tr key={post.id}>
                <td>{post.titleEn}</td>
                <td>{post.categoryNameEn}</td>
                <td>
                  <span className={`admin-badge ${post.status === "published" ? "admin-badge--success" : "admin-badge--muted"}`}>
                    {post.status}
                  </span>
                </td>
                <td>
                  {post.publishedAt
                    ? new Date(post.publishedAt).toLocaleDateString()
                    : "—"}
                </td>
                <td className="admin-row-actions">
                  <Link href={`/admin/blog/${post.id}`}>Edit</Link>
                  <DeletePostButton id={post.id} title={post.titleEn} />
                </td>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      )}
    </AdminPage>
  );
}