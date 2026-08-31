import { listAudit } from "./data";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const rows = await listAudit(100);
  return (
    <div className="admin-page">
      <h1 className="admin-page-title">Audit log</h1>
      <p className="admin-note">All soft delete, restore, and hard delete operations (user and system). Anon cannot read this table.</p>
      {rows.length === 0 ? (
        <p className="admin-message">No audit entries yet.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Actor</th>
                <th>Operation</th>
                <th>Entity</th>
                <th>ID</th>
                <th>Label</th>
                <th>Deps</th>
                <th>Resolution</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{new Date(row.createdAt).toLocaleString()}</td>
                  <td>{row.actorType === "system" ? "system" : row.actorId?.slice(0, 8) ?? "user"}</td>
                  <td><span className="admin-badge">{row.operation}</span></td>
                  <td>{row.entityType}</td>
                  <td><code>{row.entityId}</code></td>
                  <td>{row.entityLabel ?? "—"}</td>
                  <td>{row.dependencyCount}</td>
                  <td>{row.resolutionType ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
