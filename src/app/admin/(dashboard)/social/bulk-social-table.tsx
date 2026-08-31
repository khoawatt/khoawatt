"use client";

import Link from "next/link";
import { useState } from "react";

import { BulkDeleteBar } from "@/components/admin/bulk-delete-bar";

import type { AdminSocialLink } from "./data";
import { DeleteSocialButton } from "./delete-social";

export function BulkSocialTable({ links }: { links: AdminSocialLink[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const allSelected = links.length > 0 && links.every((l) => selected.has(l.id));

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
    else setSelected(new Set(links.map((l) => l.id)));
  }

  if (links.length === 0) return <p className="admin-empty">No social links yet.</p>;

  return (
    <>
      <BulkDeleteBar entity="social" selectedIds={Array.from(selected)} onClear={() => setSelected(new Set())} onDone={() => setSelected(new Set())} label="social links" />
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th><input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all" /></th>
              <th>Label</th>
              <th>URL</th>
              <th>Order</th>
              <th><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {links.map((link) => (
              <tr key={link.id}>
                <td><input type="checkbox" checked={selected.has(link.id)} onChange={() => toggle(link.id)} aria-label={`Select ${link.label}`} /></td>
                <td>{link.label}</td>
                <td style={{ maxWidth: "20rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{link.url}</td>
                <td>{link.order}</td>
                <td className="admin-row-actions">
                  <Link href={`/admin/social/${link.id}`}>Edit</Link>
                  <DeleteSocialButton id={link.id} label={link.label} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
