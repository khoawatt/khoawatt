"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  createCategory,
  updateCategory,
  type BlogActionResult,
  type BlogCategoryFormData,
} from "../actions";
import type { AdminCategoryRow } from "../data";

interface CategoryFormProps {
  existing?: AdminCategoryRow;
}

export function CategoryForm({ existing }: Readonly<CategoryFormProps>) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    setError(null);
    setFieldErrors({});

    const data: BlogCategoryFormData = {
      id: existing?.id ?? String(fd.get("id") ?? ""),
      sortOrder: Number(fd.get("sortOrder") ?? 0),
      nameEn: String(fd.get("nameEn") ?? ""),
      nameVi: String(fd.get("nameVi") ?? ""),
    };

    startTransition(async () => {
      const result: BlogActionResult = existing
        ? await updateCategory(data)
        : await createCategory(data);
      if (result.ok) {
        router.push("/admin/blog/categories");
        router.refresh();
      } else if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors);
        setError(Object.values(result.fieldErrors).join(" "));
      } else {
        setError(result.error ?? "Failed to save category.");
      }
    });
  }

  return (
    <form className="admin-form" onSubmit={onSubmit}>
      {!existing ? (
        <label className="admin-field">
          <span>ID (slug, optional)</span>
          <input name="id" defaultValue="" />
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
        </label>
      </div>

      <label className="admin-field">
        <span>Sort order</span>
        <input name="sortOrder" type="number" defaultValue={existing?.sortOrder ?? 0} />
      </label>

      {error ? (
        <p className="admin-error" role="alert">{error}</p>
      ) : null}

      <div className="admin-form-actions">
        <button disabled={isPending} type="submit">
          {isPending ? "Saving…" : existing ? "Update category" : "Create category"}
        </button>
        <Link href="/admin/blog/categories">Cancel</Link>
      </div>
    </form>
  );
}