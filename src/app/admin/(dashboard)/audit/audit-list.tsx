"use client";

import { useState } from "react";

import type { AuditRow } from "./data";

function EyeIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 24 24" width="16">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

export function AuditList({ rows }: { rows: AuditRow[] }) {
  const [selected, setSelected] = useState<AuditRow | null>(null);

  if (rows.length === 0) return <p className="admin-message">No audit entries yet.</p>;

  return (
    <>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Actor</th>
              <th>Operation</th>
              <th>Entity</th>
              <th>ID</th>
              <th style={{ width: "3rem" }}><span className="sr-only">View</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{new Date(row.createdAt).toLocaleString()}</td>
                <td>{row.actorType === "system" ? "system" : row.actorId?.slice(0, 8) ?? "user"}</td>
                <td><span className="admin-badge">{row.operation}</span></td>
                <td>{row.entityType}</td>
                <td><code style={{ maxWidth: "10rem", display: "inline-block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.entityId}</code></td>
                <td>
                  <button type="button" className="admin-link-button" onClick={() => setSelected(row)} aria-label={`View details for ${row.entityId}`}>
                    <EyeIcon />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Audit details for ${selected.entityId}`}
          style={{ position: "fixed", inset: 0, background: "rgb(0 0 0 / 0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "1rem" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelected(null);
          }}
        >
          <div className="admin-dialog" style={{ background: "var(--color-surface)", color: "var(--color-text)", border: "1px solid var(--color-border-strong)", width: "min(32rem, calc(100vw - 2rem))", maxHeight: "80vh", overflowY: "auto", margin: "auto" }} onClick={(e) => e.stopPropagation()}>
            <h3 className="admin-dialog__title">Audit details</h3>
            <div style={{ display: "grid", gap: "0.5rem", fontSize: "0.875rem" }}>
              <div><strong>ID:</strong> <code>{selected.id}</code></div>
              <div><strong>Time:</strong> {new Date(selected.createdAt).toLocaleString()}</div>
              <div><strong>Actor:</strong> {selected.actorType} {selected.actorId ? `(${selected.actorId})` : ""}</div>
              <div><strong>Operation:</strong> <span className="admin-badge">{selected.operation}</span></div>
              <div><strong>Entity:</strong> {selected.entityType} — <code>{selected.entityId}</code></div>
              <div><strong>Label:</strong> {selected.entityLabel ?? "—"}</div>
              <div><strong>Deps:</strong> {selected.dependencyCount}</div>
              <div><strong>Resolution:</strong> {selected.resolutionType ?? "—"}</div>
              {selected.snapshot ? (
                <div>
                  <strong>Snapshot:</strong>
                  <pre style={{ background: "var(--color-surface-subtle)", padding: "0.75rem", borderRadius: "0.5rem", overflowX: "auto", fontSize: "0.75rem", marginTop: "0.25rem" }}>
                    {JSON.stringify(selected.snapshot, null, 2)}
                  </pre>
                </div>
              ) : null}
            </div>
            <div className="admin-dialog__actions" style={{ marginTop: "1rem" }}>
              <button type="button" onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
