"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  createPost,
  createTag,
  previewMarkdown,
  updatePost,
  type BlogActionResult,
  type BlogPostFormData,
} from "./actions";
import type { AdminCategoryRow, AdminPostRow, AdminTagRow } from "./data";

interface CoverOption {
  name: string;
  url: string;
}

interface PostFormProps {
  categories: AdminCategoryRow[];
  coverOptions: CoverOption[];
  existing?: AdminPostRow;
  tags: AdminTagRow[];
}

type LocaleTab = "en" | "vi";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function PostForm({
  categories,
  coverOptions,
  existing,
  tags,
}: Readonly<PostFormProps>) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  const [localeTab, setLocaleTab] = useState<LocaleTab>("en");
  const [slug, setSlug] = useState(existing?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(existing));
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? "");
  const [coverBucketPath, setCoverBucketPath] = useState(
    existing?.coverBucketPath ?? "",
  );
  const [status, setStatus] = useState<"draft" | "published">(
    existing?.status ?? "draft",
  );
  const [tagIds, setTagIds] = useState<string[]>(existing?.tagIds ?? []);

  const [titleEn, setTitleEn] = useState(existing?.titleEn ?? "");
  const [summaryEn, setSummaryEn] = useState(existing?.summaryEn ?? "");
  const [contentMdEn, setContentMdEn] = useState(existing?.contentMdEn ?? "");
  const [titleVi, setTitleVi] = useState(existing?.titleVi ?? "");
  const [summaryVi, setSummaryVi] = useState(existing?.summaryVi ?? "");
  const [contentMdVi, setContentMdVi] = useState(existing?.contentMdVi ?? "");

  const [newTagName, setNewTagName] = useState("");
  const [newTagError, setNewTagError] = useState<string | null>(null);

  const [previewTab, setPreviewTab] = useState<LocaleTab | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);

  function onTitleEnChange(value: string) {
    setTitleEn(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  function toggleTag(id: string) {
    setTagIds((current) =>
      current.includes(id) ? current.filter((t) => t !== id) : [...current, id],
    );
  }

  function runPreview(locale: LocaleTab) {
    const markdown = locale === "en" ? contentMdEn : contentMdVi;
    setPreviewTab(locale);
    setPreviewHtml(null);
    setPreviewError(null);
    setIsPreviewing(true);

    startTransition(async () => {
      const result = await previewMarkdown(markdown);
      setIsPreviewing(false);
      if (result.ok && result.html) {
        setPreviewHtml(result.html);
      } else {
        setPreviewError(result.error ?? "Preview failed.");
      }
    });
  }

  function addTag() {
    const name = newTagName.trim();
    if (!name) return;
    setNewTagError(null);

    startTransition(async () => {
      const result = await createTag(name);
      if (result.ok && result.id) {
        setTagIds((current) =>
          current.includes(result.id as string) ? current : [...current, result.id as string],
        );
        setNewTagName("");
      } else {
        setNewTagError(result.error ?? "Failed to create tag.");
      }
    });
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    const data: BlogPostFormData = {
      id: existing?.id,
      slug,
      categoryId,
      coverBucketPath,
      status,
      tagIds,
      titleEn,
      summaryEn,
      contentMdEn,
      titleVi,
      summaryVi,
      contentMdVi,
    };

    startTransition(async () => {
      const result: BlogActionResult = existing
        ? await updatePost(data)
        : await createPost(data);
      if (result.ok) {
        router.push("/admin/blog");
        router.refresh();
      } else if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors);
        setError(Object.values(result.fieldErrors).join(" "));
      } else {
        setError(result.error ?? "Failed to save post.");
      }
    });
  }

  return (
    <form className="admin-form admin-form--blog" onSubmit={onSubmit}>
      <label className="admin-field">
        <span>Slug</span>
        <input
          name="slug"
          onChange={(event) => {
            setSlug(event.target.value);
            setSlugTouched(true);
          }}
          required
          value={slug}
        />
        {fieldErrors.slug ? <small className="admin-error">{fieldErrors.slug}</small> : null}
      </label>

      <div className="admin-form-grid">
        <label className="admin-field">
          <span>Category</span>
          <select
            name="categoryId"
            onChange={(event) => setCategoryId(event.target.value)}
            required
            value={categoryId}
          >
            <option value="">Select a category…</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.nameEn} / {category.nameVi}
              </option>
            ))}
          </select>
        </label>

        <label className="admin-field">
          <span>Status</span>
          <select
            name="status"
            onChange={(event) =>
              setStatus(event.target.value as "draft" | "published")
            }
            value={status}
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </label>
      </div>

      <fieldset className="admin-field">
        <legend>Tags</legend>
        {tags.length > 0 ? (
          <div className="admin-check-group">
            {tags.map((tag) => (
              <label className="admin-check" key={tag.id}>
                <input
                  checked={tagIds.includes(tag.id)}
                  onChange={() => toggleTag(tag.id)}
                  type="checkbox"
                />
                <span>{tag.nameEn}</span>
              </label>
            ))}
          </div>
        ) : (
          <p className="admin-note">No tags yet.</p>
        )}
        <div className="admin-form-row">
          <input
            aria-label="New tag name"
            onChange={(event) => setNewTagName(event.target.value)}
            placeholder="Quick-add a tag"
            value={newTagName}
          />
          <button disabled={isPending} onClick={addTag} type="button">
            Add tag
          </button>
        </div>
        {newTagError ? <p className="admin-error">{newTagError}</p> : null}
      </fieldset>

      <fieldset className="admin-field">
        <legend>Cover (blog-media bucket)</legend>
        {coverOptions.length === 0 ? (
          <p className="admin-note">No media uploaded yet — upload under Admin → Media.</p>
        ) : (
          <div className="admin-check-group">
            <label className="admin-check">
              <input
                checked={coverBucketPath === ""}
                onChange={() => setCoverBucketPath("")}
                type="radio"
                name="cover"
              />
              <span>No cover</span>
            </label>
            {coverOptions.map((cover) => (
              <label className="admin-check admin-check--media" key={cover.name}>
                <input
                  checked={coverBucketPath === cover.name}
                  onChange={() => setCoverBucketPath(cover.name)}
                  type="radio"
                  name="cover"
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt={cover.name} height={48} src={cover.url} width={64} />
                <span>{cover.name}</span>
              </label>
            ))}
          </div>
        )}
      </fieldset>

      <div className="admin-locale-tabs" role="tablist" aria-label="Post language">
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
        {localeTab === "en" ? (
          <>
            <label className="admin-field">
              <span>Title (EN)</span>
              <input
                onChange={(event) => onTitleEnChange(event.target.value)}
                required
                value={titleEn}
              />
              {fieldErrors.titleEn ? <small className="admin-error">{fieldErrors.titleEn}</small> : null}
            </label>
            <label className="admin-field">
              <span>Summary (EN)</span>
              <textarea
                onChange={(event) => setSummaryEn(event.target.value)}
                required
                rows={3}
                value={summaryEn}
              />
              {fieldErrors.summaryEn ? <small className="admin-error">{fieldErrors.summaryEn}</small> : null}
            </label>
            <label className="admin-field">
              <span>Markdown content (EN)</span>
              <textarea
                className="admin-markdown"
                onChange={(event) => setContentMdEn(event.target.value)}
                rows={14}
                value={contentMdEn}
              />
            </label>
          </>
        ) : (
          <>
            <label className="admin-field">
              <span>Title (VI)</span>
              <input
                onChange={(event) => setTitleVi(event.target.value)}
                required
                value={titleVi}
              />
              {fieldErrors.titleVi ? <small className="admin-error">{fieldErrors.titleVi}</small> : null}
            </label>
            <label className="admin-field">
              <span>Summary (VI)</span>
              <textarea
                onChange={(event) => setSummaryVi(event.target.value)}
                required
                rows={3}
                value={summaryVi}
              />
              {fieldErrors.summaryVi ? <small className="admin-error">{fieldErrors.summaryVi}</small> : null}
            </label>
            <label className="admin-field">
              <span>Markdown content (VI)</span>
              <textarea
                className="admin-markdown"
                onChange={(event) => setContentMdVi(event.target.value)}
                rows={14}
                value={contentMdVi}
              />
            </label>
          </>
        )}
      </div>

      <div className="admin-form-row">
        <button
          disabled={isPreviewing}
          onClick={() => runPreview(localeTab)}
          type="button"
        >
          {isPreviewing ? "Rendering…" : `Preview ${localeTab === "en" ? "EN" : "VI"}`}
        </button>
      </div>

      {previewError ? (
        <p className="admin-error" role="alert">{previewError}</p>
      ) : null}
      {previewTab && previewHtml ? (
        <div className="admin-preview">
          <h3>Preview ({previewTab === "en" ? "EN" : "VI"})</h3>
          <div
            className="blog-article__prose"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </div>
      ) : null}

      {error ? (
        <p className="admin-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="admin-form-actions">
        <button disabled={isPending} type="submit">
          {isPending ? "Saving…" : existing ? "Update post" : "Create post"}
        </button>
        <Link href="/admin/blog">Cancel</Link>
      </div>
    </form>
  );
}