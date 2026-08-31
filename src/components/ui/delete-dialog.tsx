"use client";

import { useEffect, useRef } from "react";

export interface DeleteDialogProps {
  open: boolean;
  title: string;
  description?: string;
  preview?: string | null;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "warning" | "critical";
  isPending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteDialog({
  open,
  title,
  description,
  preview,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  variant = "warning",
  isPending = false,
  onConfirm,
  onCancel,
}: Readonly<DeleteDialogProps>) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const confirmRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // focus confirm for quick action, but keep trap
      requestAnimationFrame(() => confirmRef.current?.focus());
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // ESC and backdrop close handled via onCancel
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleCancel = (e: Event) => {
      e.preventDefault();
      onCancel();
    };
    dialog.addEventListener("cancel", handleCancel);
    return () => dialog.removeEventListener("cancel", handleCancel);
  }, [onCancel]);

  return (
    <dialog
      ref={dialogRef}
      aria-describedby={description || preview ? "delete-dialog-desc" : undefined}
      aria-label={title}
      className="admin-dialog"
      onClick={(e) => {
        if (e.target === dialogRef.current) onCancel();
      }}
    >
      <form
        method="dialog"
        onSubmit={(e) => {
          e.preventDefault();
          onConfirm();
        }}
      >
        <h3 className="admin-dialog__title">{title}</h3>
        {description ? (
          <p id="delete-dialog-desc" className="admin-dialog__desc">
            {description}
          </p>
        ) : null}
        {preview ? (
          <p className="admin-note" style={{ marginTop: "0.5rem", whiteSpace: "pre-wrap" }}>
            {preview}
          </p>
        ) : null}
        <div className="admin-dialog__actions">
          <button type="button" onClick={onCancel} disabled={isPending}>
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="submit"
            disabled={isPending}
            className={
              variant === "critical" ? "admin-link-button--danger" : "admin-link-button--danger"
            }
            style={
              variant === "critical"
                ? { background: "var(--color-error, #dc2626)", color: "white" }
                : undefined
            }
          >
            {isPending ? "…" : confirmLabel}
          </button>
        </div>
      </form>
    </dialog>
  );
}
