"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { DeleteDialog } from "@/components/ui/delete-dialog";
import { inspectDelete } from "@/features/cms/delete/actions";

import { deleteCategory } from "../actions";

interface DeleteCategoryButtonProps {
  id: string;
  name: string;
}

export function DeleteCategoryButton({ id, name }: DeleteCategoryButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const res = await inspectDelete("blog_category", [id]);
      if (cancelled) return;
      if (res.ok && res.result) {
        const deps = res.result.dependencies;
        if (deps.length > 0) {
          const lines = deps.map((d) => {
            if (d.field === "reassign_uncategorized") return `• ${d.count} post(s) will be moved to Uncategorized`;
            return `• ${d.count} ${d.entity} blocked`;
          });
          setPreview(lines.join("\n"));
        } else setPreview(null);
        if (res.result.blocked.includes(id)) {
          setPreview((prev) => (prev ? prev + "\n" : "") + "⚠ This category is protected or blocked.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, id]);

  function handleConfirm() {
    startTransition(async () => {
      const result = await deleteCategory(id);
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
        title={`Move category "${name}" to Trash?`}
        description={id === "uncategorized" ? "This is the default category and cannot be deleted." : "Posts in this category will be moved to Uncategorized and the category hidden."}
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
