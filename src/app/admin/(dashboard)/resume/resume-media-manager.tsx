"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { publicMediaUrl } from "@/features/cms/media-url";

import { MediaPickerModal } from "../media/media-picker-modal";
import type { AdminResumeMedia } from "./data";
import { addResumeMedia, deleteResumeMedia, updateResumeMedia } from "./media-actions";

interface ResumeMediaManagerProps {
  entryId: string;
  initialMedia: AdminResumeMedia[];
}

export function ResumeMediaManager({ entryId, initialMedia }: Readonly<ResumeMediaManagerProps>) {
  const router = useRouter();
  const [media, setMedia] = useState<AdminResumeMedia[]>(initialMedia);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editing, setEditing] = useState<AdminResumeMedia | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handlePick(asset: { path: string; altEn: string; altVi: string }) {
    setError(null);
    startTransition(async () => {
      const result = await addResumeMedia({
        entryId,
        path: asset.path,
        altEn: asset.altEn || asset.path,
        altVi: asset.altVi || asset.path,
      });
      if (result.ok) {
        router.refresh();
        setPickerOpen(false);
        // Let the server revalidation repopulate; optimistically keep picker closed
      } else {
        setError(result.error ?? "Failed to add media.");
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this image from the entry?")) return;
    startTransition(async () => {
      const result = await deleteResumeMedia(id);
      if (result.ok) {
        setMedia((prev) => prev.filter((m) => m.id !== id));
        router.refresh();
      } else {
        setError(result.error ?? "Failed to delete.");
      }
    });
  }

  function handleSaveEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    const fd = new FormData(e.currentTarget);
    const altEn = String(fd.get("altEn") ?? "");
    const altVi = String(fd.get("altVi") ?? "");
    const captionEn = String(fd.get("captionEn") ?? "");
    const captionVi = String(fd.get("captionVi") ?? "");
    startTransition(async () => {
      const result = await updateResumeMedia({ id: editing.id, altEn, altVi, captionEn, captionVi });
      if (result.ok) {
        setMedia((prev) => prev.map((m) => (m.id === editing.id ? { ...m, altEn, altVi, captionEn: captionEn || null, captionVi: captionVi || null } : m)));
        setEditing(null);
        router.refresh();
      } else {
        setError(result.error ?? "Failed to update.");
      }
    });
  }

  if (!entryId) {
    return <p className="admin-note">Save the entry first to manage images.</p>;
  }

  return (
    <div className="admin-media-manager">
      <div className="admin-section-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h3 style={{ margin: 0 }}>Images</h3>
        <button type="button" onClick={() => setPickerOpen(true)} className="admin-button">
          Add image
        </button>
      </div>
      <p className="admin-hint">Pick from Resume media library; images are served via the gated /api/resume-media route.</p>

      {media.length === 0 ? (
        <p className="admin-empty">No images yet. Pick from Resume media library.</p>
      ) : (
        <ul className="admin-media-grid">
          {media.map((item) => (
            <li key={item.id} className="admin-media-card">
              <button className="admin-media-card__pick" onClick={() => setEditing(item)} type="button" title={`${item.altEn || item.id} — edit`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt={item.altEn || item.id}
                  className="admin-media-card__thumb"
                  height={128}
                  loading="lazy"
                  src={item.thumbnailSrc.startsWith("/api/resume-media/") ? item.thumbnailSrc : publicMediaUrl("resume-media", item.thumbnailSrc.replace("/api/resume-media/", ""))}
                  width={192}
                />
                <span className="admin-media-card__title">{item.altEn || item.id}</span>
              </button>

              <p className="admin-media-card__meta">
                <code>{item.id}</code>
                <span>
                  {item.width && item.height ? `${item.width}×${item.height} · ` : ""}
                  {item.captionEn || item.captionVi ? (item.captionEn ?? item.captionVi) : "no caption"}
                </span>
              </p>

              <div className="admin-media-card__actions">
                <button className="admin-link-button" onClick={() => setEditing(item)} type="button">
                  Edit
                </button>
                <button
                  className="admin-link-button admin-link-button--danger"
                  disabled={isPending}
                  onClick={() => handleDelete(item.id)}
                  type="button"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {error ? (
        <p className="admin-error" role="alert">
          {error}
        </p>
      ) : null}

      <MediaPickerModal bucket="resume-media" open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={handlePick} />

      <ResumeMediaEditDialog asset={editing} onClose={() => setEditing(null)} onSave={handleSaveEdit} />
    </div>
  );
}

function ResumeMediaEditDialog({
  asset,
  onClose,
  onSave,
}: {
  asset: AdminResumeMedia | null;
  onClose: () => void;
  onSave: (e: React.FormEvent<HTMLFormElement>) => void;
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
      aria-label={asset ? `Edit ${asset.id}` : "Edit media"}
      className="admin-dialog"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
      ref={dialogRef}
    >
      {asset ? (
        <form onSubmit={onSave}>
          <h3 className="admin-dialog__title">Edit image</h3>
          <code className="admin-dialog__path">{asset.id}</code>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt={asset.altEn} src={asset.thumbnailSrc} style={{ width: "100%", maxHeight: 180, objectFit: "cover", borderRadius: 8, margin: "0.75rem 0" }} />

          <label className="admin-field">
            <span>Alt EN</span>
            <input name="altEn" defaultValue={asset.altEn} required />
          </label>
          <label className="admin-field">
            <span>Alt VI</span>
            <input name="altVi" defaultValue={asset.altVi} required />
          </label>
          <label className="admin-field">
            <span>Caption EN</span>
            <input name="captionEn" defaultValue={asset.captionEn ?? ""} />
          </label>
          <label className="admin-field">
            <span>Caption VI</span>
            <input name="captionVi" defaultValue={asset.captionVi ?? ""} />
          </label>

          <div className="admin-dialog__actions">
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit">Save</button>
          </div>
        </form>
      ) : null}
    </dialog>
  );
}
