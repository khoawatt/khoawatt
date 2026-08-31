"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { DeleteDialog } from "@/components/ui/delete-dialog";

import { hardDeleteEntity, restoreEntity } from "./actions";
import type { TrashItem } from "./data";

const RETENTION_DAYS = 30;

function isEligible(deletedAt: string): boolean {
  const deleted = new Date(deletedAt).getTime();
  const eligibleAt = deleted + RETENTION_DAYS * 24 * 60 * 60 * 1000;
  return Date.now() >= eligibleAt;
}

function daysLeft(deletedAt: string): number {
  const deleted = new Date(deletedAt).getTime();
  const eligibleAt = deleted + RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const diff = eligibleAt - Date.now();
  return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
}

export function TrashList({ items }: { items: TrashItem[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [isPending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<{ entity: string; id: string; mode: "restore" | "hard" } | null>(null);
  const [confirmInput, setConfirmInput] = useState("");
  const [bulkHardOpen, setBulkHardOpen] = useState(false);
  const [bulkInput, setBulkInput] = useState("");

  const entities = useMemo(() => {
    const set = new Set(items.map((i) => i.entity));
    return ["all", ...Array.from(set).sort()];
  }, [items]);

  const filtered = filter === "all" ? items : items.filter((i) => i.entity === filter);
  const eligibleCount = filtered.filter((i) => isEligible(i.deletedAt)).length;

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
    if (confirmInput !== "DELETE") {
      setError('Please type DELETE to confirm.');
      return;
    }
    startTransition(async () => {
      const res = await hardDeleteEntity(entity, id);
      if (res.ok) {
        setConfirm(null);
        setConfirmInput("");
        router.refresh();
      } else {
        setError(res.error ?? "Hard delete failed.");
        setConfirm(null);
        setConfirmInput("");
      }
    });
  }

  function handleBulkHardDelete() {
    if (bulkInput !== "DELETE") {
      setError('Please type DELETE to confirm bulk.');
      return;
    }
    const eligible = filtered.filter((i) => isEligible(i.deletedAt));
    if (eligible.length === 0) {
      setError("No eligible items to permanently delete.");
      setBulkHardOpen(false);
      return;
    }
    startTransition(async () => {
      let failed = 0;
      for (const item of eligible) {
        const res = await hardDeleteEntity(item.entity, item.id);
        if (!res.ok) failed++;
      }
      if (failed > 0) setError(`${failed} item(s) could not be deleted.`);
      setBulkHardOpen(false);
      setBulkInput("");
      router.refresh();
    });
  }

  if (items.length === 0) {
    return <p className="admin-message">Trash is empty.</p>;
  }

  return (
    <>
      {error ? <p className="admin-error">{error}</p> : null}

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        {entities.map((e) => (
          <button
            key={e}
            type="button"
            className={filter === e ? "admin-button" : "admin-link-button"}
            onClick={() => setFilter(e)}
          >
            {e} {e !== "all" ? `(${items.filter((i) => i.entity === e).length})` : `(${items.length})`}
          </button>
        ))}
      </div>

      {filtered.length > 0 && eligibleCount > 0 ? (
        <div style={{ marginBottom: "1rem" }}>
          <button type="button" className="admin-button admin-button--danger" onClick={() => setBulkHardOpen(true)} disabled={isPending}>
            Empty trash ({eligibleCount} eligible)
          </button>
          <span className="admin-note" style={{ marginLeft: "0.5rem" }}>Only items older than {RETENTION_DAYS} days can be permanently deleted.</span>
        </div>
      ) : null}

      <ul className="admin-list">
        {filtered.map((item) => {
          const eligible = isEligible(item.deletedAt);
          const left = daysLeft(item.deletedAt);
          return (
            <li key={`${item.entity}:${item.id}`} className="admin-list__row" style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "center" }}>
              <div>
                <strong>{item.entity}</strong> — <code>{item.label}</code> <span className="admin-note">({item.id})</span>
                <br />
                <span className="admin-note">Deleted: {new Date(item.deletedAt).toLocaleString()} — {eligible ? "Eligible for permanent delete" : `Permanent deletion in ${left} day(s)`}</span>
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button type="button" className="admin-link-button" disabled={isPending} onClick={() => setConfirm({ entity: item.entity, id: item.id, mode: "restore" })}>
                  Restore
                </button>
                <button
                  type="button"
                  className="admin-link-button admin-link-button--danger"
                  disabled={isPending || !eligible}
                  title={!eligible ? `Available in ${left} day(s)` : undefined}
                  onClick={() => setConfirm({ entity: item.entity, id: item.id, mode: "hard" })}
                >
                  Permanent delete
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <DeleteDialog
        open={confirm?.mode === "restore"}
        title={confirm ? `Restore ${confirm.entity} "${confirm.id}"?` : "Restore?"}
        description="This item will be restored and visible again on the public site."
        confirmLabel="Restore"
        variant="warning"
        isPending={isPending}
        onConfirm={() => confirm && handleRestore(confirm.entity, confirm.id)}
        onCancel={() => {
          setConfirm(null);
          setConfirmInput("");
        }}
      />
      {confirm?.mode === "hard" ? (
        <div className="admin-dialog__overlay" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div className="admin-dialog" style={{ background: "white", padding: "1.5rem", borderRadius: "8px", maxWidth: "480px", width: "90%" }}>
            <h3 className="admin-dialog__title">Permanently delete {confirm.entity} &ldquo;{confirm.id}&rdquo;?</h3>
            <p className="admin-note">This action cannot be undone. This item is eligible after {RETENTION_DAYS} days. Type <code>DELETE</code> to confirm.</p>
            <input
              aria-label="Type DELETE to confirm"
              placeholder="DELETE"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              style={{ width: "100%", marginTop: "0.5rem", padding: "0.5rem", border: "1px solid #ccc", borderRadius: "4px" }}
            />
            <div className="admin-dialog__actions" style={{ marginTop: "1rem", display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button type="button" onClick={() => { setConfirm(null); setConfirmInput(""); }} disabled={isPending}>Cancel</button>
              <button type="button" className="admin-button admin-button--danger" disabled={isPending || confirmInput !== "DELETE"} onClick={() => handleHardDelete(confirm.entity, confirm.id)}>
                {isPending ? "…" : "Permanently delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {bulkHardOpen ? (
        <div className="admin-dialog__overlay" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div className="admin-dialog" style={{ background: "white", padding: "1.5rem", borderRadius: "8px", maxWidth: "480px", width: "90%" }}>
            <h3 className="admin-dialog__title">Empty trash — {eligibleCount} eligible item(s)?</h3>
            <p className="admin-note">Only items older than {RETENTION_DAYS} days will be permanently deleted. Type <code>DELETE</code> to confirm.</p>
            <input
              aria-label="Type DELETE to confirm bulk"
              placeholder="DELETE"
              value={bulkInput}
              onChange={(e) => setBulkInput(e.target.value)}
              style={{ width: "100%", marginTop: "0.5rem", padding: "0.5rem", border: "1px solid #ccc", borderRadius: "4px" }}
            />
            <div className="admin-dialog__actions" style={{ marginTop: "1rem", display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button type="button" onClick={() => { setBulkHardOpen(false); setBulkInput(""); }} disabled={isPending}>Cancel</button>
              <button type="button" className="admin-button admin-button--danger" disabled={isPending || bulkInput !== "DELETE"} onClick={handleBulkHardDelete}>
                {isPending ? "…" : `Delete ${eligibleCount}`}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
