"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { DeleteDialog } from "@/components/ui/delete-dialog";
import { inspectDelete } from "@/features/cms/delete/actions";

import { deleteProject } from "./actions";

interface DeleteProjectButtonProps {
  id: string;
  title: string;
}

export function DeleteProjectButton({ id, title }: DeleteProjectButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const res = await inspectDelete("project", [id]);
      if (cancelled) return;
      if (res.ok && res.result) {
        const deps = res.result.dependencies;
        if (deps.length === 0) setPreview(null);
        else {
          const lines = deps.map((d) => {
            if (d.field === "reassign_uncategorized") return `• ${d.count} post(s) will be moved to Uncategorized`;
            return `• ${d.count} ${d.entity} will be affected`;
          });
          setPreview(lines.join("\n"));
        }
      } else {
        setPreview(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, id]);

  function handleConfirm() {
    startTransition(async () => {
      const result = await deleteProject(id);
      if (result.ok) {
        setOpen(false);
        router.refresh();
      } else {
        setError(result.error ?? "Failed to delete.");
        setOpen(false);
      }
    });
  }

  return (
    <>
      <button
        className="admin-link-button admin-link-button--danger"
        disabled={isPending}
        onClick={() => setOpen(true)}
        type="button"
      >
        {isPending ? "…" : "Delete"}
      </button>
      <DeleteDialog
        open={open}
        title={`Move project "${title}" to Trash?`}
        description="The project will be hidden from the public site and can be restored from Trash within 30 days."
        preview={preview}
        confirmLabel="Move to Trash"
        cancelLabel="Cancel"
        variant="warning"
        isPending={isPending}
        onConfirm={handleConfirm}
        onCancel={() => setOpen(false)}
      />
      {error ? <span className="admin-error">{error}</span> : null}
    </>
  );
}