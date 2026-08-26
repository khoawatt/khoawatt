import Link from "next/link";

import { listPosts } from "./data";
import { AdminPage, AdminTable } from "../admin-page";
import {
  BulkDeleteBar,
  BulkSelectionProvider,
  DeleteActionButton,
  SelectAllCheckbox,
  SelectionCheckbox,
} from "@/features/cms/delete-actions";

export const metadata = {
  title: "Admin blog",
};

export default async function AdminBlogPage() {
  const posts = await listPosts();
  const items = posts.map((post) => ({ id: post.id, label: post.titleEn || post.id }));

  return (
    <AdminPage
      action={
        <Link className="admin-button" href="/admin/blog/new">
          New post
        </Link>
      }
      title="Blog posts"
    >
      <BulkSelectionProvider>
        <BulkDeleteBar entity="blog-post" items={items} noun="post" />

        {posts.length === 0 ? (
          <p className="admin-empty">No posts yet.</p>
        ) : (
          <AdminTable label="Blog posts">
            <thead>
              <tr>
                <th scope="col">
                  <SelectAllCheckbox ids={items.map((item) => item.id)} label="Select all posts" />
                </th>
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
                  <td>
                    <SelectionCheckbox id={post.id} label={post.titleEn || post.id} />
                  </td>
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
                    <DeleteActionButton entity="blog-post" item={{ id: post.id, label: post.titleEn || post.id }} noun="post" />
                  </td>
                </tr>
              ))}
            </tbody>
          </AdminTable>
        )}
      </BulkSelectionProvider>
    </AdminPage>
  );
}
