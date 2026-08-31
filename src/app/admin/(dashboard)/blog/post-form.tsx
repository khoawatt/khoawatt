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
import { LinkInsertButton } from "./link-insert";
import { MediaInsertButton } from "./media-insert";
import { MediaPickerModal } from "../media/media-picker-modal";
import { publicMediaUrl } from "@/features/cms/media-url";

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

  const [coverPickerOpen, setCoverPickerOpen] = useState(false);

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

  function insertMarkdownImage(
    tab: LocaleTab,
    image: { url: string; altEn: string; altVi: string },
  ) {
    const textarea = tab === "en" ? enContentRef.current : viContentRef.current;
    const value = tab === "en" ? contentMdEn : contentMdVi;
    const setter = tab === "en" ? setContentMdEn : setContentMdVi;

    // Catalog alt text wins; fall back to a readable name from the URL.
    const fallback = decodeURIComponent(image.url.split("/").pop() ?? "")
      .replace(/\.[^.]+$/, "")
      .replace(/^\d+-/, "")
      .replace(/[-_]+/g, " ");
    const alt =
      (tab === "en" ? image.altEn : image.altVi).trim() || fallback;

    const position = textarea?.selectionStart ?? value.length;
    const markdown = `![${alt}](${image.url})`;
    setter(`${value.slice(0, position)}${markdown}${value.slice(position)}`);

    window.requestAnimationFrame(() => {
      if (textarea) {
        textarea.selectionStart = textarea.selectionEnd = position + markdown.length;
        textarea.focus();
      }
    });
  }

  function insertMarkdownLink(tab: LocaleTab, link: { url: string; text: string }) {
    const textarea = tab === "en" ? enContentRef.current : viContentRef.current;
    const value = tab === "en" ? contentMdEn : contentMdVi;
    const setter = tab === "en" ? setContentMdEn : setContentMdVi;

    const start = textarea?.selectionStart ?? value.length;
    const end = textarea?.selectionEnd ?? value.length;
    const selected = value.slice(start, end);
    const linkText = link.text || selected || link.url;
    const markdown = `[${linkText}](${link.url})`;

    // Replace selection if any, otherwise insert at cursor
    const nextValue = `${value.slice(0, start)}${markdown}${value.slice(end)}`;
    setter(nextValue);

    window.requestAnimationFrame(() => {
      if (textarea) {
        const cursor = start + markdown.length;
        textarea.selectionStart = textarea.selectionEnd = cursor;
        textarea.focus();
      }
    });
  }

  function getSelectedText(tab: LocaleTab): string {
    const textarea = tab === "en" ? enContentRef.current : viContentRef.current;
    if (!textarea) return "";
    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    if (start === end) return "";
    const value = tab === "en" ? contentMdEn : contentMdVi;
    return value.slice(start, end);
  }

  const [newTagName, setNewTagName] = useState("");
  const [newTagError, setNewTagError] = useState<string | null>(null);

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
            {coverBucketPath ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt="Selected cover preview"
                className="admin-cover-preview"
                height={90}
                src={publicMediaUrl("blog-media", coverBucketPath)}
                width={160}
              />
            ) : (
              <p className="admin-note">No cover selected.</p>
            )}
            <div className="admin-form-row">
              <button
                className="admin-link-button"
                onClick={() => setCoverPickerOpen(true)}
                type="button"
              >
                {coverBucketPath ? "Change cover…" : "Choose cover…"}
              </button>
              {coverBucketPath ? (
                <button
                  className="admin-link-button admin-link-button--danger"
                  onClick={() => setCoverBucketPath("")}
                  type="button"
                >
                  Remove
                </button>
              ) : null}
            </div>
            {coverBucketPath ? (
              <small className="admin-hint">{coverBucketPath}</small>
            ) : null}
          </fieldset>
          <MediaPickerModal
            bucket="blog-media"
            onClose={() => setCoverPickerOpen(false)}
            onSelect={(asset) => {
              setCoverBucketPath(asset.path);
              setCoverPickerOpen(false);
            }}
            open={coverPickerOpen}
          />
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
                <div className="admin-field">
                  <label className="admin-field__label" htmlFor="content-md-en">
                    Markdown content (EN)
                  </label>
                  <div className="admin-markdown-toolbar">
                    <MediaInsertButton
                      onInsert={(image) => insertMarkdownImage("en", image)}
                    />
                    <LinkInsertButton
                      onInsert={(link) => insertMarkdownLink("en", link)}
                      getSelectedText={() => getSelectedText("en")}
                    />
                    <button
                      className="admin-link-button admin-link-button--preview"
                      disabled={isPreviewing}
                      onClick={() => runPreview("en")}
                      type="button"
                    >
                      <svg aria-hidden="true" fill="none" height="14" viewBox="0 0 24 24" width="14">
                        <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" stroke="currentColor" strokeWidth="1.7" />
                        <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.7" />
                      </svg>
                      {isPreviewing ? "Rendering…" : "Preview EN"}
                    </button>
                  </div>
                  <textarea
                    className="admin-markdown"
                    id="content-md-en"
                    onChange={(event) => setContentMdEn(event.target.value)}
                    ref={enContentRef}
                    rows={16}
                    value={contentMdEn}
                  />
                  <small className="admin-hint">
                    Start the body with `##` headings — the title above is the single H1 of the
                    page, and a leading `#` line is dropped when rendering.
                  </small>
                </div>
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
                <div className="admin-field">
                  <label className="admin-field__label" htmlFor="content-md-vi">
                    Markdown content (VI)
                  </label>
                  <div className="admin-markdown-toolbar">
                    <MediaInsertButton
                      onInsert={(image) => insertMarkdownImage("vi", image)}
                    />
                    <LinkInsertButton
                      onInsert={(link) => insertMarkdownLink("vi", link)}
                      getSelectedText={() => getSelectedText("vi")}
                    />
                    <button
                      className="admin-link-button admin-link-button--preview"
                      disabled={isPreviewing}
                      onClick={() => runPreview("vi")}
                      type="button"
                    >
                      <svg aria-hidden="true" fill="none" height="14" viewBox="0 0 24 24" width="14">
                        <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" stroke="currentColor" strokeWidth="1.7" />
                        <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.7" />
                      </svg>
                      {isPreviewing ? "Rendering…" : "Preview VI"}
                    </button>
                  </div>
                  <textarea
                    className="admin-markdown"
                    id="content-md-vi"
                    onChange={(event) => setContentMdVi(event.target.value)}
                    ref={viContentRef}
                    rows={16}
                    value={contentMdVi}
                  />
                  <small className="admin-hint">
                    Start the body with `##` headings — the title above is the single H1 of the
                    page, and a leading `#` line is dropped when rendering.
                  </small>
                </div>
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
    </form>
  );
}