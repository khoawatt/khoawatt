"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

import { DeleteDialog } from "@/components/ui/delete-dialog";
import { inspectDelete } from "@/features/cms/delete/actions";

import { deleteTag } from "../actions";
import type { AdminTagRowWithUsage } from "../data";

interface TagsManagerProps {
  tags: AdminTagRowWithUsage[];
  total: number;
  totalPages: number;
  currentPage: number;
  search: string;
}

export function TagsManager({ tags, total, totalPages, currentPage, search }: Readonly<TagsManagerProps>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [localSearch, setLocalSearch] = useState(search);
  const [deleteTarget, setDeleteTarget] = useState<AdminTagRowWithUsage | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === "") params.delete(k);
      else params.set(k, v);
    }
    params.delete("page");
    router.push(`?${params.toString()}`);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    updateParams({ q: localSearch.trim() || null });
  }

  function goPage(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (page <= 1) params.delete("page");
    else params.set("page", String(page));
    router.push(`?${params.toString()}`);
  }

  // Inspect preview for delete
  async function openDelete(tag: AdminTagRowWithUsage) {
    setDeleteTarget(tag);
    setError(null);
    const res = await inspectDelete("blog_tag", [tag.id]);
    if (res.ok && res.result) {
      const deps = res.result.dependencies;
      if (deps.length > 0) {
        const lines = deps.map((d) => `• Used by ${d.count} post(s) — will be blocked`);
        setPreview(lines.join("\n"));
      } else setPreview(null);
      if (res.result.blocked.includes(tag.id)) {
        setPreview((prev) => (prev ? prev + "\n" : "") + "⚠ This tag is currently in use and cannot be deleted until removed from posts.");
      }
    }
  }

  function handleConfirmDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      const res = await deleteTag(deleteTarget.id);
      if (res.ok) {
        setDeleteTarget(null);
        setPreview(null);
        router.refresh();
      } else {
        setError(res.error ?? "Failed to delete.");
        setDeleteTarget(null);
        setPreview(null);
      }
    });
  }

  return (
    <>
      <form onSubmit={handleSearch} style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        <input
          aria-label="Search tags"
          placeholder="Search by id or name…"
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          style={{ flex: 1 }}
        />
        <button type="submit">Search</button>
        {search ? (
          <button type="button" className="admin-link-button" onClick={() => updateParams({ q: null })}>
            Clear
          </button>
        ) : null}
      </form>

      <p className="admin-note">
        {total} tag(s) • Page {currentPage} of {totalPages}
      </p>
      {error ? <p className="admin-error">{error}</p> : null}

      {tags.length === 0 ? (
        <p className="admin-empty">No tags found.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name (EN / VI)</th>
                <th>Usage</th>
                <th><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {tags.map((tag) => (
                <tr key={tag.id}>
                  <td><code>{tag.id}</code></td>
                  <td>{tag.nameEn} / {tag.nameVi}</td>
                  <td>
                    <span className={`admin-badge ${tag.usageCount > 0 ? "admin-badge--success" : "admin-badge--muted"}`}>
                      {tag.usageCount} post(s)
                    </span>
                  </td>
                  <td className="admin-row-actions">
                    <Link href={`/admin/blog/tags/${tag.id}`}>Edit</Link>
                    <button type="button" className="admin-link-button admin-link-button--danger" onClick={() => openDelete(tag)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 ? (
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem", justifyContent: "center" }}>
          <button type="button" disabled={currentPage <= 1} onClick={() => goPage(currentPage - 1)}>Prev</button>
          <span className="admin-note">Page {currentPage} / {totalPages}</span>
          <button type="button" disabled={currentPage >= totalPages} onClick={() => goPage(currentPage + 1)}>Next</button>
        </div>
      ) : null}

      <DeleteDialog
        open={!!deleteTarget}
        title={deleteTarget ? `Move tag "${deleteTarget.nameEn}" to Trash?` : "Move to Trash?"}
        description={deleteTarget?.usageCount ? `This tag is used by ${deleteTarget.usageCount} post(s) and will be blocked until removed.` : "This tag will be hidden and can be restored from Trash within 30 days."}
        preview={preview}
        confirmLabel="Move to Trash"
        isPending={isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeleteTarget(null);
          setPreview(null);
        }}
      />
    </>
  );
}
