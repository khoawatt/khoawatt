"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { DeleteDialog } from "@/components/ui/delete-dialog";

import { deleteSocialLink } from "./actions";

interface DeleteSocialButtonProps {
  id: string;
  label: string;
}

export function DeleteSocialButton({ id, label }: DeleteSocialButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const result = await deleteSocialLink(id);
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
        title={`Move social link "${label}" to Trash?`}
        description="This link will be hidden and can be restored from Trash within 30 days."
        confirmLabel="Move to Trash"
        isPending={isPending}
        onConfirm={handleConfirm}
        onCancel={() => setOpen(false)}
      />
      {error ? <span className="admin-error">{error}</span> : null}
    </>
  );
}
