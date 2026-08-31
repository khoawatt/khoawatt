import { notFound } from "next/navigation";

import { getTag } from "../../data";
import { AdminPage } from "../../../admin-page";
import { TagForm } from "../tag-form";

interface TagEditPageProps {
  params: Promise<{ id: string }>;
}

export default async function TagEditPage({ params }: TagEditPageProps) {
  const { id } = await params;
  const tag = await getTag(id);
  if (!tag) notFound();
  return (
    <AdminPage backHref="/admin/blog/tags" backLabel="Tags" title={`Edit tag: ${tag.nameEn}`}>
      <TagForm existing={tag} />
    </AdminPage>
  );
}
