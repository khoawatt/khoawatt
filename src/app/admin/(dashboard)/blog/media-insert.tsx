"use client";

import { useState } from "react";

import type { MediaBucket } from "@/features/cms/media";
import { MediaPickerModal } from "../media/media-picker-modal";

export interface InsertableImage {
  url: string;
  altEn: string;
  altVi: string;
}

interface MediaInsertButtonProps {
  onInsert: (image: InsertableImage) => void;
}

/**
 * Inline "Insert image" control for a Markdown content field (#102): opens the
 * shared blog-media library modal (browse or upload), then hands the chosen
 * asset — with its catalog alt text in both locales — to the editor.
 */
export function MediaInsertButton({ onInsert }: Readonly<MediaInsertButtonProps>) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        aria-expanded={open}
        className="admin-link-button"
        onClick={() => setOpen(true)}
        type="button"
      >
        <svg aria-hidden="true" fill="none" height="14" viewBox="0 0 24 24" width="14">
          <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.7" />
          <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" stroke="none" />
          <path d="M21 15l-5-5-7 7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Insert image
      </button>
      <MediaPickerModal
        bucket={"blog-media" satisfies MediaBucket}
        onClose={() => setOpen(false)}
        onSelect={(asset) => {
          onInsert({ altEn: asset.altEn, altVi: asset.altVi, url: asset.url });
          setOpen(false);
        }}
        open={open}
      />
    </>
  );
}
