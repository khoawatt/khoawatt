"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { DeleteDialog } from "@/components/ui/delete-dialog";
import { bulkDelete, inspectDelete } from "@/features/cms/delete/actions";

interface BulkDeleteBarProps {
  entity: string;
  selectedIds: string[];
  onClear: () => void;
  onDone: () => void;
  label?: string;
}

export function BulkDeleteBar({ entity, selectedIds, onClear, onDone, label }: Readonly<BulkDeleteBarProps>) {
  const router = useRouter();
  const [preview, setPreview] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleOpen() {
    setError(null);
    const res = await inspectDelete(entity, selectedIds);
    if (res.ok && res.result) {
      const { deletable, blocked, dependencies } = res.result;
      const lines: string[] = [];
      lines.push(`${deletable.length} will be moved to Trash`);
      if (blocked.length > 0) lines.push(`${blocked.length} blocked`);
      for (const d of dependencies) {
        if (d.field === "reassign_uncategorized") lines.push(`• ${d.count} post(s) → Uncategorized`);
        else if (d.count > 0) lines.push(`• ${d.count} ${d.entity} blocked`);
      }
      setPreview(lines.join("\n"));
    } else {
      setPreview(null);
      setError(res.error ?? null);
    }
    setOpen(true);
  }

  function handleConfirm() {
    startTransition(async () => {
      const res = await bulkDelete(entity, selectedIds);
      if (res.ok && res.result) {
        const { deleted, blocked, failed } = res.result;
        if (blocked.length > 0 || failed.length > 0) {
          setError(`${deleted.length} moved, ${blocked.length} blocked, ${failed.length} failed`);
        }
        setOpen(false);
        onClear();
        onDone();
        router.refresh();
      } else {
        setError(res.error ?? "Bulk delete failed.");
        setOpen(false);
      }
    });
  }

  if (selectedIds.length === 0) return null;

  return (
    <>
      {error ? <p className="admin-error">{error}</p> : null}
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "1rem", padding: "0.5rem", border: "1px solid var(--color-border)", borderRadius: "0.5rem", background: "var(--color-surface-subtle)" }}>
        <span className="admin-note">{selectedIds.length} selected {label ? `(${label})` : ""}</span>
        <button type="button" className="admin-button admin-button--danger" onClick={handleOpen} disabled={isPending}>
          Delete {selectedIds.length}
        </button>
        <button type="button" className="admin-link-button" onClick={onClear}>Clear</button>
      </div>
      <DeleteDialog
        open={open}
        title={`Move ${selectedIds.length} ${entity}(s) to Trash?`}
        description={label ? `Selected ${label} will be hidden and can be restored.` : "Selected items will be hidden and can be restored from Trash within 30 days."}
        preview={preview}
        confirmLabel={`Move ${selectedIds.length} to Trash`}
        isPending={isPending}
        onConfirm={handleConfirm}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
