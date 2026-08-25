"use client";

import { useState, useTransition } from "react";

import { uploadMedia } from "@/features/cms/media-actions";

interface MediaOption {
  name: string;
  url: string;
}

interface MediaInsertButtonProps {
  media: MediaOption[];
  onInsert: (url: string, alt: string) => void;
}

function altFromName(name: string): string {
  return name.replace(/\.[^.]+$/, "").replace(/^\d+-/, "").replace(/[-_]+/g, " ");
}

/** Inline "Insert image" picker for a Markdown content field: lists existing
 *  blog-media objects and uploads new ones, inserting `![](url)` at the cursor. */
export function MediaInsertButton({ media, onInsert }: Readonly<MediaInsertButtonProps>) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, startUpload] = useTransition();

  function choose(url: string, name: string) {
    onInsert(url, altFromName(name));
    setOpen(false);
  }

  function upload(file: File | undefined) {
    if (!file || file.size === 0) return;
    setError(null);

    startUpload(async () => {
      const result = await uploadMedia("blog-media", file);
      if (result.ok && result.publicUrl) {
        onInsert(result.publicUrl, altFromName(file.name));
        setOpen(false);
      } else {
        setError(result.error ?? "Upload failed.");
      }
    });
  }

  return (
    <span className="media-insert">
      <button
        aria-expanded={open}
        className="admin-link-button"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        {open ? "Close image picker" : "Insert image"}
      </button>

      {open ? (
        <span className="media-insert__panel">
          {media.length > 0 ? (
            <span className="media-insert__grid">
              {media.map((item) => (
                <button
                  className="media-insert__thumb"
                  key={item.name}
                  onClick={() => choose(item.url, item.name)}
                  title={item.name}
                  type="button"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img alt={item.name} height={48} src={item.url} width={64} />
                  <span className="media-insert__name">{item.name}</span>
                </button>
              ))}
            </span>
          ) : (
            <p className="admin-note">No media uploaded yet.</p>
          )}

          <span className="media-insert__upload">
            <input
              accept="image/jpeg,image/png,image/webp"
              aria-label="Upload image to insert"
              onChange={(event) => upload(event.currentTarget.files?.[0])}
              type="file"
            />
            {isUploading ? <span className="admin-note">Uploading…</span> : null}
          </span>
          {error ? <p className="admin-error">{error}</p> : null}
        </span>
      ) : null}
    </span>
  );
}