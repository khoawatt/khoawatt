"use client";

import { useEffect, useRef, useState } from "react";

type MomoQrTriggerProps = {
  href: string;
  label: string;
  variant: "footer-pill" | "article-text";
};

export function MomoQrTrigger({ href, label, variant }: Readonly<MomoQrTriggerProps>) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
      dialog.showModal();
      // focus close button for accessibility
      const closeBtn = dialog.querySelector<HTMLButtonElement>("[data-close]");
      requestAnimationFrame(() => closeBtn?.focus());
    } else if (!open && dialog.open) {
      dialog.close();
      // restore focus to trigger after close
      const restoreTarget = previousFocusRef.current ?? triggerRef.current;
      requestAnimationFrame(() => restoreTarget?.focus());
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onCancel = (e: Event) => {
      e.preventDefault();
      setOpen(false);
    };
    const onClose = () => {
      // native close (e.g. dialog.close() from effect) syncs state if needed
      if (open) setOpen(false);
    };
    dialog.addEventListener("cancel", onCancel);
    dialog.addEventListener("close", onClose);
    return () => {
      dialog.removeEventListener("cancel", onCancel);
      dialog.removeEventListener("close", onClose);
    };
  }, [open]);

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <>
      {variant === "footer-pill" ? (
        <button
          ref={triggerRef}
          type="button"
          aria-haspopup="dialog"
          aria-label={label}
          data-platform="momo"
          className="site-footer__tip-link"
          onClick={() => setOpen(true)}
        >
          <span aria-hidden="true" className="site-footer__tip-icon-text" data-platform="momo">
            MoMo
          </span>
        </button>
      ) : (
        <button
          ref={triggerRef}
          type="button"
          aria-haspopup="dialog"
          aria-label={label}
          className="text-sm font-medium transition-colors hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
          style={{ color: "#ec4899" }}
          onClick={() => setOpen(true)}
        >
          Momo
        </button>
      )}

      <dialog
        ref={dialogRef}
        aria-label={label}
        className="momo-qr-dialog"
        onClick={(e) => {
          if (e.target === dialogRef.current) handleClose();
        }}
        style={{
          padding: 0,
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-xl)",
          background: "var(--color-surface-elevated, var(--color-surface))",
          boxShadow: "var(--shadow-lg)",
          width: "min(22rem, calc(100vw - 2rem))",
          maxWidth: "22rem",
          margin: "auto",
        }}
      >
        {/* header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.75rem 1rem",
            borderBottom: "1px solid var(--color-border)",
          }}
        >
          <span style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--color-text)" }}>{label} QR</span>
          <button
            data-close
            type="button"
            aria-label="Close"
            onClick={handleClose}
            style={{
              display: "inline-grid",
              width: "2rem",
              height: "2rem",
              placeItems: "center",
              border: "1px solid var(--color-border)",
              borderRadius: "9999px",
              background: "var(--color-surface)",
              color: "var(--color-text)",
              cursor: "pointer",
            }}
          >
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div style={{ padding: "1rem", display: "grid", placeItems: "center", background: "white", borderRadius: "0 0 var(--radius-xl) var(--radius-xl)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt={`${label} QR code`}
            src={href}
            width={400}
            height={400}
            style={{ width: "100%", maxWidth: "20rem", height: "auto", objectFit: "contain", aspectRatio: "1" }}
          />
        </div>
      </dialog>
    </>
  );
}
