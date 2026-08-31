"use client";

import { useEffect, useRef, useState } from "react";

interface LinkInsertButtonProps {
  onInsert: (link: { url: string; text: string }) => void;
  getSelectedText?: () => string;
}

export function LinkInsertButton({
  onInsert,
  getSelectedText,
}: Readonly<LinkInsertButtonProps>) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const urlInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // Prefill text from selection if available — defer to avoid cascading render warning
      const selected = getSelectedText?.() ?? "";
      if (selected) {
        queueMicrotask(() => setText(selected));
      }
      requestAnimationFrame(() => urlInputRef.current?.focus());
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  function resetAndClose() {
    setOpen(false);
    setUrl("");
    setText("");
    setError(null);
  }

  function handleInsert() {
    const trimmedUrl = url.trim();
    const trimmedText = text.trim() || trimmedUrl;

    if (!trimmedUrl) {
      setError("URL is required.");
      return;
    }

    // Basic URL validation: allow http, https, mailto, tel, and relative paths
    const isValid =
      /^(https?:\/\/|mailto:|tel:|\/|#)/i.test(trimmedUrl) ||
      /^[\w.-]+\.[\w]{2,}/.test(trimmedUrl) ||
      trimmedUrl.startsWith("/");

    if (!isValid) {
      // Still allow but warn? For now, allow any non-empty string that looks like a URL
      // We will just check for spaces
      if (/\s/.test(trimmedUrl)) {
        setError("URL should not contain spaces.");
        return;
      }
    }

    onInsert({ url: trimmedUrl, text: trimmedText });
    resetAndClose();
  }

  return (
    <>
      <button
        aria-expanded={open}
        className="admin-link-button"
        onClick={() => setOpen(true)}
        type="button"
      >
        <svg aria-hidden="true" fill="none" height="14" viewBox="0 0 24 24" width="14">
          <path d="M10 13a5 5 0 0 0 7.54 0l1.5-1.5a5 5 0 0 0-7.07-7.07L10.5 5.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M14 11a5 5 0 0 0-7.54 0l-1.5 1.5a5 5 0 0 0 7.07 7.07l.92-.92" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Insert link
      </button>
      <dialog
        aria-label="Insert link"
        className="admin-dialog"
        onCancel={(event) => {
          event.preventDefault();
          resetAndClose();
        }}
        onClick={(event) => {
          if (event.target === dialogRef.current) resetAndClose();
        }}
        onClose={resetAndClose}
        ref={dialogRef}
      >
        <div className="admin-form">
          <h3 className="admin-dialog__title">Insert link</h3>
          <p className="admin-note">
            Add a URL and link text. It will be inserted as <code>[text](url)</code> in Markdown.
          </p>
          <label className="admin-field">
            <span>URL</span>
            <input
              ref={urlInputRef}
              type="text"
              placeholder="https://example.com or /blog/my-post"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleInsert();
                }
              }}
            />
          </label>
          <label className="admin-field">
            <span>Link text</span>
            <input
              type="text"
              placeholder="Display text (defaults to URL)"
              value={text}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleInsert();
                }
              }}
            />
          </label>
          {error ? (
            <p className="admin-error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="admin-form-actions">
            <button type="button" onClick={handleInsert}>
              Insert
            </button>
            <button type="button" onClick={resetAndClose}>
              Cancel
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
