"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  uploadMedia,
  type MediaUploadResult,
} from "@/features/cms/media-actions";
import type { MediaBucket } from "@/features/cms/media";

interface MediaUploadFormProps {
  bucket: MediaBucket;
}

export function MediaUploadForm({ bucket }: MediaUploadFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    const file = fd.get("file") as File | null;
    if (!file || file.size === 0) {
      setError("Choose a file to upload.");
      return;
    }

    startTransition(async () => {
      const result: MediaUploadResult = await uploadMedia(bucket, file);
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.error ?? "Upload failed.");
      }
    });
  }

  return (
    <form className="admin-form admin-form--row" onSubmit={onSubmit}>
      <label className="admin-field">
        <span>Upload image (JPEG/PNG/WebP, max 10 MB)</span>
        <input name="file" type="file" accept="image/jpeg,image/png,image/webp" />
      </label>
      {error ? (
        <p className="admin-error" role="alert">
          {error}
        </p>
      ) : null}
      <button disabled={isPending} type="submit">
        {isPending ? "Uploading…" : "Upload"}
      </button>
    </form>
  );
}