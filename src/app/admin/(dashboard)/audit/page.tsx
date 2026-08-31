import { listAudit } from "./data";
import { AuditList } from "./audit-list";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const rows = await listAudit(100);
  return (
    <div className="admin-page">
      <h1 className="admin-page-title">Audit log</h1>
      <p className="admin-note">All soft delete, restore, and hard delete operations (user and system). Click the eye to see full row.</p>
      <AuditList rows={rows} />
    </div>
  );
}
