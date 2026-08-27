"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { deletePost } from "./actions";

interface DeletePostButtonProps {
  id: string;
  title: string;
}

export function DeletePostButton({ id, title }: DeletePostButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`Delete post "${title}"?`)) return;

    startTransition(async () => {
      const result = await deletePost(id);
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.error ?? "Failed to delete.");
      }
    });
  }

  return (
    <>
      <button
        className="admin-link-button admin-link-button--danger"
        disabled={isPending}
        onClick={handleDelete}
        type="button"
      >
        {isPending ? "…" : "Delete"}
      </button>
      {error ? <span className="admin-error">{error}</span> : null}
    </>
  );
}