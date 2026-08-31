import { TagForm } from "../tag-form";
import { AdminPage } from "../../../admin-page";

export const metadata = { title: "New blog tag" };

export default function NewTagPage() {
  return (
    <AdminPage backHref="/admin/blog/tags" backLabel="Tags" title="New tag">
      <TagForm />
    </AdminPage>
  );
}
