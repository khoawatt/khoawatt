"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { DeleteDialog } from "@/components/ui/delete-dialog";
import { inspectDelete } from "@/features/cms/delete/actions";

import { deletePost } from "./actions";

interface DeletePostButtonProps {
  id: string;
  title: string;
}

export function DeletePostButton({ id, title }: DeletePostButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const res = await inspectDelete("blog_post", [id]);
      if (cancelled) return;
      if (res.ok && res.result && res.result.dependencies.length > 0) {
        const lines = res.result.dependencies.map((d) => `• ${d.count} ${d.entity} will be affected`);
        setPreview(lines.join("\n"));
      } else setPreview(null);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, id]);

  function handleConfirm() {
    startTransition(async () => {
      const result = await deletePost(id);
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
        title={`Move post "${title}" to Trash?`}
        description="The post will be hidden and can be restored from Trash within 30 days."
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
