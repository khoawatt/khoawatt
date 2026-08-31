"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { DeleteDialog } from "@/components/ui/delete-dialog";
import { bulkDelete, inspectDelete } from "@/features/cms/delete/actions";

import type { AdminProjectRow } from "./data";
import { DeleteProjectButton } from "./delete-project";

export function BulkProjectsTable({ projects }: { projects: AdminProjectRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [inspectPreview, setInspectPreview] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkResult, setBulkResult] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const allSelected = selected.size === projects.length && projects.length > 0;

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
    else setSelected(new Set(projects.map((p) => p.id)));
  }

  useEffect(() => {
    if (!bulkOpen || selected.size === 0) return;
    let cancelled = false;
    (async () => {
      const res = await inspectDelete("project", Array.from(selected));
      if (cancelled) return;
      if (res.ok && res.result) {
        const { deletable, blocked, dependencies } = res.result;
        const lines: string[] = [];
        lines.push(`${deletable.length} will be moved to Trash`);
        if (blocked.length > 0) lines.push(`${blocked.length} blocked (in use or protected)`);
        if (dependencies.length > 0) {
          for (const d of dependencies) {
            if (d.field === "reassign_uncategorized") lines.push(`• ${d.count} post(s) will be moved to Uncategorized`);
          }
        }
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
      const res = await bulkDelete("project", ids);
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

  if (projects.length === 0) return <p className="admin-empty">No projects yet.</p>;

  return (
    <>
      {bulkResult ? <p className="admin-note" aria-live="polite">{bulkResult}</p> : null}
      {selected.size > 0 ? (
        <div style={{ marginBottom: "1rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <span className="admin-note">{selected.size} selected</span>
          <button type="button" className="admin-button admin-button--danger" onClick={() => setBulkOpen(true)} disabled={isPending}>
            Delete {selected.size} selected
          </button>
          <button type="button" className="admin-link-button" onClick={() => setSelected(new Set())}>
            Clear
          </button>
        </div>
      ) : null}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th scope="col">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all" />
              </th>
              <th scope="col">ID</th>
              <th scope="col">Title</th>
              <th scope="col">Featured</th>
              <th scope="col">Status</th>
              <th scope="col">Published</th>
              <th scope="col">Order</th>
              <th scope="col"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr key={project.id}>
                <td>
                  <input type="checkbox" checked={selected.has(project.id)} onChange={() => toggle(project.id)} aria-label={`Select ${project.id}`} />
                </td>
                <td>{project.id}</td>
                <td>{project.titleEn}</td>
                <td>{project.featured ? <span className="admin-badge admin-badge--success">Featured</span> : null}</td>
                <td><span className={`admin-badge ${project.status === "active" ? "admin-badge--success" : "admin-badge--muted"}`}>{project.status}</span></td>
                <td><span className={`admin-badge ${project.published ? "admin-badge--success" : "admin-badge--muted"}`}>{project.published ? "Published" : "Draft"}</span></td>
                <td>{project.order}</td>
                <td className="admin-row-actions">
                  <Link href={`/admin/projects/${project.id}`}>Edit</Link>
                  <DeleteProjectButton id={project.id} title={project.titleEn} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <DeleteDialog
        open={bulkOpen}
        title={`Move ${selected.size} project(s) to Trash?`}
        description="Selected projects will be hidden and can be restored from Trash within 30 days."
        preview={inspectPreview}
        confirmLabel={`Move ${selected.size} to Trash`}
        isPending={isPending}
        onConfirm={handleBulkConfirm}
        onCancel={() => setBulkOpen(false)}
      />
    </>
  );
}
