"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  otherTaxonomy,
  skillIconKeys,
  type OtherCategoryKey,
  type SkillGroup,
} from "@/content/skills";
import type { AdminSkillRow } from "./data";
import { upsertSkill, type SkillActionResult } from "./actions";

const groupLabels: Readonly<Record<SkillGroup, string>> = {
  "tech-stack": "Tech Stack",
  others: "Others",
};

interface SkillFormProps {
  existing?: AdminSkillRow;
  /** Prefill for the create form (from a per-group Add button). */
  defaultGroup?: SkillGroup;
  defaultCategoryKey?: OtherCategoryKey;
}

export function SkillForm({
  existing,
  defaultGroup = "tech-stack",
  defaultCategoryKey,
}: SkillFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [group, setGroup] = useState<SkillGroup>(
    existing?.group ?? defaultGroup,
  );

  const taxonomyGroups = otherTaxonomy.filter((node) => node.kind === "group");
  const taxonomySections = otherTaxonomy.filter((node) => node.kind === "section");

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fd = new FormData(form);

    const data = {
      id: existing?.id ?? String(fd.get("id") ?? ""),
      nameEn: String(fd.get("nameEn") ?? ""),
      nameVi: String(fd.get("nameVi") ?? ""),
      group: String(fd.get("group") ?? "tech-stack") as SkillGroup,
      categoryKey: String(fd.get("categoryKey") ?? "") || undefined,
      iconKey: String(fd.get("iconKey") ?? "") || undefined,
      url: String(fd.get("url") ?? ""),
      order: Number(fd.get("order") ?? 0),
      featured: fd.get("featured") === "on",
    };

    startTransition(async () => {
      const result: SkillActionResult = await upsertSkill(data);
      if (result.ok) {
        router.push("/admin/skills");
        router.refresh();
      } else {
        setError(
          result.fieldErrors
            ? Object.values(result.fieldErrors).join(" ")
            : (result.error ?? "Failed."),
        );
      }
    });
  }

  return (
    <form className="admin-form" onSubmit={onSubmit}>
      {!existing ? (
        <label className="admin-field">
          <span>Skill ID (slug)</span>
          <input name="id" required defaultValue="" />
        </label>
      ) : null}

      <label className="admin-field">
        <span>Name (EN)</span>
        <input name="nameEn" required defaultValue={existing?.nameEn ?? ""} />
      </label>
      <label className="admin-field">
        <span>Name (VI)</span>
        <input name="nameVi" required defaultValue={existing?.nameVi ?? ""} />
      </label>

      <label className="admin-field">
        <span>Group</span>
        <select
          name="group"
          value={group}
          onChange={(event) => setGroup(event.target.value as SkillGroup)}
        >
          {(Object.keys(groupLabels) as SkillGroup[]).map((key) => (
            <option key={key} value={key}>
              {groupLabels[key]}
            </option>
          ))}
        </select>
      </label>

      {group === "others" ? (
        <label className="admin-field">
          <span>Category</span>
          <select
            name="categoryKey"
            defaultValue={existing?.categoryKey ?? defaultCategoryKey ?? ""}
          >
            <option value="">— Unassigned —</option>
            <optgroup label="Groups">
              {taxonomyGroups.map((node) => (
                <option key={node.key} value={node.key}>
                  {node.label.en}
                </option>
              ))}
            </optgroup>
            <optgroup label="Agentic AI sub-sections">
              {taxonomySections.map((node) => (
                <option key={node.key} value={node.key}>
                  {node.label.en}
                </option>
              ))}
            </optgroup>
          </select>
        </label>
      ) : null}

      <label className="admin-field">
        <span>Icon key</span>
        <select name="iconKey" defaultValue={existing?.iconKey ?? ""}>
          <option value="">None</option>
          {skillIconKeys.map((icon) => (
            <option key={icon} value={icon}>
              {icon}
            </option>
          ))}
        </select>
      </label>

      <label className="admin-field">
        <span>URL (optional, http/https)</span>
        <input name="url" defaultValue={existing?.url ?? ""} />
      </label>

      <label className="admin-field">
        <span>Order</span>
        <input name="order" type="number" defaultValue={existing?.order ?? 0} />
      </label>

      <label className="admin-check">
        <input name="featured" type="checkbox" defaultChecked={existing?.featured} />
        <span>Featured</span>
      </label>

      {error ? (
        <p className="admin-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="admin-form-actions">
        <button disabled={isPending} type="submit">
          {isPending ? "Saving…" : existing ? "Update skill" : "Create skill"}
        </button>
        <Link href="/admin/skills">Cancel</Link>
      </div>
    </form>
  );
}
