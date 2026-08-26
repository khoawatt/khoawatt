import { listMediaAssetsCore } from "@/features/cms/media-library";
import type { MediaBucket } from "@/features/cms/media";
import { getServerClient } from "@/features/cms/session";
import { MediaUploadForm } from "./media-upload-form";
import { AdminPage } from "../admin-page";
import {
  BulkDeleteBar,
  BulkSelectionProvider,
  DeleteActionButton,
  SelectionCheckbox,
} from "@/features/cms/delete-actions";

export const metadata = {
  title: "Admin media",
};

const buckets: Array<{ id: MediaBucket; label: string; note: string }> = [
  { id: "resume-media", label: "Resume media (private)", note: "Served only through the gated /api/resume-media route." },
  { id: "project-media", label: "Project media (public)", note: "Public project images." },
  { id: "blog-media", label: "Blog media (public)", note: "Public post covers and in-article images." },
  { id: "portfolio", label: "Portfolio (public)", note: "Profile / social images." },
];

const PAGE_SIZE = 24;

interface AdminMediaPageProps {
  searchParams: Promise<{
    bucket?: string;
    page?: string;
    q?: string;
  }>;
}

export default async function AdminMediaPage({
  searchParams,
}: Readonly<AdminMediaPageProps>) {
  const params = await searchParams;
  const activeBucket = (buckets.find((b) => b.id === params.bucket) ?? buckets[0]!).id;
  const page = Math.max(1, Number(params.page) || 1);
  const search = params.q?.trim() ?? "";

  const client = await getServerClient();
  const result = await listMediaAssetsCore(client, {
    mode: "page",
    bucket: activeBucket,
    search: search || undefined,
    page,
    pageSize: PAGE_SIZE,
  });
  const { items } = result;
  const total = result.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageItems = items.map((item) => ({ id: item.path, label: item.title || item.path }));

  return (
    <AdminPage title="Media">
      <p className="admin-message">
        Upload and manage images stored in Supabase Storage. Resume media is
        private and served only through the gated route; project and portfolio
        media are public.
      </p>

      <div className="admin-tabs" role="tablist" aria-label="Media bucket">
        {buckets.map((bucket) => {
          const active = bucket.id === activeBucket;
          return (
            <a
              aria-selected={active}
              className={active ? "admin-tab admin-tab--active" : "admin-tab"}
              href={`/admin/media?bucket=${bucket.id}`}
              key={bucket.id}
              role="tab"
            >
              {bucket.label}
            </a>
          );
        })}
      </div>

      <section className="admin-section">
        <div className="admin-page-head">
          <h2>{buckets.find((b) => b.id === activeBucket)?.label}</h2>
        </div>
        <p className="admin-note">{buckets.find((b) => b.id === activeBucket)?.note}</p>

        <MediaUploadForm bucket={activeBucket} />

        <form className="admin-form admin-form--row" method="get" action="/admin/media">
          <input
            aria-label="Search media"
            defaultValue={search}
            name="q"
            placeholder="Search by filename or title…"
            type="search"
          />
          <input name="bucket" type="hidden" value={activeBucket} />
          <button className="admin-button-secondary" type="submit">
            Search
          </button>
        </form>

        <BulkSelectionProvider>
          <BulkDeleteBar bucket={activeBucket} entity="media" items={pageItems} noun="file" />

          {items.length === 0 ? (
            <p className="admin-message">
              {search ? "No files match your search." : "No files uploaded yet."}
            </p>
          ) : (
            <ul className="admin-media-grid">
              {items.map((item) => (
                <li className="admin-media-grid__item" key={item.path}>
                  <div className="admin-media-preview">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt={item.altEn || item.title || item.path}
                      height={item.height ?? 80}
                      loading="lazy"
                      src={item.url}
                      width={item.width ?? 120}
                    />
                  </div>
                  <div className="admin-media-meta">
                    <code title={item.path}>{item.path}</code>
                    <span className="admin-media-title">{item.title || "Untitled"}</span>
                    <span className="admin-media-dims">
                      {item.width && item.height
                        ? `${item.width}×${item.height}`
                        : "—"}
                      {item.sizeBytes ? ` · ${formatBytes(item.sizeBytes)}` : ""}
                      {item.mime ? ` · ${item.mime}` : ""}
                    </span>
                    <div className="admin-media-actions">
                      <SelectionCheckbox id={item.path} label={item.title || item.path} />
                      <DeleteActionButton
                        bucket={activeBucket}
                        entity="media"
                        item={{ id: item.path, label: item.title || item.path }}
                        noun="file"
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {totalPages > 1 ? (
            <nav className="admin-pagination" aria-label="Media pages">
              {page > 1 ? (
                <a
                  className="admin-button-secondary"
                  href={`/admin/media?bucket=${activeBucket}&page=${page - 1}${search ? `&q=${encodeURIComponent(search)}` : ""}`}
                >
                  ← Previous
                </a>
              ) : null}
              <span className="admin-pagination__info">
                Page {page} of {totalPages}
              </span>
              {page < totalPages ? (
                <a
                  className="admin-button-secondary"
                  href={`/admin/media?bucket=${activeBucket}&page=${page + 1}${search ? `&q=${encodeURIComponent(search)}` : ""}`}
                >
                  Next →
                </a>
              ) : null}
            </nav>
          ) : null}
        </BulkSelectionProvider>
      </section>
    </AdminPage>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}