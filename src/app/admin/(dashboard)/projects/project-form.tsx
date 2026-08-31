"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type { AdminProjectRow } from "./data";
import {
  createProject,
  updateProject,
  type ProjectActionResult,
} from "./actions";

interface ProjectFormProps {
  existing?: AdminProjectRow;
}

export function ProjectForm({ existing }: ProjectFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [localeTab, setLocaleTab] = useState<"en" | "vi">("en");

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);

    const data = {
      id: existing?.id ?? String(fd.get("id") ?? ""),
      slug: String(fd.get("slug") ?? ""),
      techStack: String(fd.get("techStack") ?? ""),
      liveDemoUrl: String(fd.get("liveDemoUrl") ?? ""),
      codeUrl: String(fd.get("codeUrl") ?? ""),
      featured: fd.get("featured") === "on",
      order: Number(fd.get("order") ?? 0),
      status: String(fd.get("status") ?? "active"),
      published: fd.get("published") === "on",
      titleEn: String(fd.get("titleEn") ?? ""),
      titleVi: String(fd.get("titleVi") ?? ""),
      categoryEn: String(fd.get("categoryEn") ?? ""),
      categoryVi: String(fd.get("categoryVi") ?? ""),
      summaryEn: String(fd.get("summaryEn") ?? ""),
      summaryVi: String(fd.get("summaryVi") ?? ""),
      descriptionEn: String(fd.get("descriptionEn") ?? ""),
      descriptionVi: String(fd.get("descriptionVi") ?? ""),
      highlightsEn: String(fd.get("highlightsEn") ?? ""),
      highlightsVi: String(fd.get("highlightsVi") ?? ""),
    };

    startTransition(async () => {
      const result: ProjectActionResult = existing
        ? await updateProject(data)
        : await createProject(data);
      if (result.ok) {
        router.push("/admin/projects");
        router.refresh();
      } else {
        setError(
          result.fieldErrors
            ? Object.values(result.fieldErrors).join(" ")
            : result.error ?? "Failed.",
        );
      }
    });
  }

  return (
    <form className="admin-form" onSubmit={onSubmit}>
      <div className="blog-post-editor">
        <div className="blog-post-editor__side">
          {!existing ? (
            <label className="admin-field">
              <span>ID (slug, optional)</span>
              <input name="id" defaultValue="" />
            </label>
          ) : null}
          <label className="admin-field">
            <span>Slug</span>
            <input name="slug" required defaultValue={existing?.slug ?? ""} />
          </label>
          <label className="admin-field">
            <span>Tech stack (comma-separated)</span>
            <input name="techStack" defaultValue={existing?.techStack.join(", ") ?? ""} />
          </label>
          <label className="admin-field">
            <span>Live Demo URL (http/https)</span>
            <input name="liveDemoUrl" defaultValue={existing?.liveDemoUrl ?? ""} />
          </label>
          <label className="admin-field">
            <span>Code URL (http/https)</span>
            <input name="codeUrl" defaultValue={existing?.codeUrl ?? ""} />
          </label>
          <label className="admin-field">
            <span>Order</span>
            <input name="order" type="number" defaultValue={existing?.order ?? 0} />
          </label>
          <label className="admin-field">
            <span>Status</span>
            <select name="status" defaultValue={existing?.status ?? "active"}>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
              <option value="private">Private</option>
            </select>
          </label>
          <label className="admin-check">
            <input name="featured" type="checkbox" defaultChecked={existing?.featured} />
            <span>Featured</span>
          </label>
          <label className="admin-check">
            <input name="published" type="checkbox" defaultChecked={existing?.published} />
            <span>Published</span>
          </label>
        </div>

        <div className="blog-post-editor__main">
          <div className="admin-locale-tabs" role="tablist" aria-label="Project language">
            <button
              aria-selected={localeTab === "en"}
              onClick={() => setLocaleTab("en")}
              role="tab"
              type="button"
            >
              English
            </button>
            <button
              aria-selected={localeTab === "vi"}
              onClick={() => setLocaleTab("vi")}
              role="tab"
              type="button"
            >
              Tiếng Việt
            </button>
          </div>

          <div role="tabpanel">
            <div hidden={localeTab !== "en"}>
              <label className="admin-field">
                <span>Title (EN)</span>
                <input name="titleEn" defaultValue={existing?.titleEn ?? ""} />
              </label>
              <label className="admin-field">
                <span>Category (EN)</span>
                <input name="categoryEn" defaultValue={existing?.categoryEn ?? ""} />
              </label>
              <label className="admin-field">
                <span>Summary (EN)</span>
                <textarea name="summaryEn" rows={3} defaultValue={existing?.summaryEn ?? ""} />
              </label>
              <label className="admin-field">
                <span>Description (EN)</span>
                <textarea name="descriptionEn" rows={4} defaultValue={existing?.descriptionEn ?? ""} />
              </label>
              <label className="admin-field">
                <span>Highlights (EN)</span>
                <textarea name="highlightsEn" rows={4} defaultValue={existing?.highlightsEn.join("\n") ?? ""} />
              </label>
            </div>
            <div hidden={localeTab !== "vi"}>
              <label className="admin-field">
                <span>Title (VI)</span>
                <input name="titleVi" defaultValue={existing?.titleVi ?? ""} />
              </label>
              <label className="admin-field">
                <span>Category (VI)</span>
                <input name="categoryVi" defaultValue={existing?.categoryVi ?? ""} />
              </label>
              <label className="admin-field">
                <span>Summary (VI)</span>
                <textarea name="summaryVi" rows={3} defaultValue={existing?.summaryVi ?? ""} />
              </label>
              <label className="admin-field">
                <span>Description (VI)</span>
                <textarea name="descriptionVi" rows={4} defaultValue={existing?.descriptionVi ?? ""} />
              </label>
              <label className="admin-field">
                <span>Highlights (VI)</span>
                <textarea name="highlightsVi" rows={4} defaultValue={existing?.highlightsVi.join("\n") ?? ""} />
              </label>
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <p className="admin-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="admin-form-actions">
        <button disabled={isPending} type="submit">
          {isPending ? "Saving…" : existing ? "Update project" : "Create project"}
        </button>
        <Link href="/admin/projects">Cancel</Link>
      </div>
    </form>
  );
}
