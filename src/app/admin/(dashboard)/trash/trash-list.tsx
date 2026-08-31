"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { DeleteDialog } from "@/components/ui/delete-dialog";

import { forceHardDeleteEntity, hardDeleteEntity, restoreEntity } from "./actions";
import type { TrashItem } from "./data";

export function TrashList({ items }: { items: TrashItem[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<{ entity: string; id: string; mode: "restore" | "hard" | "force" } | null>(null);
  const [forceInput, setForceInput] = useState("");

  function handleRestore(entity: string, id: string) {
    startTransition(async () => {
      const res = await restoreEntity(entity, id);
      if (res.ok) {
        setConfirm(null);
        router.refresh();
      } else {
        setError(res.error ?? "Restore failed.");
        setConfirm(null);
      }
    });
  }

  function handleHardDelete(entity: string, id: string) {
    startTransition(async () => {
      const res = await hardDeleteEntity(entity, id);
      if (res.ok) {
        setConfirm(null);
        router.refresh();
      } else {
        setError(res.error ?? "Hard delete failed.");
        setConfirm(null);
      }
    });
  }

  function handleForceDelete(entity: string, id: string) {
    if (forceInput !== "DELETE") {
      setError("Please type DELETE to confirm force delete.");
      return;
    }
    startTransition(async () => {
      const res = await forceHardDeleteEntity(entity, id);
      if (res.ok) {
        setConfirm(null);
        setForceInput("");
        router.refresh();
      } else {
        setError(res.error ?? "Force delete failed.");
        setConfirm(null);
        setForceInput("");
      }
    });
  }

  if (items.length === 0) {
    return <p className="admin-message">Trash is empty.</p>;
  }

  return (
    <>
      {error ? <p className="admin-error">{error}</p> : null}
      <ul className="admin-list">
        {items.map((item) => (
          <li key={`${item.entity}:${item.id}`} className="admin-list__row" style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "center" }}>
            <div>
              <strong>{item.entity}</strong> — <code>{item.label}</code> <span className="admin-note">({item.id})</span>
              <br />
              <span className="admin-note">Deleted: {new Date(item.deletedAt).toLocaleString()}</span>
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button type="button" className="admin-link-button" disabled={isPending} onClick={() => setConfirm({ entity: item.entity, id: item.id, mode: "restore" })}>
                Restore
              </button>
              <button type="button" className="admin-link-button admin-link-button--danger" disabled={isPending} onClick={() => setConfirm({ entity: item.entity, id: item.id, mode: "hard" })}>
                Permanent delete
              </button>
              <button type="button" className="admin-link-button admin-link-button--danger" disabled={isPending} onClick={() => setConfirm({ entity: item.entity, id: item.id, mode: "force" })} title="Bypass 30d retention">
                Force delete
              </button>
            </div>
          </li>
        ))}
      </ul>

      <DeleteDialog
        open={confirm?.mode === "restore"}
        title={confirm ? `Restore ${confirm.entity} "${confirm.id}"?` : "Restore?"}
        description="This item will be restored and visible again on the public site."
        confirmLabel="Restore"
        variant="warning"
        isPending={isPending}
        onConfirm={() => confirm && handleRestore(confirm.entity, confirm.id)}
        onCancel={() => setConfirm(null)}
      />
      <DeleteDialog
        open={confirm?.mode === "hard"}
        title={confirm ? `Permanently delete ${confirm.entity} "${confirm.id}"?` : "Permanently delete?"}
        description="This can only be done after 30 days retention. Will fail with DELETE_NOT_YET_ELIGIBLE if not eligible — use Force delete to bypass."
        confirmLabel="Permanently delete"
        variant="critical"
        isPending={isPending}
        onConfirm={() => confirm && handleHardDelete(confirm.entity, confirm.id)}
        onCancel={() => setConfirm(null)}
      />
      {confirm?.mode === "force" ? (
        <div className="admin-dialog__overlay" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div className="admin-dialog" style={{ background: "white", padding: "1.5rem", borderRadius: "8px", maxWidth: "480px", width: "90%" }}>
            <h3 className="admin-dialog__title">Force delete {confirm.entity} “{confirm.id}”?</h3>
            <p className="admin-note">Bypass 30d retention — permanently deletes now. Type <code>DELETE</code> to confirm.</p>
            <input aria-label="Type DELETE to confirm force" placeholder="DELETE" value={forceInput} onChange={(e) => setForceInput(e.target.value)} style={{ width: "100%", marginTop: "0.5rem", padding: "0.5rem", border: "1px solid #ccc", borderRadius: "4px" }} />
            <div className="admin-dialog__actions" style={{ marginTop: "1rem", display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button type="button" onClick={() => { setConfirm(null); setForceInput(""); }} disabled={isPending}>Cancel</button>
              <button type="button" className="admin-button admin-button--danger" disabled={isPending || forceInput !== "DELETE"} onClick={() => handleForceDelete(confirm.entity, confirm.id)}>
                {isPending ? "…" : "Force delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
