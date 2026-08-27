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
