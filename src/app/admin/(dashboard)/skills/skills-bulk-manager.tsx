"use client";

import Link from "next/link";
import { useState } from "react";

import { BulkDeleteBar } from "@/components/admin/bulk-delete-bar";

import type { AdminSkillRow } from "./data";
import { DeleteSkillButton } from "./delete-skill";
import { bucketizeSkills, TECH_STACK_BUCKET_ID, UNASSIGNED_BUCKET_ID } from "./skill-buckets";
import { otherTaxonomy } from "@/content/skills";

function categoryLabel(id: string): string {
  return otherTaxonomy.find((node) => node.key === id)?.label.en ?? id;
}

export function SkillsBulkManager({ skills }: { skills: AdminSkillRow[] }) {
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

  const buckets = bucketizeSkills(skills);

  return (
    <>
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "1rem" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all skills" />
          <span className="admin-note">Select all ({skills.length})</span>
        </label>
      </div>
      <BulkDeleteBar entity="skill" selectedIds={Array.from(selected)} onClear={() => setSelected(new Set())} onDone={() => setSelected(new Set())} label="skills" />
      <div className="admin-buckets">
        {buckets.map((bucket) => (
          <section key={bucket.id} aria-labelledby={`skills-bucket-${bucket.id}`}>
            <div className="admin-bucket-head">
              <h2 id={`skills-bucket-${bucket.id}`}>{bucket.title}</h2>
              {bucket.id !== UNASSIGNED_BUCKET_ID ? (
                <Link className="admin-button" href={bucket.id === TECH_STACK_BUCKET_ID ? "/admin/skills/new?group=tech-stack" : `/admin/skills/new?group=others&categoryKey=${bucket.id}`}>
                  Add skill
                </Link>
              ) : null}
            </div>
            {bucket.hint ? <p className="admin-hint">{bucket.hint}</p> : null}
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th><input type="checkbox" checked={bucket.skills.length > 0 && bucket.skills.every((s) => selected.has(s.id))} onChange={() => { const ids = bucket.skills.map((s) => s.id); const all = ids.every((id) => selected.has(id)); setSelected((prev) => { const next = new Set(prev); if (all) ids.forEach((id) => next.delete(id)); else ids.forEach((id) => next.add(id)); return next; }); }} aria-label={`Select ${bucket.title}`} /></th>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Order</th>
                    <th><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {bucket.skills.map((skill) => (
                    <tr key={skill.id}>
                      <td><input type="checkbox" checked={selected.has(skill.id)} onChange={() => toggle(skill.id)} aria-label={`Select ${skill.nameEn}`} /></td>
                      <td>{skill.id}</td>
                      <td>{skill.nameEn} {skill.featured ? <span className="admin-badge admin-badge--success">Featured</span> : null}</td>
                      <td>{skill.group === "others" ? (skill.categoryKey ? categoryLabel(skill.categoryKey) : <span className="admin-badge admin-badge--warning">Unassigned</span>) : "—"}</td>
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
          </section>
        ))}
      </div>
    </>
  );
}
