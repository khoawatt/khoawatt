"use client";

import Link from "next/link";
import { useState } from "react";

import { BulkDeleteBar } from "@/components/admin/bulk-delete-bar";

import type { AdminCategoryRow } from "../data";
import { DeleteCategoryButton } from "./delete-category";

export function BulkCategoriesTable({ categories }: { categories: AdminCategoryRow[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const allSelected = categories.length > 0 && categories.every((c) => selected.has(c.id) && c.id !== "uncategorized");

  function toggle(id: string) {
    if (id === "uncategorized") return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(categories.filter((c) => c.id !== "uncategorized").map((c) => c.id)));
  }

  if (categories.length === 0) return <p className="admin-empty">No categories yet.</p>;

  return (
    <>
      <BulkDeleteBar entity="blog_category" selectedIds={Array.from(selected)} onClear={() => setSelected(new Set())} onDone={() => setSelected(new Set())} label="categories" />
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th><input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all" /></th>
              <th>ID</th>
              <th>Name</th>
              <th>Order</th>
              <th><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <tr key={cat.id}>
                <td><input type="checkbox" checked={selected.has(cat.id)} onChange={() => toggle(cat.id)} disabled={cat.id === "uncategorized"} aria-label={`Select ${cat.id}`} /></td>
                <td>{cat.id}</td>
                <td>{cat.nameEn} / {cat.nameVi}</td>
                <td>{cat.sortOrder}</td>
                <td className="admin-row-actions">
                  <Link href={`/admin/blog/categories/${cat.id}`}>Edit</Link>
                  {cat.id !== "uncategorized" ? <DeleteCategoryButton id={cat.id} name={cat.nameEn} /> : <span className="admin-note">protected</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
