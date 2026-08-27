"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  deleteMedia,
  type MediaDeleteResult,
} from "@/features/cms/media-actions";
import type { MediaBucket } from "@/features/cms/media";

interface MediaDeleteButtonProps {
  bucket: MediaBucket;
  path: string;
}

export function MediaDeleteButton({ bucket, path }: MediaDeleteButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`Delete "${path}"? This removes the stored file.`)) return;

    startTransition(async () => {
      const result: MediaDeleteResult = await deleteMedia(bucket, path);
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