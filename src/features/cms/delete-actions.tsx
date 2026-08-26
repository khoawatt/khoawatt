"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { MediaBucket } from "./media";
import type { DeleteEntity } from "./delete-service";
import { ConfirmDeleteDialog, type DeleteDialogItem } from "./confirm-delete-dialog";

/**
 * Lightweight multi-select for admin list pages (issue #104). A page wraps its
 * table in <BulkSelectionProvider>, renders <SelectionCheckbox id=… /> in each
 * row plus a <BulkDeleteBar entity items=… />, and the bar shows a
 * "Delete N selected" action that opens the shared ConfirmDeleteDialog.
 */

interface BulkSelectionValue {
  selected: Set<string>;
  toggle: (id: string) => void;
  toggleAll: (ids: string[]) => void;
  clear: () => void;
  isSelected: (id: string) => boolean;
  count: number;
}

const BulkSelectionContext = createContext<BulkSelectionValue | null>(null);

export function BulkSelectionProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback((ids: string[]) => {
    setSelected((current) => {
      const allSelected = ids.every((id) => current.has(id));
      if (allSelected) {
        return new Set([...current].filter((id) => !ids.includes(id)));
      }
      const next = new Set(current);
      ids.forEach((id) => next.add(id));
      return next;
    });
  }, []);

  const clear = useCallback(() => setSelected(new Set()), []);

  const value = useMemo<BulkSelectionValue>(
    () => ({
      selected,
      toggle,
      toggleAll,
      clear,
      isSelected: (id) => selected.has(id),
      count: selected.size,
    }),
    [selected, toggle, toggleAll, clear],
  );

  return (
    <BulkSelectionContext.Provider value={value}>
      {children}
    </BulkSelectionContext.Provider>
  );
}

function useBulkSelection(): BulkSelectionValue {
  const value = useContext(BulkSelectionContext);
  if (!value) {
    throw new Error("useBulkSelection must be used within BulkSelectionProvider.");
  }
  return value;
}

interface SelectionCheckboxProps {
  id: string;
  label: string;
}

/** Row checkbox bound to the page-level bulk selection. */
export function SelectionCheckbox({ id, label }: SelectionCheckboxProps) {
  const { isSelected, toggle } = useBulkSelection();
  return (
    <input
      aria-label={`Select ${label}`}
      checked={isSelected(id)}
      className="admin-select-checkbox"
      onChange={() => toggle(id)}
      type="checkbox"
    />
  );
}

interface SelectAllCheckboxProps {
  ids: string[];
  label: string;
}

/** Header checkbox that selects every row on the page. */
export function SelectAllCheckbox({ ids, label }: SelectAllCheckboxProps) {
  const { isSelected, toggleAll } = useBulkSelection();
  const allSelected = ids.length > 0 && ids.every((id) => isSelected(id));
  return (
    <input
      aria-label={label}
      checked={allSelected}
      className="admin-select-checkbox"
      onChange={() => toggleAll(ids)}
      type="checkbox"
    />
  );
}

interface DeleteActionButtonProps {
  entity: DeleteEntity;
  item: DeleteDialogItem;
  bucket?: MediaBucket;
  noun: string;
  typeToConfirmThreshold?: number;
}

/** Per-row delete link that opens the shared confirm dialog. */
export function DeleteActionButton({
  entity,
  item,
  bucket,
  noun,
  typeToConfirmThreshold,
}: DeleteActionButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className="admin-link-button admin-link-button--danger"
        onClick={() => setOpen(true)}
        type="button"
      >
        Delete
      </button>
      <ConfirmDeleteDialog
        bucket={bucket}
        entity={entity}
        items={[item]}
        noun={noun}
        onClose={() => setOpen(false)}
        open={open}
        typeToConfirmThreshold={typeToConfirmThreshold}
      />
    </>
  );
}

interface BulkDeleteBarProps {
  entity: DeleteEntity;
  items: DeleteDialogItem[];
  bucket?: MediaBucket;
  noun: string;
  typeToConfirmThreshold?: number;
}

/**
 * Bulk action bar rendered while the selection is non-empty. Reads the shared
 * selection and opens the confirm dialog for the selected ids only.
 */
export function BulkDeleteBar({
  entity,
  items,
  bucket,
  noun,
  typeToConfirmThreshold,
}: BulkDeleteBarProps) {
  const { selected, clear } = useBulkSelection();
  const [open, setOpen] = useState(false);

  const selectedItems = useMemo(
    () => items.filter((item) => selected.has(item.id)),
    [items, selected],
  );

  // The bar is only meaningful while the provider is mounted with a selection.
  const count = selected.size;
  const hidden = count === 0;
  // If the selection empties, keep the dialog from staying open.
  const dialogOpen = open && count > 0;

  if (hidden) return null;

  return (
    <>
      <div className="admin-bulk-bar" role="status">
        <span>
          {count} selected
        </span>
        <div className="admin-bulk-bar__actions">
          <button
            className="admin-button-secondary"
            onClick={() => {
              clear();
              setOpen(false);
            }}
            type="button"
          >
            Clear selection
          </button>
          <button
            className="delete-dialog__confirm"
            onClick={() => setOpen(true)}
            type="button"
          >
            Delete selected
          </button>
        </div>
      </div>
      <ConfirmDeleteDialog
        bucket={bucket}
        entity={entity}
        items={selectedItems}
        noun={noun}
        onClose={() => setOpen(false)}
        open={dialogOpen}
        typeToConfirmThreshold={typeToConfirmThreshold}
      />
    </>
  );
}
