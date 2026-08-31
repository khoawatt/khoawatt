"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { DeleteDialog } from "@/components/ui/delete-dialog";
import { bulkDelete, inspectDelete } from "@/features/cms/delete/actions";

import type { AdminPostRow } from "./data";
import { DeletePostButton } from "./delete-post";

export function BulkBlogTable({ posts }: { posts: AdminPostRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [inspectPreview, setInspectPreview] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkResult, setBulkResult] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const allSelected = selected.size === posts.length && posts.length > 0;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(posts.map((p) => p.id)));
  }

  useEffect(() => {
    if (!bulkOpen || selected.size === 0) return;
    let cancelled = false;
    (async () => {
      const res = await inspectDelete("blog_post", Array.from(selected));
      if (cancelled) return;
      if (res.ok && res.result) {
        const { deletable, blocked } = res.result;
        const lines: string[] = [];
        lines.push(`${deletable.length} will be moved to Trash`);
        if (blocked.length > 0) lines.push(`${blocked.length} blocked`);
        setInspectPreview(lines.join("\n"));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bulkOpen, selected]);

  function handleBulkConfirm() {
    const ids = Array.from(selected);
    startTransition(async () => {
      const res = await bulkDelete("blog_post", ids);
      if (res.ok && res.result) {
        const { deleted, blocked, failed } = res.result;
        const parts: string[] = [];
        if (deleted.length > 0) parts.push(`${deleted.length} moved to Trash`);
        if (blocked.length > 0) parts.push(`${blocked.length} blocked`);
        if (failed.length > 0) parts.push(`${failed.length} failed`);
        setBulkResult(parts.join(" — ") || "Done");
        setSelected(new Set());
        setBulkOpen(false);
        router.refresh();
      } else {
        setBulkResult(res.error ?? "Bulk delete failed.");
        setBulkOpen(false);
      }
    });
  }

  if (posts.length === 0) return <p className="admin-empty">No posts yet.</p>;

  return (
    <>
      {bulkResult ? <p className="admin-note" aria-live="polite">{bulkResult}</p> : null}
      {selected.size > 0 ? (
        <div style={{ marginBottom: "1rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <span className="admin-note">{selected.size} selected</span>
          <button type="button" className="admin-button admin-button--danger" onClick={() => setBulkOpen(true)} disabled={isPending}>
            Delete {selected.size} selected
          </button>
          <button type="button" className="admin-link-button" onClick={() => setSelected(new Set())}>Clear</button>
        </div>
      ) : null}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th scope="col"><input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all" /></th>
              <th scope="col">Title</th>
              <th scope="col">Category</th>
              <th scope="col">Status</th>
              <th scope="col">Published</th>
              <th scope="col"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => (
              <tr key={post.id}>
                <td><input type="checkbox" checked={selected.has(post.id)} onChange={() => toggle(post.id)} aria-label={`Select ${post.id}`} /></td>
                <td>{post.titleEn}</td>
                <td>{post.categoryNameEn}</td>
                <td><span className={`admin-badge ${post.status === "published" ? "admin-badge--success" : "admin-badge--muted"}`}>{post.status}</span></td>
                <td>{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : "—"}</td>
                <td className="admin-row-actions">
                  <Link href={`/admin/blog/${post.id}`}>Edit</Link>
                  <DeletePostButton id={post.id} title={post.titleEn} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <DeleteDialog
        open={bulkOpen}
        title={`Move ${selected.size} post(s) to Trash?`}
        description="Selected posts will be hidden and can be restored from Trash within 30 days."
        preview={inspectPreview}
        confirmLabel={`Move ${selected.size} to Trash`}
        isPending={isPending}
        onConfirm={handleBulkConfirm}
        onCancel={() => setBulkOpen(false)}
      />
    </>
  );
}
