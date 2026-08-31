"use client";

import Link from "next/link";
import { useState } from "react";

import { BulkDeleteBar } from "@/components/admin/bulk-delete-bar";

import type { AdminResumeCategory, AdminResumeEntry } from "./data";
import { ResumeDeleteButton } from "./resume-delete";

export function BulkResumeCategories({ categories }: { categories: AdminResumeCategory[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const allSelected = categories.length > 0 && categories.every((c) => selected.has(c.id));
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
    else setSelected(new Set(categories.map((c) => c.id)));
  }
  return (
    <>
      <BulkDeleteBar entity="resume_category" selectedIds={Array.from(selected)} onClear={() => setSelected(new Set())} onDone={() => setSelected(new Set())} label="resume categories" />
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th><input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all categories" /></th>
              <th>ID</th>
              <th>Name</th>
              <th>Order</th>
              <th><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <tr key={cat.id}>
                <td><input type="checkbox" checked={selected.has(cat.id)} onChange={() => toggle(cat.id)} aria-label={`Select ${cat.nameEn}`} /></td>
                <td>{cat.id}</td>
                <td>{cat.nameEn}</td>
                <td>{cat.order}</td>
                <td className="admin-row-actions">
                  <Link href={`/admin/resume/categories/${cat.id}`}>Edit</Link>
                  <ResumeDeleteButton id={cat.id} label={cat.nameEn} kind="category" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function BulkResumeEntries({ entries, categories }: { entries: AdminResumeEntry[]; categories: AdminResumeCategory[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const allSelected = entries.length > 0 && entries.every((e) => selected.has(e.id));
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
    else setSelected(new Set(entries.map((e) => e.id)));
  }
  return (
    <>
      <BulkDeleteBar entity="resume_entry" selectedIds={Array.from(selected)} onClear={() => setSelected(new Set())} onDone={() => setSelected(new Set())} label="resume entries" />
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th><input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all entries" /></th>
              <th>ID</th>
              <th>Title</th>
              <th>Category</th>
              <th>Publication</th>
              <th>Order</th>
              <th><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const cat = categories.find((c) => c.id === entry.categoryId);
              return (
                <tr key={entry.id}>
                  <td><input type="checkbox" checked={selected.has(entry.id)} onChange={() => toggle(entry.id)} aria-label={`Select ${entry.titleEn}`} /></td>
                  <td>{entry.id}</td>
                  <td>{entry.titleEn}</td>
                  <td>{cat?.nameEn ?? entry.categoryId}</td>
                  <td>{entry.draft ? <span className="admin-badge admin-badge--muted">Draft</span> : <span className="admin-badge admin-badge--success">Published</span>}</td>
                  <td>{entry.order}</td>
                  <td className="admin-row-actions">
                    <Link href={`/admin/resume/entries/${entry.id}`}>Edit</Link>
                    <ResumeDeleteButton id={entry.id} label={entry.titleEn} kind="entry" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
