"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { DeleteDialog } from "@/components/ui/delete-dialog";

import { deleteProject } from "./actions";

interface DeleteProjectButtonProps {
  id: string;
  title: string;
}

export function DeleteProjectButton({ id, title }: DeleteProjectButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

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