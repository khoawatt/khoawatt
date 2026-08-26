"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { MediaBucket } from "@/features/cms/media";
import { publicMediaUrl } from "@/features/cms/media-url";
import {
  deleteMedia,
  updateMediaDetails,
} from "@/features/cms/media-actions";
import type {
  CursorQuery,
  ListMediaAssetsResult,
  MediaAsset,
} from "@/features/cms/media-catalog";
import { fetchMediaBatch } from "@/features/cms/media-library-actions";

export interface MediaLibraryGridProps {
  bucket: MediaBucket;
  initial: ListMediaAssetsResult;
  initialQuery?: string;
  /** Page mode deep-links via URL; cursor mode streams batches in place. */
  mode: "page" | "cursor";
  /** Page mode only — which page `initial` represents (for pagination links). */
  pageNumber?: number;
  /** Cursor-mode only: called with the chosen asset (picker modal). */
  onPick?: (asset: MediaAsset) => void;
}

/**
 * Core library grid (#102). Two loading modes share this component:
 *  - "page": numbered pagination driven by URL searchParams (management page).
 *  - "cursor": infinite scroll with a Load-more fallback (picker modal).
 * Cards are named buttons; delete/edit status is announced politely.
 */
export function MediaLibraryGrid({
  bucket,
  initial,
  initialQuery = "",
  mode,
  onPick,
  pageNumber = 1,
}: Readonly<MediaLibraryGridProps>) {
  const router = useRouter();
  const [items, setItems] = useState<MediaAsset[]>(initial.items);
  const [cursor, setCursor] = useState<CursorQuery | undefined>(initial.nextCursor);
  const [query, setQuery] = useState(initialQuery);
  const [status, setStatus] = useState<string | null>(null);
  const [editing, setEditing] = useState<MediaAsset | null>(null);
  const [, startTransition] = useTransition();
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Server renders a fresh grid instance per page/search via `key`, so local
  // state initializes from props and never needs prop-syncing effects.

  const loadOlder = useCallback(() => {
    if (!cursor) return;
    setStatus("Loading…");
    startTransition(async () => {
      try {
        const next = await fetchMediaBatch(bucket, cursor, query || undefined);
        setItems((current) => {
          const known = new Set(current.map((item) => item.path));
          return [...current, ...next.items.filter((item) => !known.has(item.path))];
        });
        setCursor(next.nextCursor);
      } catch {
        setStatus("Could not load more images.");
      }
    });
  }, [bucket, cursor, query]);

  // Infinite scroll for cursor mode.
  useEffect(() => {
    if (mode !== "cursor" || !cursor) return;
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) loadOlder();
      },
      { rootMargin: "320px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [cursor, loadOlder, mode]);

  // Debounced re-fetch on query change (page mode navigates via form submit).
  useEffect(() => {
    if (mode !== "cursor") return;
    if (query === initialQuery) return;
    const timer = setTimeout(() => {
      setStatus("Searching…");
      startTransition(async () => {
        try {
          const next = await fetchMediaBatch(bucket, undefined, query || undefined);
          setItems(next.items);
          setCursor(next.nextCursor);
        } catch {
          setStatus("Search failed.");
        }
      });
    }, 350);
    return () => clearTimeout(timer);
  }, [bucket, initialQuery, mode, query]);

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode !== "page") return;
    const params = new URLSearchParams(window.location.search);
    if (query.trim()) params.set("q", query.trim());
    else params.delete("q");
    params.delete("page");
    router.push(`?${params.toString()}`);
  }

  function removeAsset(asset: MediaAsset) {
    if (!window.confirm(`Delete "${asset.title}"? This cannot be undone.`)) return;
    setStatus(`Deleting ${asset.path}…`);
    startTransition(async () => {
      const result = await deleteMedia(asset.bucket, asset.path);
      if (result.ok) {
        setItems((current) => current.filter((item) => item.path !== asset.path));
        setStatus(null);
        router.refresh();
      } else {
        setStatus(result.error ?? "Delete failed.");
      }
    });
  }

  function saveDetails(
    meta: { altEn: string; altVi: string; title: string },
    done: () => void,
  ) {
    if (!editing) return;
    setStatus("Saving details…");
    startTransition(async () => {
      const result = await updateMediaDetails(editing.bucket, editing.path, meta);
      if (result.ok) {
        setItems((current) =>
          current.map((item) =>
            item.path === editing.path
              ? { ...item, altEn: meta.altEn, altVi: meta.altVi, title: meta.title.trim() }
              : item,
          ),
        );
        setStatus(null);
        done();
      } else {
        setStatus(result.error ?? "Could not save details.");
      }
    });
  }

  return (
    <div className="admin-media-library">
      <form className="admin-media-library__search" onSubmit={submitSearch} role="search">
        <input
          aria-label="Search images by title or filename"
          autoComplete="off"
          name="q"
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder="Search by title or filename…"
          type="search"
          value={query}
        />
        {mode === "page" ? <button type="submit">Search</button> : null}
      </form>

      <p aria-live="polite" className="admin-note">
        {status ??
          `${items.length}${mode === "page" && initial.total !== undefined ? ` of ${initial.total}` : ""} image(s)`}
      </p>

      {items.length === 0 ? (
        <p className="admin-message">No images match.</p>
      ) : (
        <ul className="admin-media-grid">
          {items.map((asset) => (
            <MediaLibraryCard
              asset={asset}
              key={asset.path}
              onEdit={() => setEditing(asset)}
              onPick={onPick}
              onRemove={removeAsset}
            />
          ))}
        </ul>
      )}

      {mode === "cursor" && cursor ? (
        <div className="admin-media-library__more" ref={sentinelRef}>
          <button onClick={loadOlder} type="button">
            Load more
          </button>
        </div>
      ) : null}

      {mode === "page" && (initial.totalPages ?? 1) > 1 ? (
        <nav aria-label="Library pages" className="admin-media-library__pages">
          {Array.from({ length: initial.totalPages ?? 1 }, (_, i) => i + 1).map(
            (n) => {
              const params = new URLSearchParams();
              if (n > 1) params.set("page", String(n));
              if (initialQuery) params.set("q", initialQuery);
              const search = params.toString();
              return (
                <a
                  aria-current={n === pageNumber ? "page" : undefined}
                  className={
                    n === pageNumber
                      ? "admin-page-num admin-page-num--current"
                      : "admin-page-num"
                  }
                  href={search ? `?${search}` : "?"}
                  key={n}
                >
                  {n}
                </a>
              );
            },
          )}
        </nav>
      ) : null}

      <MediaMetadataDialog
        asset={editing}
        onClose={() => setEditing(null)}
        onSave={saveDetails}
      />
    </div>
  );
}

function MediaLibraryCard({
  asset,
  onEdit,
  onPick,
  onRemove,
}: {
  asset: MediaAsset;
  onEdit: () => void;
  onPick?: (asset: MediaAsset) => void;
  onRemove: (asset: MediaAsset) => void;
}) {
  const thumb = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt={asset.altEn || asset.title}
        className="admin-media-card__thumb"
        height={160}
        loading="lazy"
        src={publicMediaUrl(asset.bucket, asset.path)}
        width={240}
      />
      <span className="admin-media-card__title">{asset.title}</span>
    </>
  );

  return (
    <li className="admin-media-card">
      {onPick ? (
        <button
          className="admin-media-card__pick"
          onClick={() => onPick(asset)}
          title={`${asset.title} — use this image`}
          type="button"
        >
          {thumb}
        </button>
      ) : (
        <span className="admin-media-card__view">{thumb}</span>
      )}

      <p className="admin-media-card__meta">
        <code>{asset.path}</code>
        <span>
          {asset.width && asset.height ? `${asset.width}×${asset.height} · ` : ""}
          {asset.mime?.replace("image/", "") ?? "?"}
        </span>
      </p>

      <div className="admin-media-card__actions">
        <button className="admin-link-button" onClick={onEdit} type="button">
          Edit details
        </button>
        <button
          className="admin-link-button admin-link-button--danger"
          onClick={() => onRemove(asset)}
          type="button"
        >
          Delete
        </button>
      </div>
    </li>
  );
}

function MediaMetadataDialog({
  asset,
  onClose,
  onSave,
}: {
  asset: MediaAsset | null;
  onClose: () => void;
  onSave: (
    meta: { altEn: string; altVi: string; title: string },
    done: () => void,
  ) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (asset && !dialog.open) {
      dialog.showModal();
    } else if (!asset && dialog.open) {
      dialog.close();
    }
  }, [asset]);

  return (
    <dialog
      aria-label={asset ? `Edit details for ${asset.title}` : "Edit media details"}
      className="admin-dialog"
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
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const fd = new FormData(event.currentTarget);
            onSave(
              {
                altEn: String(fd.get("altEn") ?? ""),
                altVi: String(fd.get("altVi") ?? ""),
                title: String(fd.get("title") ?? ""),
              },
              onClose,
            );
          }}
        >
          <h3 className="admin-dialog__title">Edit image details</h3>
          <code className="admin-dialog__path">{asset.path}</code>

          <label className="admin-field">
            <span>Title</span>
            <input defaultValue={asset.title} key={`t-${asset.path}`} name="title" required type="text" />
          </label>
          <label className="admin-field">
            <span>Alt text (English)</span>
            <input defaultValue={asset.altEn} key={`en-${asset.path}`} name="altEn" type="text" />
          </label>
          <label className="admin-field">
            <span>Alt text (Vietnamese)</span>
            <input defaultValue={asset.altVi} key={`vi-${asset.path}`} name="altVi" type="text" />
          </label>

          <div className="admin-dialog__actions">
            <button onClick={onClose} type="button">
              Cancel
            </button>
            <button type="submit">Save</button>
          </div>
        </form>
      ) : null}
    </dialog>
  );
}
