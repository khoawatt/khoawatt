"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { DeleteDialog } from "@/components/ui/delete-dialog";

import { hardDeleteEntity, restoreEntity } from "./actions";
import type { TrashItem } from "./data";

export function TrashList({ items }: { items: TrashItem[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<{ entity: string; id: string; mode: "restore" | "hard" } | null>(null);

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
        description="This can only be done after 30 days retention. Type DELETE to confirm is not required in Phase 1 minimal version; future phases will require typed confirmation."
        confirmLabel="Permanently delete"
        variant="critical"
        isPending={isPending}
        onConfirm={() => confirm && handleHardDelete(confirm.entity, confirm.id)}
        onCancel={() => setConfirm(null)}
      />
    </>
  );
}
