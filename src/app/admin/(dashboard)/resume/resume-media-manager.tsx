"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

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
        // Optimistically add to local state for immediate feedback
        const newItem: AdminResumeMedia = {
          id: `${entryId}-${asset.path.replace(/[^a-zA-Z0-9]/g, "-")}`,
          resumeEntryId: entryId,
          thumbnailSrc: `/api/resume-media/${encodeURIComponent(asset.path)}`,
          fullSrc: `/api/resume-media/${encodeURIComponent(asset.path)}`,
          width: null,
          height: null,
          altEn: asset.altEn,
          altVi: asset.altVi,
          captionEn: null,
          captionVi: null,
        };
        setMedia((prev) => [...prev, newItem]);
        setPickerOpen(false);
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

  function handleUpdate(id: string, altEn: string, altVi: string, captionEn: string, captionVi: string) {
    startTransition(async () => {
      const result = await updateResumeMedia({ id, altEn, altVi, captionEn, captionVi });
      if (result.ok) {
        setMedia((prev) => prev.map((m) => (m.id === id ? { ...m, altEn, altVi, captionEn: captionEn || null, captionVi: captionVi || null } : m)));
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
      <div className="admin-section-head">
        <h3>Images</h3>
        <button type="button" onClick={() => setPickerOpen(true)} className="admin-button">
          Add image
        </button>
      </div>

      {media.length === 0 ? (
        <p className="admin-empty">No images yet. Pick from Resume media library.</p>
      ) : (
        <ul className="admin-media-grid">
          {media.map((item) => (
            <li key={item.id} className="admin-media-item">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.thumbnailSrc} alt={item.altEn} width={160} height={90} style={{ objectFit: "cover", width: "100%", height: 90 }} />
              <div className="admin-media-meta">
                <small>{item.id}</small>
                <label className="admin-field">
                  <span>Alt EN</span>
                  <input
                    defaultValue={item.altEn}
                    onBlur={(e) => handleUpdate(item.id, e.target.value, item.altVi, item.captionEn ?? "", item.captionVi ?? "")}
                  />
                </label>
                <label className="admin-field">
                  <span>Alt VI</span>
                  <input
                    defaultValue={item.altVi}
                    onBlur={(e) => handleUpdate(item.id, item.altEn, e.target.value, item.captionEn ?? "", item.captionVi ?? "")}
                  />
                </label>
                <label className="admin-field">
                  <span>Caption EN</span>
                  <input
                    defaultValue={item.captionEn ?? ""}
                    onBlur={(e) => handleUpdate(item.id, item.altEn, item.altVi, e.target.value, item.captionVi ?? "")}
                  />
                </label>
                <label className="admin-field">
                  <span>Caption VI</span>
                  <input
                    defaultValue={item.captionVi ?? ""}
                    onBlur={(e) => handleUpdate(item.id, item.altEn, item.altVi, item.captionEn ?? "", e.target.value)}
                  />
                </label>
                <button type="button" className="admin-link-button admin-link-button--danger" disabled={isPending} onClick={() => handleDelete(item.id)}>
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
    </div>
  );
}
