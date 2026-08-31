import Link from "next/link";

import { listTagsAdmin } from "../data";
import { AdminPage } from "../../admin-page";
import { TagsManager } from "./tags-manager";

export const metadata = {
  title: "Admin blog tags",
};

interface TagsPageProps {
  searchParams: Promise<{ q?: string; page?: string }>;
}

export default async function AdminBlogTagsPage({ searchParams }: TagsPageProps) {
  const params = await searchParams;
  const search = params.q ?? "";
  const page = Math.max(Number(params.page ?? 1) || 1, 1);

  const { tags, total, totalPages } = await listTagsAdmin({ search, page, limit: 20 });

  return (
    <AdminPage
      action={
        <Link className="admin-button" href="/admin/blog/tags/new">
          New tag
        </Link>
      }
      backHref="/admin/blog"
      backLabel="Posts"
      title="Blog tags"
    >
      <TagsManager tags={tags} total={total} totalPages={totalPages} currentPage={page} search={search} />
    </AdminPage>
  );
}
