"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { DeleteDialog } from "@/components/ui/delete-dialog";
import { inspectDelete } from "@/features/cms/delete/actions";

import { deleteSkill } from "./actions";

interface DeleteSkillButtonProps {
  id: string;
  name: string;
}

export function DeleteSkillButton({ id, name }: DeleteSkillButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      await inspectDelete("skill", [id]);
      if (cancelled) return;
      setPreview(null);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, id]);

  function handleConfirm() {
    startTransition(async () => {
      const result = await deleteSkill(id);
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
        title={`Move skill "${name}" to Trash?`}
        description="This skill will be hidden and can be restored from Trash within 30 days."
        preview={preview}
        confirmLabel="Move to Trash"
        isPending={isPending}
        onConfirm={handleConfirm}
        onCancel={() => setOpen(false)}
      />
      {error ? <span className="admin-error">{error}</span> : null}
    </>
  );
}
