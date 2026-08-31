"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { DeleteDialog } from "@/components/ui/delete-dialog";
import type { MediaBucket } from "@/features/cms/media";
import { publicMediaUrl } from "@/features/cms/media-url";
import { deleteMedia, updateMediaDetails } from "@/features/cms/media-actions";
import type { CursorQuery, ListMediaAssetsResult, MediaAsset } from "@/features/cms/media-catalog";
import { fetchMediaBatch } from "@/features/cms/media-library-actions";
import { inspectDelete } from "@/features/cms/delete/actions";
import { resolveAndDeleteMedia } from "@/features/cms/media-resolve-actions";

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
  const [lightbox, setLightbox] = useState<MediaAsset | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MediaAsset | null>(null);
  const [deletePreview, setDeletePreview] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
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

  useEffect(() => {
    if (!deleteTarget) return;
    let cancelled = false;
    (async () => {
      const res = await inspectDelete("media_asset", [deleteTarget.path]);
      if (cancelled) return;
      if (res.ok && res.result) {
        const deps = res.result.dependencies;
        if (deps.length > 0) {
          const lines = deps.map((d) => `• ${d.count} reference(s) in ${d.entity} will be affected`);
          setDeletePreview(lines.join("\n") + "\n\nResolving will: clear cover or remove embedded image nodes.");
        } else setDeletePreview(null);
        if (res.result.blocked.length > 0) {
          setDeletePreview((prev) => (prev ? prev + "\n" : "") + "⚠ This file is currently referenced — Resolve & Delete will clear references.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [deleteTarget]);

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
    setDeleteTarget(asset);
  }

  function handleConfirmDelete() {
    if (!deleteTarget) return;
    setStatus(`Deleting ${deleteTarget.path}…`);
    startDeleteTransition(async () => {
      // Try direct soft delete first
      const result = await deleteMedia(deleteTarget.bucket, deleteTarget.path);
      if (result.ok) {
        setItems((current) => current.filter((item) => item.path !== deleteTarget.path));
        setStatus(null);
        setDeleteTarget(null);
        router.refresh();
        return;
      }
      // If blocked, try resolve & delete
      if (result.error?.includes("referenced") || result.error?.includes("blocked")) {
        const resolveRes = await resolveAndDeleteMedia(deleteTarget.bucket, deleteTarget.path);
        if (resolveRes.ok) {
          setItems((current) => current.filter((item) => item.path !== deleteTarget.path));
          setStatus(`Resolved: cleared ${resolveRes.clearedCovers ?? 0} covers, removed ${resolveRes.removedNodes ?? 0} nodes`);
          setDeleteTarget(null);
          router.refresh();
          return;
        }
        setStatus(resolveRes.error ?? result.error ?? "Delete failed.");
        return;
      }
      setStatus(result.error ?? "Delete failed.");
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

  async function copyUrl(asset: MediaAsset) {
    try {
      await navigator.clipboard.writeText(publicMediaUrl(asset.bucket, asset.path));
      setStatus(`Copied URL for ${asset.path}.`);
    } catch {
      setStatus("Could not copy the URL.");
    }
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
              onCopy={() => copyUrl(asset)}
              onEdit={() => setEditing(asset)}
              onPick={onPick}
              onRemove={removeAsset}
              onView={() => setLightbox(asset)}
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

      <MediaLightbox
        asset={lightbox}
        onClose={() => setLightbox(null)}
        onCopy={() => lightbox && copyUrl(lightbox)}
        onEdit={() => {
          if (lightbox) setEditing(lightbox);
          setLightbox(null);
        }}
        onRemove={() => {
          if (lightbox) removeAsset(lightbox);
          setLightbox(null);
        }}
      />

      <DeleteDialog
        open={!!deleteTarget}
        title={deleteTarget ? `Move "${deleteTarget.title}" to Trash?` : "Move to Trash?"}
        description="This file will be hidden and can be restored from Trash within 30 days. If referenced, Resolve & Delete will clear references."
        preview={deletePreview}
        confirmLabel={deletePreview?.includes("referenced") ? "Resolve & Delete" : "Move to Trash"}
        variant={deletePreview?.includes("referenced") ? "critical" : "warning"}
        isPending={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function MediaLibraryCard({
  asset,
  onCopy,
  onEdit,
  onPick,
  onRemove,
  onView,
}: {
  asset: MediaAsset;
  onCopy: () => void;
  onEdit: () => void;
  onPick?: (asset: MediaAsset) => void;
  onRemove: (asset: MediaAsset) => void;
  onView: () => void;
}) {
  const thumb = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt={asset.altEn || asset.title}
        className="admin-media-card__thumb"
        height={128}
        loading="lazy"
        src={publicMediaUrl(asset.bucket, asset.path)}
        width={192}
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
        <button
          className="admin-media-card__pick"
          onClick={onView}
          title={`${asset.title} — view`}
          type="button"
        >
          {thumb}
        </button>
      )}

      <p className="admin-media-card__meta">
        <code>{asset.path}</code>
        <span>
          {asset.width && asset.height ? `${asset.width}×${asset.height} · ` : ""}
          {asset.mime?.replace("image/", "") ?? "?"}
        </span>
      </p>

      <div className="admin-media-card__actions">
        <button className="admin-link-button" onClick={onCopy} type="button">
          Copy URL
        </button>
        <button className="admin-link-button" onClick={onEdit} type="button">
          Edit
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

function MediaLightbox({
  asset,
  onClose,
  onCopy,
  onEdit,
  onRemove,
}: {
  asset: MediaAsset | null;
  onClose: () => void;
  onCopy: () => void;
  onEdit: () => void;
  onRemove: () => void;
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
            src={publicMediaUrl(asset.bucket, asset.path)}
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
            <button onClick={onEdit} type="button">
              Edit details
            </button>
            <button
              className="admin-link-button--danger"
              onClick={onRemove}
              type="button"
            >
              Delete
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
