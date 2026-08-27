"use client";

import { useEffect, useRef, useState } from "react";

import type { MediaAsset } from "@/features/cms/media-library";
import type { MediaBucket } from "@/features/cms/media";
import {
  DeleteActionButton,
  SelectionCheckbox,
} from "@/features/cms/delete-actions";

interface MediaGridProps {
  items: MediaAsset[];
  bucket: MediaBucket;
}

export function MediaGrid({ items, bucket }: MediaGridProps) {
  const [lightbox, setLightbox] = useState<MediaAsset | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  async function copyUrl(asset: MediaAsset) {
    try {
      await navigator.clipboard.writeText(asset.url);
      setCopyStatus(`Copied URL for ${asset.path}.`);
    } catch {
      setCopyStatus("Could not copy the URL.");
    }
  }

  return (
    <>
      {copyStatus ? (
        <p className="admin-note" role="status" aria-live="polite">
          {copyStatus}
        </p>
      ) : null}
      <ul className="admin-media-grid">
        {items.map((item) => (
          <li className="admin-media-grid__item" key={item.path}>
            <button
              className="admin-media-preview"
              onClick={() => setLightbox(item)}
              title={`${item.title} — view`}
              type="button"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt={item.altEn || item.title || item.path}
                height={item.height ?? 80}
                loading="lazy"
                src={item.url}
                width={item.width ?? 120}
              />
            </button>
            <div className="admin-media-meta">
              <code title={item.path}>{item.path}</code>
              <span className="admin-media-title">{item.title || "Untitled"}</span>
              <span className="admin-media-dims">
                {item.width && item.height ? `${item.width}×${item.height}` : "—"}
                {item.sizeBytes ? ` · ${formatBytes(item.sizeBytes)}` : ""}
                {item.mime ? ` · ${item.mime}` : ""}
              </span>
              <div className="admin-media-actions">
                <SelectionCheckbox id={item.path} label={item.title || item.path} />
                <button className="admin-link-button" onClick={() => copyUrl(item)} type="button">
                  Copy URL
                </button>
                <DeleteActionButton
                  bucket={bucket}
                  entity="media"
                  item={{ id: item.path, label: item.title || item.path }}
                  noun="file"
                />
              </div>
            </div>
          </li>
        ))}
      </ul>

      <MediaLightbox
        asset={lightbox}
        onClose={() => setLightbox(null)}
        onCopy={() => lightbox && copyUrl(lightbox)}
      />
    </>
  );
}

function MediaLightbox({
  asset,
  onClose,
  onCopy,
}: {
  asset: MediaAsset | null;
  onClose: () => void;
  onCopy: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (asset && !dialog.open) dialog.showModal();
    else if (!asset && dialog.open) dialog.close();
  }, [asset]);

  return (
    <dialog
      aria-label={asset ? `Preview of ${asset.title}` : "Image preview"}
      className="admin-dialog admin-lightbox"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
      ref={dialogRef}
    >
      {asset ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt={asset.altEn || asset.title}
            className="admin-lightbox__image"
            src={asset.url}
          />
          <div className="admin-lightbox__meta">
            <strong>{asset.title}</strong>
            <code>{asset.path}</code>
            <span>
              {asset.width && asset.height ? `${asset.width}×${asset.height} · ` : ""}
              {asset.mime?.replace("image/", "") ?? "?"}
            </span>
          </div>
          <div className="admin-dialog__actions">
            <button onClick={onCopy} type="button">
              Copy URL
            </button>
            <button onClick={onClose} type="button">
              Close
            </button>
          </div>
        </>
      ) : null}
    </dialog>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
