"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { DeleteDialog } from "@/components/ui/delete-dialog";

import { forceHardDeleteEntity, hardDeleteEntity, restoreEntity } from "./actions";
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
  const [confirm, setConfirm] = useState<{ entity: string; id: string; mode: "restore" | "hard" | "force" } | null>(null);
  const [confirmInput, setConfirmInput] = useState("");
  const [forceInput, setForceInput] = useState("");
  const [bulkHardOpen, setBulkHardOpen] = useState(false);
  const [bulkInput, setBulkInput] = useState("");

  const entities = useMemo(() => {
    const set = new Set(items.map((i) => i.entity));
    return ["all", ...Array.from(set).sort()];
  }, [items]);

  const filtered = filter === "all" ? items : items.filter((i) => i.entity === filter);
  const eligibleCount = filtered.filter((i) => isEligible(i.deletedAt)).length;

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const allSelected = filtered.length > 0 && filtered.every((i) => selected.has(`${i.entity}:${i.id}`));
  function toggleSelect(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }
  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(filtered.map((i) => `${i.entity}:${i.id}`)));
  }

  const selectedItems = filtered.filter((i) => selected.has(`${i.entity}:${i.id}`));
  const [bulkMode, setBulkMode] = useState<"restore" | "hard" | "force" | null>(null);
  const [bulkConfirmInput, setBulkConfirmInput] = useState("");

  function handleBulk(mode: "restore" | "hard" | "force") {
    if (selectedItems.length === 0) {
      setError("No items selected.");
      return;
    }
    if (mode !== "restore" && bulkConfirmInput !== "DELETE") {
      setError("Please type DELETE to confirm bulk.");
      return;
    }
    startTransition(async () => {
      let failed = 0;
      for (const item of selectedItems) {
        let res;
        if (mode === "restore") res = await restoreEntity(item.entity, item.id);
        else if (mode === "hard") {
          if (!isEligible(item.deletedAt)) { failed++; continue; }
          res = await hardDeleteEntity(item.entity, item.id);
        } else res = await forceHardDeleteEntity(item.entity, item.id);
        if (!res.ok) failed++;
      }
      if (failed > 0) setError(`${failed} item(s) failed.`);
      setBulkMode(null);
      setBulkConfirmInput("");
      setSelected(new Set());
      router.refresh();
    });
  }

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
      setError("Please type DELETE to confirm.");
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

  function handleBulkHardDelete() {
    if (bulkInput !== "DELETE") {
      setError("Please type DELETE to confirm bulk.");
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
            onClick={() => {
              setFilter(e);
              setSelected(new Set());
            }}
          >
            {e} {e !== "all" ? `(${items.filter((i) => i.entity === e).length})` : `(${items.length})`}
          </button>
        ))}
      </div>

      {selectedItems.length > 0 ? (
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "1rem", padding: "0.5rem", border: "1px solid var(--color-border)", borderRadius: "0.5rem", background: "var(--color-surface-subtle)" }}>
          <span className="admin-note">{selectedItems.length} selected</span>
          <button type="button" className="admin-link-button" disabled={isPending} onClick={() => setBulkMode("restore")}>Restore</button>
          <button type="button" className="admin-link-button admin-link-button--danger" disabled={isPending} onClick={() => setBulkMode("hard")}>Permanent</button>
          <button type="button" className="admin-link-button admin-link-button--danger" disabled={isPending} onClick={() => setBulkMode("force")}>Force</button>
          <button type="button" className="admin-link-button" onClick={() => setSelected(new Set())}>Clear</button>
        </div>
      ) : null}

      {filtered.length > 0 && eligibleCount > 0 ? (
        <div style={{ marginBottom: "1rem" }}>
          <button type="button" className="admin-button admin-button--danger" onClick={() => setBulkHardOpen(true)} disabled={isPending}>
            Empty trash ({eligibleCount} eligible)
          </button>
          <span className="admin-note" style={{ marginLeft: "0.5rem" }}>Only items older than {RETENTION_DAYS} days can be permanently deleted.</span>
        </div>
      ) : null}

      <ul className="admin-list">
        <li className="admin-list__row" style={{ display: "flex", gap: "1rem", alignItems: "center", padding: "0.5rem 0", borderBottom: "1px solid var(--color-border)" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <input type="checkbox" checked={allSelected} onChange={toggleAll} />
            <span className="admin-note">Select all ({filtered.length})</span>
          </label>
        </li>
        {filtered.map((item) => {
          const eligible = isEligible(item.deletedAt);
          const left = daysLeft(item.deletedAt);
          const key = `${item.entity}:${item.id}`;
          return (
            <li key={key} className="admin-list__row" style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "center" }}>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <input type="checkbox" checked={selected.has(key)} onChange={() => toggleSelect(key)} />
                <div>
                  <strong>{item.entity}</strong> — <code>{item.label}</code> <span className="admin-note">({item.id})</span>
                  <br />
                  <span className="admin-note">Deleted: {new Date(item.deletedAt).toLocaleString()} — {eligible ? "Eligible" : `in ${left}d`}</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button type="button" className="admin-link-button" disabled={isPending} onClick={() => setConfirm({ entity: item.entity, id: item.id, mode: "restore" })}>
                  Restore
                </button>
                <button type="button" className="admin-link-button admin-link-button--danger" disabled={isPending || !eligible} title={!eligible ? `Available in ${left} day(s)` : undefined} onClick={() => setConfirm({ entity: item.entity, id: item.id, mode: "hard" })}>
                  Permanent
                </button>
                <button type="button" className="admin-link-button admin-link-button--danger" disabled={isPending} onClick={() => setConfirm({ entity: item.entity, id: item.id, mode: "force" })} title="Bypass 30d">
                  Force
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
        onCancel={() => setConfirm(null)}
      />

      {confirm?.mode === "hard" ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Permanently delete ${confirm.entity} "${confirm.id}"`}
          style={{ position: "fixed", inset: 0, background: "rgb(0 0 0 / 0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "1rem" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setConfirm(null);
              setConfirmInput("");
            }
          }}
        >
          <div className="admin-dialog" style={{ background: "var(--color-surface)", color: "var(--color-text)", border: "1px solid var(--color-border-strong)", width: "min(26rem, calc(100vw - 2rem))", margin: "auto" }} onClick={(e) => e.stopPropagation()}>
            <h3 className="admin-dialog__title" style={{ color: "var(--color-text)" }}>Permanently delete {confirm.entity} “{confirm.id}”?</h3>
            <p className="admin-note" style={{ color: "var(--color-text-muted)" }}>This action cannot be undone. This item is eligible after {RETENTION_DAYS} days. Type <code>DELETE</code> to confirm.</p>
            <input aria-label="Type DELETE to confirm" placeholder="DELETE" value={confirmInput} onChange={(e) => setConfirmInput(e.target.value)} style={{ width: "100%", marginTop: "0.5rem", padding: "0.5rem 0.75rem", border: "1px solid var(--color-border-strong)", borderRadius: "0.5rem", background: "var(--color-surface)", color: "var(--color-text)" }} />
            <div className="admin-dialog__actions" style={{ marginTop: "1rem" }}>
              <button type="button" onClick={() => { setConfirm(null); setConfirmInput(""); }} disabled={isPending}>Cancel</button>
              <button type="button" className="admin-button admin-button--danger" disabled={isPending || confirmInput !== "DELETE"} onClick={() => handleHardDelete(confirm.entity, confirm.id)}>
                {isPending ? "…" : "Permanently delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {confirm?.mode === "force" ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Force delete ${confirm.entity} "${confirm.id}"`}
          style={{ position: "fixed", inset: 0, background: "rgb(0 0 0 / 0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "1rem" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setConfirm(null);
              setForceInput("");
            }
          }}
        >
          <div className="admin-dialog" style={{ background: "var(--color-surface)", color: "var(--color-text)", border: "1px solid var(--color-border-strong)", width: "min(26rem, calc(100vw - 2rem))", margin: "auto" }} onClick={(e) => e.stopPropagation()}>
            <h3 className="admin-dialog__title" style={{ color: "var(--color-text)" }}>Force delete {confirm.entity} “{confirm.id}”?</h3>
            <p className="admin-note" style={{ color: "var(--color-text-muted)" }}>Bypass 30d retention — permanently deletes now. Type <code>DELETE</code> to confirm.</p>
            <input aria-label="Type DELETE to confirm force" placeholder="DELETE" value={forceInput} onChange={(e) => setForceInput(e.target.value)} style={{ width: "100%", marginTop: "0.5rem", padding: "0.5rem 0.75rem", border: "1px solid var(--color-border-strong)", borderRadius: "0.5rem", background: "var(--color-surface)", color: "var(--color-text)" }} />
            <div className="admin-dialog__actions" style={{ marginTop: "1rem" }}>
              <button type="button" onClick={() => { setConfirm(null); setForceInput(""); }} disabled={isPending}>Cancel</button>
              <button type="button" className="admin-button admin-button--danger" disabled={isPending || forceInput !== "DELETE"} onClick={() => handleForceDelete(confirm.entity, confirm.id)}>
                {isPending ? "…" : "Force delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {bulkHardOpen ? (
        <div role="dialog" aria-modal="true" aria-label="Empty trash" style={{ position: "fixed", inset: 0, background: "rgb(0 0 0 / 0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "1rem" }} onClick={(e) => { if (e.target === e.currentTarget) { setBulkHardOpen(false); setBulkInput(""); } }}>
          <div className="admin-dialog" style={{ background: "var(--color-surface)", color: "var(--color-text)", border: "1px solid var(--color-border-strong)", width: "min(26rem, calc(100vw - 2rem))", margin: "auto" }} onClick={(e) => e.stopPropagation()}>
            <h3 className="admin-dialog__title" style={{ color: "var(--color-text)" }}>Empty trash — {eligibleCount} eligible item(s)?</h3>
            <p className="admin-note" style={{ color: "var(--color-text-muted)" }}>Only items older than {RETENTION_DAYS} days will be permanently deleted. Type <code>DELETE</code> to confirm.</p>
            <input aria-label="Type DELETE to confirm bulk" placeholder="DELETE" value={bulkInput} onChange={(e) => setBulkInput(e.target.value)} style={{ width: "100%", marginTop: "0.5rem", padding: "0.5rem 0.75rem", border: "1px solid var(--color-border-strong)", borderRadius: "0.5rem", background: "var(--color-surface)", color: "var(--color-text)" }} />
            <div className="admin-dialog__actions" style={{ marginTop: "1rem" }}>
              <button type="button" onClick={() => { setBulkHardOpen(false); setBulkInput(""); }} disabled={isPending}>Cancel</button>
              <button type="button" className="admin-button admin-button--danger" disabled={isPending || bulkInput !== "DELETE"} onClick={handleBulkHardDelete}>
                {isPending ? "…" : `Delete ${eligibleCount}`}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {bulkMode ? (
        <div role="dialog" aria-modal="true" aria-label={`Bulk ${bulkMode}`} style={{ position: "fixed", inset: 0, background: "rgb(0 0 0 / 0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "1rem" }} onClick={(e) => { if (e.target === e.currentTarget) { setBulkMode(null); setBulkConfirmInput(""); } }}>
          <div className="admin-dialog" style={{ background: "var(--color-surface)", color: "var(--color-text)", border: "1px solid var(--color-border-strong)", width: "min(26rem, calc(100vw - 2rem))", margin: "auto" }} onClick={(e) => e.stopPropagation()}>
            <h3 className="admin-dialog__title" style={{ color: "var(--color-text)" }}>Bulk {bulkMode} — {selectedItems.length} item(s)?</h3>
            <p className="admin-note" style={{ color: "var(--color-text-muted)" }}>{bulkMode === "restore" ? "Restore selected items." : bulkMode === "force" ? "Force delete bypasses 30d retention." : "Only eligible items will be permanently deleted."} Type <code>DELETE</code> to confirm{bulkMode !== "restore" ? " (or leave empty for restore)" : ""}.</p>
            {bulkMode !== "restore" ? (
              <input aria-label="Type DELETE to confirm bulk" placeholder="DELETE" value={bulkConfirmInput} onChange={(e) => setBulkConfirmInput(e.target.value)} style={{ width: "100%", marginTop: "0.5rem", padding: "0.5rem 0.75rem", border: "1px solid var(--color-border-strong)", borderRadius: "0.5rem", background: "var(--color-surface)", color: "var(--color-text)" }} />
            ) : null}
            <div className="admin-dialog__actions" style={{ marginTop: "1rem" }}>
              <button type="button" onClick={() => { setBulkMode(null); setBulkConfirmInput(""); }} disabled={isPending}>Cancel</button>
              <button type="button" className="admin-button admin-button--danger" disabled={isPending || (bulkMode !== "restore" && bulkConfirmInput !== "DELETE")} onClick={() => handleBulk(bulkMode)}>
                {isPending ? "…" : `${bulkMode} ${selectedItems.length}`}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
