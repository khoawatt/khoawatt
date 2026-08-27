"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import type { MediaBucket } from "./media";
import {
  analyzeDelete,
  deleteEntities,
  type DeleteEntity,
  type DeleteResult,
  type ImpactReport,
} from "./delete-service";

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

/** Default batch size that triggers the type-to-confirm gate. */
const DEFAULT_TYPE_TO_CONFIRM_THRESHOLD = 10;

/** Number of impact detail rows shown before collapsing the rest. */
const DETAIL_ROWS_LIMIT = 10;

export interface DeleteDialogItem {
  id: string;
  label: string;
}

interface ConfirmDeleteDialogProps {
  open: boolean;
  onClose: () => void;
  entity: DeleteEntity;
  items: DeleteDialogItem[];
  bucket?: MediaBucket;
  /** Human noun for the entity, e.g. "blog post". Used in copy. */
  noun: string;
  /** Type-to-confirm kicks in at or above this many selected items. */
  typeToConfirmThreshold?: number;
}

function impactSummary(report: ImpactReport | null) {
  if (!report) return "Analyzing impact…";
  const parts = [
    `${report.items.length} item${report.items.length === 1 ? "" : "s"}`,
    `${report.totalDependent} dependent record${report.totalDependent === 1 ? "" : "s"}`,
    `${report.totalExternal} storage file${report.totalExternal === 1 ? "" : "s"}`,
  ];
  if (report.blockedCount > 0) {
    parts.push(`${report.blockedCount} blocked`);
  }
  return parts.join(" · ");
}

/**
 * Shared destructive-action dialog for the hard-delete pipeline (#104).
 *
 * Flow: on open it runs the server-side impact analysis and shows the summary;
 * blocked items are surfaced with their reasons. The confirm button is gated by
 * a type-to-confirm threshold for large batches. On confirm it calls the
 * pipeline server action, which re-analyzes server-side, deletes, cleans up
 * storage, writes the audit row and revalidates caches. Partial success is
 * shown inline ({deleted, failed[]}).
 */
export function ConfirmDeleteDialog({
  open,
  onClose,
  entity,
  items,
  bucket,
  noun,
  typeToConfirmThreshold = DEFAULT_TYPE_TO_CONFIRM_THRESHOLD,
}: Readonly<ConfirmDeleteDialogProps>) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);

  const [report, setReport] = useState<ImpactReport | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [result, setResult] = useState<DeleteResult | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [prevOpen, setPrevOpen] = useState(open);

  // Reset per open by adjusting state during render (avoids setState-in-effect).
  if (open !== prevOpen) {
    setPrevOpen(open);
    setReport(null);
    setAnalyzeError(null);
    setResult(null);
    setDeleting(false);
    setExpanded(false);
    setConfirmText("");
  }

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Run the impact analysis whenever the dialog is opened. The id key keeps
  // the effect stable across parent re-renders (array identity changes).
  const idsKey = items.map((item) => item.id).join("\u0000");
  useEffect(() => {
    if (!open) return;

    const ids = idsKey === "" ? [] : idsKey.split("\u0000");
    analyzeDelete({ entity, ids })
      .then(setReport)
      .catch((error: unknown) => {
        setAnalyzeError(
          error instanceof Error ? error.message : "Could not analyze impact.",
        );
      });
  }, [open, entity, idsKey]);

  // Focus management: trap Tab inside the dialog, restore focus on close.
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

  const labelById = new Map(items.map((item) => [item.id, item.label]));
  const count = items.length;
  const needsConfirm = count >= typeToConfirmThreshold;
  const confirmReady = !needsConfirm || confirmText === String(count);
  const blockedItems =
    report?.items.filter((item) => item.blocked !== null) ?? [];
  const deletableItems =
    report?.items.filter((item) => item.blocked === null) ?? [];
  const visibleItems = expanded ? deletableItems : deletableItems.slice(0, DETAIL_ROWS_LIMIT);

  function handleBackdropClick(event: React.MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget && !deleting) {
      onCloseRef.current();
    }
  }

  async function handleConfirm() {
    if (!confirmReady || deleting) return;
    setDeleting(true);
    setResult(null);
    const ids = items.map((item) => item.id);
    const outcome = await deleteEntities({ entity, ids, bucket });
    setResult(outcome);
    setDeleting(false);
    if (outcome.deleted > 0) {
      router.refresh();
    }
    // A fully successful batch closes the dialog (the refreshed list reflects
    // it); partial success stays open so the failures can be read.
    if (outcome.failed.length === 0 && outcome.deleted > 0) {
      onCloseRef.current();
    }
  }

  const deleteButtonLabel = result
    ? result.deleted > 0
      ? "Deleted"
      : "Try again"
    : deleting
      ? "Deleting…"
      : confirmReady
        ? "Delete permanently"
        : `Type ${count} to confirm`;

  return createPortal(
    <div className="delete-dialog-backdrop" onClick={handleBackdropClick}>
      <div
        aria-labelledby="delete-dialog-title"
        aria-modal="true"
        className="delete-dialog"
        ref={dialogRef}
        role="dialog"
      >
        <div className="delete-dialog__header">
          <h2 id="delete-dialog-title" className="delete-dialog__title">
            Delete {count} {noun}
            {count === 1 ? "" : "s"} permanently?
          </h2>
          <button
            aria-label="Close"
            className="delete-dialog__close"
            disabled={deleting}
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

        <div className="delete-dialog__body">
          <p className="delete-dialog__intro">
            This removes the {noun} permanently. There is no undo.
          </p>

          {analyzeError ? (
            <p className="admin-error" role="alert">
              {analyzeError}
            </p>
          ) : !report ? (
            <p className="delete-dialog__loading" role="status">
              {impactSummary(null)}
            </p>
          ) : (
            <>
              <p className="delete-dialog__summary" role="status">
                {impactSummary(report)}
              </p>

              {blockedItems.length > 0 ? (
                <div className="delete-dialog__blocked" role="alert">
                  <p className="delete-dialog__blocked-title">
                    {blockedItems.length} blocked:
                  </p>
                  <ul>
                    {blockedItems.map((item) => (
                      <li key={item.id}>
                        <strong>{labelById.get(item.id) ?? item.id}</strong> —{" "}
                        {item.blocked}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {deletableItems.length > 0 ? (
                <ul className="delete-dialog__details">
                  {visibleItems.map((item) => (
                    <li key={item.id}>
                      <span className="delete-dialog__detail-label">
                        {labelById.get(item.id) ?? item.id}
                      </span>
                      <span className="delete-dialog__detail-meta">
                        {item.dependent} dependent
                        {item.dependent === 1 ? "" : "s"}
                        {item.external > 0 ? ` · ${item.external} storage file${item.external === 1 ? "" : "s"}` : ""}
                      </span>
                    </li>
                  ))}
                  {deletableItems.length > DETAIL_ROWS_LIMIT ? (
                    <li>
                      <button
                        className="delete-dialog__collapse"
                        onClick={() => setExpanded((value) => !value)}
                        type="button"
                      >
                        {expanded
                          ? "Collapse"
                          : `Show all ${deletableItems.length} items`}
                      </button>
                    </li>
                  ) : null}
                </ul>
              ) : null}

              {result ? (
                <div
                  className={
                    result.failed.length === 0
                      ? "delete-dialog__result"
                      : "delete-dialog__result delete-dialog__result--partial"
                  }
                  role="status"
                >
                  <p>
                    Deleted {result.deleted} of {count}.
                  </p>
                  {result.failed.length > 0 ? (
                    <ul>
                      {result.failed.map((failure) => (
                        <li key={failure.id}>
                          <strong>{labelById.get(failure.id) ?? failure.id}</strong> —{" "}
                          {failure.reason}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
            </>
          )}
        </div>

        <div className="delete-dialog__footer">
          {needsConfirm ? (
            <label className="delete-dialog__confirm-gate">
              <span>
                Type <strong>{count}</strong> to enable deletion
              </span>
              <input
                aria-label={`Type ${count} to confirm deletion`}
                autoComplete="off"
                inputMode="numeric"
                onChange={(event) => setConfirmText(event.target.value)}
                pattern="[0-9]*"
                type="text"
                value={confirmText}
              />
            </label>
          ) : null}

          <div className="delete-dialog__actions">
            <button
              className="admin-button-secondary"
              disabled={deleting}
              onClick={() => onCloseRef.current()}
              type="button"
            >
              Cancel
            </button>
            <button
              className="delete-dialog__confirm"
              disabled={!confirmReady || deleting}
              onClick={handleConfirm}
              type="button"
            >
              {deleteButtonLabel}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
