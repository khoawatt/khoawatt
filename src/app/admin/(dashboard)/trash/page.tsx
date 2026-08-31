import { listTrash } from "./data";
import { TrashList } from "./trash-list";

export const dynamic = "force-dynamic";

export default async function TrashPage() {
  const items = await listTrash();

  return (
    <div className="admin-page">
      <h1 className="admin-page-title">Trash</h1>
      <p className="admin-note">
        Soft-deleted items are hidden from the public site and can be restored within 30 days. Permanent delete is only available after retention.
      </p>
      <TrashList items={items} />
    </div>
  );
}
