"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { DeleteDialog } from "@/components/ui/delete-dialog";

import { deleteResumeCategory, deleteResumeEntry } from "./actions";

interface ResumeDeleteButtonProps {
  id: string;
  label: string;
  kind: "category" | "entry";
}

export function ResumeDeleteButton({
  id,
  label,
  kind,
}: ResumeDeleteButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const result =
        kind === "category" ? await deleteResumeCategory(id) : await deleteResumeEntry(id);
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
        title={`Move ${kind} "${label}" to Trash?`}
        description={
          kind === "category"
            ? "If this category still has entries, deletion will be blocked. Otherwise it will be moved to Trash."
            : "This entry will be hidden and can be restored from Trash within 30 days."
        }
        confirmLabel="Move to Trash"
        isPending={isPending}
        onConfirm={handleConfirm}
        onCancel={() => setOpen(false)}
      />
      {error ? <span className="admin-error">{error}</span> : null}
    </>
  );
}