"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";

import { uploadMedia, listMediaAssetsAction, type MediaUploadResult } from "./media-actions";
import type { MediaAsset } from "./media-library";
import type { MediaBucket } from "./media";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter(
    (element) =>
      element.offsetParent !== null || element === document.activeElement,
  );
}

/** Default page size for the picker's keyset infinite scroll. */
const PICKER_PAGE_SIZE = 24;

export interface MediaPickerSelection {
  path: string;
  url: string;
  title: string;
  alt: string;
}

interface MediaPickerModalProps {
  open: boolean;
  onClose: () => void;
  bucket: MediaBucket;
  /** What happens when the operator picks an existing asset. */
  onSelect: (selection: MediaPickerSelection) => void;
  /** Called after a successful upload inside the modal. */
  onUploaded?: (selection: MediaPickerSelection) => void;
  /** Optional default alt text passed to onSelect (e.g. the post title). */
  defaultAlt?: string;
}

type PickerTab = "library" | "upload";

/**
 * Shared media picker (#102). One engine, two surfaces: editors open it per
 * bucket to choose a cover or insert an inline image; the admin page can reuse
 * it later for project/resume/portfolio pickers (phase 2).
 *
 * Library tab: keyset infinite scroll with a "Load more" fallback. Upload tab:
 * file + optional title/alt, auto-captures dimensions server-side. On pick or
 * upload it calls the callback and closes. A11y: focus trap, Esc to close,
 * focus restore, aria-live status, named buttons.
 */
export function MediaPickerModal({
  open,
  onClose,
  bucket,
  onSelect,
  onUploaded,
  defaultAlt = "",
}: Readonly<MediaPickerModalProps>) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);

  const [tab, setTab] = useState<PickerTab>("library");
  const [items, setItems] = useState<MediaAsset[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadAlt, setUploadAlt] = useState("");
  const [prevOpen, setPrevOpen] = useState(open);

  // Reset per open by adjusting state during render (avoids setState-in-effect).
  if (open !== prevOpen) {
    setPrevOpen(open);
    setTab("library");
    setItems([]);
    setNextCursor(null);
    setSearch("");
    setError(null);
    setUploading(false);
    setUploadStatus(null);
    setUploadTitle("");
    setUploadAlt("");
  }

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Initial load + search reset (search re-runs from the first page).
  useEffect(() => {
    if (!open || tab !== "library") return;
    let cancelled = false;

    async function loadFirst() {
      setLoading(true);
      setError(null);
      const result = await listMediaAssetsAction({
        mode: "cursor",
        bucket,
        search: search || undefined,
        pageSize: PICKER_PAGE_SIZE,
      });
      if (cancelled) return;
      setItems(result.items ?? []);
      setNextCursor(result.nextCursor ?? null);
      setLoading(false);
    }
    loadFirst();
    return () => {
      cancelled = true;
    };
  }, [open, tab, bucket, search]);

  // Load more (keyset) for infinite scroll / "Load more" fallback.
  async function loadMore() {
    if (!nextCursor || loading) return;
    setLoading(true);
    setError(null);
    const result = await listMediaAssetsAction({
      mode: "cursor",
      bucket,
      search: search || undefined,
      cursor: nextCursor,
      pageSize: PICKER_PAGE_SIZE,
    });
    setItems((current) => [...current, ...(result.items ?? [])]);
    setNextCursor(result.nextCursor ?? null);
    setLoading(false);
  }

  // Focus management: trap Tab, Esc closes, restore focus on close.
  useEffect(() => {
    if (!open) return;

    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    closeButtonRef.current?.focus({ preventScroll: true });

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;

      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = getFocusable(dialog);
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey) {
        if (active === first || active === dialog) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last || active === dialog) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      if (
        previouslyFocused instanceof HTMLElement &&
        previouslyFocused.isConnected
      ) {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, [open]);

  if (!open) return null;
  if (typeof document === "undefined") return null;

  function choose(item: MediaAsset) {
    onSelect({
      path: item.path,
      url: item.url,
      title: item.title,
      alt: defaultAlt || item.altEn || item.title,
    });
    onCloseRef.current();
  }

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (uploading) return;
    const fd = new FormData(event.currentTarget);
    const file = fd.get("file") as File | null;
    if (!file || file.size === 0) {
      setError("Choose a file to upload.");
      return;
    }

    setUploading(true);
    setUploadStatus("Uploading…");
    setError(null);

    const result: MediaUploadResult = await uploadMedia({
      bucket,
      file,
      title: uploadTitle || undefined,
      altEn: defaultAlt || uploadAlt,
      altVi: uploadAlt,
    });

    if (result.ok && result.path && result.publicUrl) {
      setUploadStatus("Uploaded.");
      const selection: MediaPickerSelection = {
        path: result.path,
        url: result.publicUrl,
        title: uploadTitle || file.name,
        alt: defaultAlt || uploadAlt || file.name,
      };
      if (onUploaded) {
        onUploaded(selection);
        onCloseRef.current();
      } else {
        onSelect(selection);
        onCloseRef.current();
      }
    } else {
      setUploadStatus(null);
      setError(result.error ?? "Upload failed.");
    }
    setUploading(false);
  }

  return createPortal(
    <div className="media-picker-backdrop">
      <div
        aria-labelledby="media-picker-title"
        aria-modal="true"
        className="media-picker"
        ref={dialogRef}
        role="dialog"
      >
        <div className="media-picker__header">
          <h2 id="media-picker-title" className="media-picker__title">
            Media library
          </h2>
          <button
            aria-label="Close media picker"
            className="media-picker__close"
            disabled={uploading}
            onClick={() => onCloseRef.current()}
            ref={closeButtonRef}
            type="button"
          >
            <svg
              aria-hidden="true"
              fill="none"
              height="20"
              viewBox="0 0 24 24"
              width="20"
            >
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
              />
            </svg>
          </button>
        </div>

        <div className="media-picker__tabs" role="tablist" aria-label="Media picker">
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
            Upload
          </button>
        </div>

        <div className="media-picker__body">
          {error ? (
            <p className="admin-error" role="alert">
              {error}
            </p>
          ) : null}

          {tab === "library" ? (
            <div role="tabpanel">
              <label className="media-picker__search">
                <span className="sr-only">Search media</span>
                <input
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={`Search ${bucket}…`}
                  type="search"
                  value={search}
                />
              </label>

              {items.length === 0 && !loading ? (
                <p className="media-picker__empty">
                  No matching media yet — switch to Upload to add one.
                </p>
              ) : (
                <ul className="media-picker__grid">
                  {items.map((item) => (
                    <li key={item.path}>
                      <button
                        className="media-picker__thumb"
                        onClick={() => choose(item)}
                        title={item.title || item.path}
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
                        <span className="media-picker__name">{item.title || item.path}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {nextCursor ? (
                <div className="media-picker__more">
                  <button
                    className="admin-button-secondary"
                    disabled={loading}
                    onClick={loadMore}
                    type="button"
                  >
                    {loading ? "Loading…" : "Load more"}
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div role="tabpanel">
              <form className="admin-form media-picker__upload" onSubmit={handleUpload}>
                <label className="admin-field">
                  <span>Image (JPEG/PNG/WebP, max 10 MB)</span>
                  <input
                    accept="image/jpeg,image/png,image/webp"
                    name="file"
                    required
                    type="file"
                  />
                </label>
                <label className="admin-field">
                  <span>Title</span>
                  <input
                    onChange={(event) => setUploadTitle(event.target.value)}
                    placeholder="Defaults to the filename"
                    value={uploadTitle}
                  />
                </label>
                <label className="admin-field">
                  <span>Alt text</span>
                  <input
                    onChange={(event) => setUploadAlt(event.target.value)}
                    placeholder="Optional — used for accessibility"
                    value={uploadAlt}
                  />
                </label>
                <div className="admin-form-actions">
                  <button disabled={uploading} type="submit">
                    {uploading ? "Uploading…" : "Upload"}
                  </button>
                </div>
              </form>
              {uploadStatus ? (
                <p className="media-picker__status" role="status" aria-live="polite">
                  {uploadStatus}
                </p>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}