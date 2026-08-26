"use client";

import { useEffect, useRef, useState, useTransition } from "react";
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
import { MediaPickerModal } from "@/features/cms/media-picker-modal";

interface PostFormProps {
  categories: AdminCategoryRow[];
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

  const enContentRef = useRef<HTMLTextAreaElement>(null);
  const viContentRef = useRef<HTMLTextAreaElement>(null);

  function insertMarkdownImage(tab: LocaleTab, url: string, alt: string) {
    const textarea = tab === "en" ? enContentRef.current : viContentRef.current;
    const value = tab === "en" ? contentMdEn : contentMdVi;
    const setter = tab === "en" ? setContentMdEn : setContentMdVi;

    const position = textarea?.selectionStart ?? value.length;
    const markdown = `![${alt}](${url})`;
    setter(`${value.slice(0, position)}${markdown}${value.slice(position)}`);

    window.requestAnimationFrame(() => {
      if (textarea) {
        textarea.selectionStart = textarea.selectionEnd = position + markdown.length;
        textarea.focus();
      }
    });
  }

  function openPicker(surface: "cover" | LocaleTab) {
    setPickerSurface(surface);
    setPickerOpen(true);
  }

  function handlePickCover(selection: { path: string; url: string; title: string; alt: string }) {
    setCoverBucketPath(selection.path);
  }

  function handlePickInsert(selection: { path: string; url: string; title: string; alt: string }) {
    if (pickerSurface === "en" || pickerSurface === "vi") {
      insertMarkdownImage(pickerSurface, selection.url, selection.alt || selection.title);
    }
  }

  function handlePickerSelect(selection: { path: string; url: string; title: string; alt: string }) {
    if (pickerSurface === "cover") handlePickCover(selection);
    else handlePickInsert(selection);
  }

  const [newTagName, setNewTagName] = useState("");
  const [newTagError, setNewTagError] = useState<string | null>(null);

  // Shared media picker state: which surface opened it ("cover" | "en" | "vi").
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSurface, setPickerSurface] = useState<"cover" | LocaleTab | null>(null);

  const [previewTab, setPreviewTab] = useState<LocaleTab | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);

  // Live preview re-renders whenever the active locale's content changes.
  const activeContentMd = localeTab === "en" ? contentMdEn : contentMdVi;
  const activePreview = previewTab === localeTab ? previewHtml : null;

  useEffect(() => {
    if (previewTab !== localeTab) return;
    let cancelled = false;

    startTransition(async () => {
      setIsPreviewing(true);
      const result = await previewMarkdown(activeContentMd);
      setIsPreviewing(false);
      if (cancelled) return;
      if (result.ok && result.html) {
        setPreviewHtml(result.html);
        setPreviewError(null);
      } else {
        setPreviewError(result.error ?? "Preview failed.");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [activeContentMd, previewTab, localeTab]);

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
    // Toggling the active preview tab triggers the live re-render effect.
    setPreviewTab((current) => (current === locale ? null : locale));
    setPreviewError(null);
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
      <div className="blog-post-editor">
        {/* Left column: shared post fields */}
        <div className="blog-post-editor__side">
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
                <option value="">Select…</option>
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
                Add
              </button>
            </div>
            {newTagError ? <p className="admin-error">{newTagError}</p> : null}
          </fieldset>

          <fieldset className="admin-field">
            <legend>Cover (blog-media)</legend>
            <div className="admin-form-row">
              <input
                aria-label="Cover image path"
                onChange={(event) => setCoverBucketPath(event.target.value)}
                placeholder="No cover"
                value={coverBucketPath}
              />
              <button onClick={() => openPicker("cover")} type="button">
                Pick from library
              </button>
            </div>
            {coverBucketPath ? (
              <p className="admin-note">Selected: {coverBucketPath}</p>
            ) : null}
          </fieldset>
        </div>

        {/* Right column: locale editor + live preview */}
        <div className="blog-post-editor__main">
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
                  <div className="admin-form-row">
                    <button
                      className="admin-link-button"
                      onClick={() => openPicker("en")}
                      type="button"
                    >
                      Insert image
                    </button>
                    <button
                      className="admin-link-button"
                      disabled={isPreviewing}
                      onClick={() => runPreview("en")}
                      type="button"
                    >
                      {isPreviewing ? "Rendering…" : "Preview EN"}
                    </button>
                  </div>
                  <textarea
                    className="admin-markdown"
                    onChange={(event) => setContentMdEn(event.target.value)}
                    ref={enContentRef}
                    rows={16}
                    value={contentMdEn}
                  />
                  <small className="admin-hint">
                    Start the body with `##` headings — the title above is the single H1 of the
                    page, and a leading `#` line is dropped when rendering.
                  </small>
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
                  <div className="admin-form-row">
                    <button
                      className="admin-link-button"
                      onClick={() => openPicker("vi")}
                      type="button"
                    >
                      Insert image
                    </button>
                    <button
                      className="admin-link-button"
                      disabled={isPreviewing}
                      onClick={() => runPreview("vi")}
                      type="button"
                    >
                      {isPreviewing ? "Rendering…" : "Preview VI"}
                    </button>
                  </div>
                  <textarea
                    className="admin-markdown"
                    onChange={(event) => setContentMdVi(event.target.value)}
                    ref={viContentRef}
                    rows={16}
                    value={contentMdVi}
                  />
                  <small className="admin-hint">
                    Start the body with `##` headings — the title above is the single H1 of the
                    page, and a leading `#` line is dropped when rendering.
                  </small>
                </label>
              </>
            )}
          </div>

          {previewError ? (
            <p className="admin-error" role="alert">{previewError}</p>
          ) : null}
          {activePreview ? (
            <div className="admin-preview">
              <h3>Live preview ({previewTab === "en" ? "EN" : "VI"})</h3>
              <div
                className="blog-article__prose"
                dangerouslySetInnerHTML={{ __html: activePreview }}
              />
            </div>
          ) : null}
        </div>
      </div>

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

      <MediaPickerModal
        bucket="blog-media"
        defaultAlt={pickerSurface === "cover" ? titleEn || titleVi || "" : ""}
        onClose={() => setPickerOpen(false)}
        onSelect={handlePickerSelect}
        open={pickerOpen}
      />
    </form>
  );
}