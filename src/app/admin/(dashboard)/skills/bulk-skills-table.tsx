"use client";

import Link from "next/link";
import { useState } from "react";

import { BulkDeleteBar } from "@/components/admin/bulk-delete-bar";

import type { AdminSkillRow } from "./data";
import { DeleteSkillButton } from "./delete-skill";

export function BulkSkillsTable({ skills }: { skills: AdminSkillRow[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const allSelected = skills.length > 0 && skills.every((s) => selected.has(s.id));
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
    else setSelected(new Set(skills.map((s) => s.id)));
  }
  return (
    <>
      <BulkDeleteBar entity="skill" selectedIds={Array.from(selected)} onClear={() => setSelected(new Set())} onDone={() => setSelected(new Set())} label="skills" />
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
            {skills.map((skill) => (
              <tr key={skill.id}>
                <td><input type="checkbox" checked={selected.has(skill.id)} onChange={() => toggle(skill.id)} aria-label={`Select ${skill.nameEn}`} /></td>
                <td>{skill.id}</td>
                <td>{skill.nameEn}</td>
                <td>{skill.order}</td>
                <td className="admin-row-actions">
                  <Link href={`/admin/skills/${skill.id}`}>Edit</Link>
                  <DeleteSkillButton id={skill.id} name={skill.nameEn} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
