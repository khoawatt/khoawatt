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
  /** When set, insert the uploaded image via the callback instead of just refreshing. */
  onUploaded?: (path: string, url: string, title: string) => void;
}

export function MediaUploadForm({ bucket, onUploaded }: MediaUploadFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
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
      const result: MediaUploadResult = await uploadMedia({
        bucket,
        file,
        title: title || undefined,
      });
      if (result.ok) {
        setTitle("");
        if (onUploaded && result.path && result.publicUrl) {
          onUploaded(result.path, result.publicUrl, title || file.name);
        } else {
          router.refresh();
        }
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
      <label className="admin-field">
        <span>Title (optional)</span>
        <input
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Defaults to the filename"
          value={title}
        />
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