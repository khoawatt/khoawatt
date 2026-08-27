"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { MediaBucket } from "@/features/cms/media";
import { uploadMedia, type MediaUploadMeta } from "@/features/cms/media-actions";

interface MediaUploadPanelProps {
  bucket: MediaBucket;
  /** Called after a successful upload with the stored path (modal flow). */
  onUploaded?: () => void;
}

/**
 * Upload form for one bucket (#102). Used inline on /admin/media and as the
 * Upload tab inside the picker modal. Metadata fields are optional; the
 * catalog derives a default title from the filename when left blank.
 */
export function MediaUploadPanel({ bucket, onUploaded }: MediaUploadPanelProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    const file = fd.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setError("Choose a file to upload.");
      return;
    }

    const meta: MediaUploadMeta = {
      altEn: String(fd.get("altEn") ?? ""),
      altVi: String(fd.get("altVi") ?? ""),
      title: String(fd.get("title") ?? ""),
    };

    setError(null);
    startTransition(async () => {
      const result = await uploadMedia(bucket, file, meta);
      if (result.ok) {
        formRef.current?.reset();
        onUploaded?.();
        router.refresh();
        if (result.warning) setError(result.warning);
      } else {
        setError(result.error ?? "Upload failed.");
      }
    });
  }

  return (
    <form
      aria-live="polite"
      className="admin-form admin-form--row admin-upload-panel"
      onSubmit={onSubmit}
      ref={formRef}
    >
      <label className="admin-field">
        <span>Image (JPEG/PNG/WebP, max 10 MB)</span>
        <input accept="image/jpeg,image/png,image/webp" name="file" type="file" />
      </label>
      <label className="admin-field">
        <span>Title (optional)</span>
        <input name="title" type="text" />
      </label>
      <label className="admin-field">
        <span>Alt text EN (optional)</span>
        <input name="altEn" type="text" />
      </label>
      <label className="admin-field">
        <span>Alt text VI (optional)</span>
        <input name="altVi" type="text" />
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
