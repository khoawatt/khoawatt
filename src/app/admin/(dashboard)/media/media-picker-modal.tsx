"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { MediaBucket } from "@/features/cms/media";
import type { ListMediaAssetsResult } from "@/features/cms/media-catalog";
import { publicMediaUrl } from "@/features/cms/media-url";
import { fetchMediaBatch } from "@/features/cms/media-library-actions";
import { MediaLibraryGrid } from "./media-library-grid";
import { MediaUploadPanel } from "./media-upload-panel";

interface MediaPickerModalProps {
  bucket: MediaBucket;
  onClose: () => void;
  /** Receives the stored path + a ready-to-use public URL for the pick. */
  onSelect: (asset: { path: string; url: string; altEn: string; altVi: string }) => void;
  open: boolean;
}

const BUCKET_TITLES: Record<MediaBucket, string> = {
  "blog-media": "Blog media",
  "portfolio": "Portfolio",
  "project-media": "Project media",
  "resume-media": "Resume media",
};

/**
 * WordPress-style media library modal (#102): browse one bucket as an
 * infinite-scroll grid or upload straight into it, then hand the chosen
 * asset back to the caller. Native <dialog> keeps focus inside while open;
 * browsers restore focus to the invoker on close.
 */
export function MediaPickerModal({
  bucket,
  onClose,
  onSelect,
  open,
}: Readonly<MediaPickerModalProps>) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [tab, setTab] = useState<"library" | "upload">("library");
  const [initial, setInitial] = useState<ListMediaAssetsResult | null>(null);

  const loadFirst = useCallback(() => {
    fetchMediaBatch(bucket)
      .then(setInitial)
      .catch(() => setInitial({ items: [] }));
  }, [bucket]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setTab("library");
      loadFirst();
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, loadFirst]);

  return (
    <dialog
      aria-label={`${BUCKET_TITLES[bucket]} library`}
      className="admin-dialog admin-dialog--wide"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
      onClose={onClose}
      ref={dialogRef}
    >
      <header className="admin-picker__head">
        <h3 className="admin-dialog__title">{BUCKET_TITLES[bucket]} library</h3>
        <div aria-label="Library tabs" className="admin-picker__tabs" role="tablist">
          <button
            aria-selected={tab === "library"}
            onClick={() => setTab("library")}
            role="tab"
            type="button"
          >
            Library
          </button>
          <button
            aria-selected={tab === "upload"}
            onClick={() => setTab("upload")}
            role="tab"
            type="button"
          >
            Upload new
          </button>
        </div>
        <button
          aria-label="Close media library"
          className="admin-link-button"
          onClick={onClose}
          type="button"
        >
          Close
        </button>
      </header>

      {tab === "library" ? (
        initial ? (
          <div className="admin-picker__body">
            <MediaLibraryGrid
              bucket={bucket}
              initial={initial}
              key={`${bucket}:${initial.items[0]?.path ?? "empty"}`}
              mode="cursor"
              onPick={(asset) =>
                onSelect({
                  altEn: asset.altEn,
                  altVi: asset.altVi,
                  path: asset.path,
                  url: publicMediaUrl(asset.bucket, asset.path),
                })
              }
            />
          </div>
        ) : (
          <p className="admin-message">Loading library…</p>
        )
      ) : (
        <div className="admin-picker__body">
          <MediaUploadPanel bucket={bucket} onUploaded={loadFirst} />
          <p className="admin-note">
            Uploaded images land in this bucket&apos;s library — switch to the
            Library tab to use them.
          </p>
        </div>
      )}
    </dialog>
  );
}
