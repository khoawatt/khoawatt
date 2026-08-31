"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { createTagFull, updateTag, type BlogActionResult, type BlogTagFormData } from "../actions";
import type { AdminTagRow } from "../data";

interface TagFormProps {
  existing?: AdminTagRow;
}

export function TagForm({ existing }: Readonly<TagFormProps>) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(null);
    setFieldErrors({});
    const data: BlogTagFormData = {
      id: existing?.id ?? String(fd.get("id") ?? ""),
      nameEn: String(fd.get("nameEn") ?? ""),
      nameVi: String(fd.get("nameVi") ?? ""),
    };
    startTransition(async () => {
      const res: BlogActionResult = existing ? await updateTag(data) : await createTagFull(data);
      if (res.ok) {
        router.push("/admin/blog/tags");
        router.refresh();
      } else if (res.fieldErrors) {
        setFieldErrors(res.fieldErrors);
        setError(Object.values(res.fieldErrors).join(" "));
      } else setError(res.error ?? "Failed to save tag.");
    });
  }

  return (
    <form className="admin-form" onSubmit={onSubmit}>
      {!existing ? (
        <label className="admin-field">
          <span>ID (slug, optional)</span>
          <input name="id" defaultValue="" placeholder="e.g. design-systems" />
          {fieldErrors.id ? <small className="admin-error">{fieldErrors.id}</small> : null}
        </label>
      ) : null}
      <div className="admin-form-grid">
        <label className="admin-field">
          <span>Name (EN)</span>
          <input name="nameEn" required defaultValue={existing?.nameEn ?? ""} />
          {fieldErrors.nameEn ? <small className="admin-error">{fieldErrors.nameEn}</small> : null}
        </label>
        <label className="admin-field">
          <span>Name (VI)</span>
          <input name="nameVi" required defaultValue={existing?.nameVi ?? ""} />
          {fieldErrors.nameVi ? <small className="admin-error">{fieldErrors.nameVi}</small> : null}
        </label>
      </div>
      {error ? <p className="admin-error" role="alert">{error}</p> : null}
      <div className="admin-form-actions">
        <button disabled={isPending} type="submit">
          {isPending ? "Saving…" : existing ? "Update tag" : "Create tag"}
        </button>
        <Link href="/admin/blog/tags">Cancel</Link>
      </div>
    </form>
  );
}
