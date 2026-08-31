"use client";

import { useMemo, useState, useTransition } from "react";

import { createTag } from "@/app/admin/(dashboard)/blog/actions";
import type { AdminTagRow } from "@/app/admin/(dashboard)/blog/data";

interface TagSelectorProps {
  tags: AdminTagRow[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onTagsChange?: (tags: AdminTagRow[]) => void;
}

export function TagSelector({ tags, selectedIds, onToggle, onTagsChange }: Readonly<TagSelectorProps>) {
  const [search, setSearch] = useState("");
  const [newTagName, setNewTagName] = useState("");
  const [newTagError, setNewTagError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tags;
    return tags.filter(
      (t) => t.id.toLowerCase().includes(q) || t.nameEn.toLowerCase().includes(q) || t.nameVi.toLowerCase().includes(q),
    );
  }, [tags, search]);

  function addTag() {
    const name = newTagName.trim();
    if (!name) return;
    setNewTagError(null);
    startTransition(async () => {
      const result = await createTag(name);
      if (result.ok && result.id) {
        const newTag: AdminTagRow = { id: result.id, slug: result.id, nameEn: name, nameVi: name };
        // Optimistically update local tags if parent allows
        if (onTagsChange) onTagsChange([...tags, newTag]);
        onToggle(result.id);
        setNewTagName("");
      } else {
        setNewTagError(result.error ?? "Failed to create tag.");
      }
    });
  }

  return (
    <div className="admin-field">
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
        <input
          aria-label="Search tags"
          placeholder="Search tags…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1 }}
        />
        {search ? (
          <button type="button" className="admin-link-button" onClick={() => setSearch("")}>
            Clear
          </button>
        ) : null}
      </div>

      {filtered.length > 0 ? (
        <div className="admin-check-group" style={{ maxHeight: "12rem", overflowY: "auto", border: "1px solid var(--color-border)", borderRadius: "0.5rem", padding: "0.5rem" }}>
          {filtered.map((tag) => (
            <label className="admin-check" key={tag.id}>
              <input checked={selectedIds.includes(tag.id)} onChange={() => onToggle(tag.id)} type="checkbox" />
              <span>{tag.nameEn}</span>
              <span className="admin-note" style={{ marginLeft: "0.25rem" }}>({tag.id})</span>
            </label>
          ))}
        </div>
      ) : (
        <p className="admin-note">No tags match “{search}”.</p>
      )}

      <div className="admin-form-row" style={{ marginTop: "0.5rem" }}>
        <input
          aria-label="New tag name"
          onChange={(e) => setNewTagName(e.target.value)}
          placeholder="Quick-add a tag"
          value={newTagName}
        />
        <button disabled={isPending} onClick={addTag} type="button">
          Add
        </button>
      </div>
      {newTagError ? <p className="admin-error">{newTagError}</p> : null}
      <p className="admin-note" style={{ marginTop: "0.25rem" }}>
        {selectedIds.length} selected • {tags.length} total
      </p>
    </div>
  );
}
