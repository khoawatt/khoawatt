"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { DeleteDialog } from "@/components/ui/delete-dialog";
import { inspectDelete } from "@/features/cms/delete/actions";

import { deleteTag } from "../actions";

export function DeleteTagButton({ id, name }: Readonly<{ id: string; name: string }>) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const res = await inspectDelete("blog_tag", [id]);
      if (cancelled) return;
      if (res.ok && res.result) {
        const deps = res.result.dependencies;
        if (deps.length > 0) setPreview(deps.map((d) => `• Used by ${d.count} post(s)`).join("\n"));
        else setPreview(null);
        if (res.result.blocked.includes(id)) setPreview((p) => (p ? p + "\n" : "") + "⚠ Currently in use — remove from posts first.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, id]);

  function handleConfirm() {
    startTransition(async () => {
      const res = await deleteTag(id);
      if (res.ok) {
        setOpen(false);
        router.refresh();
      } else {
        setError(res.error ?? "Failed to delete.");
        setOpen(false);
      }
    });
  }

  return (
    <>
      <button type="button" className="admin-link-button admin-link-button--danger" disabled={isPending} onClick={() => setOpen(true)}>
        {isPending ? "…" : "Delete"}
      </button>
      <DeleteDialog open={open} title={`Move tag "${name}" to Trash?`} description="This tag will be hidden and can be restored from Trash within 30 days. If in use, deletion will be blocked." preview={preview} confirmLabel="Move to Trash" isPending={isPending} onConfirm={handleConfirm} onCancel={() => setOpen(false)} />
      {error ? <span className="admin-error">{error}</span> : null}
    </>
  );
}
