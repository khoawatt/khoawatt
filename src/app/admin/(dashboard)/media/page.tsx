import Link from "next/link";

import type { MediaBucket } from "@/features/cms/media";
import { fetchMediaPage } from "@/features/cms/media-library-actions";
import { AdminPage } from "../admin-page";
import { MediaLibraryGrid } from "./media-library-grid";
import { MediaUploadPanel } from "./media-upload-panel";

export const metadata = {
  title: "Admin media",
};

const BUCKETS: Array<{ id: MediaBucket; label: string; note: string }> = [
  { id: "blog-media", label: "Blog media", note: "Post covers and in-article images (public)." },
  { id: "project-media", label: "Project media", note: "Public project images." },
  { id: "resume-media", label: "Resume media", note: "Private; served only through the gated /api/resume-media route." },
  { id: "portfolio", label: "Portfolio", note: "Profile and social images (public)." },
];

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

interface AdminMediaPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * Full-page media manager (#102): bucket tabs + paginated, searchable grid.
 * The same MediaLibraryGrid engine powers the in-editor picker modal with
 * infinite scroll; this surface deep-links via searchParams instead.
 */
export default async function AdminMediaPage({
  searchParams,
}: Readonly<AdminMediaPageProps>) {
  const params = await searchParams;
  const requested = firstParam(params.bucket) as MediaBucket | undefined;
  const active = BUCKETS.some((b) => b.id === requested) ? requested! : "blog-media";
  const query = firstParam(params.q)?.trim() ?? "";
  const pageNumberRaw = Number(firstParam(params.page) ?? "1");
  const pageNumber =
    Number.isInteger(pageNumberRaw) && pageNumberRaw > 1 ? pageNumberRaw : 1;

  const initial = await fetchMediaPage(active, pageNumber, query || undefined);

  return (
    <AdminPage action={<Link className="admin-link-button" href="/admin">Dashboard</Link>} title="Media">
      <p className="admin-message">
        One library per bucket. Pick images from here or straight inside the
        editors; every image carries a title plus English/Vietnamese alt text
        used across the public site.
      </p>

      <nav aria-label="Media buckets" className="admin-tabs">
        {BUCKETS.map((bucket) => (
          <Link
            aria-current={bucket.id === active ? "page" : undefined}
            className={
              bucket.id === active ? "admin-tab admin-tab--active" : "admin-tab"
            }
            href={`?bucket=${bucket.id}`}
            key={bucket.id}
          >
            {bucket.label}
          </Link>
        ))}
      </nav>
      <p className="admin-note">{BUCKETS.find((b) => b.id === active)?.note}</p>

      <MediaLibraryGrid
        bucket={active}
        initial={initial}
        initialQuery={query}
        key={`${active}:${query}:${pageNumber}`}
        mode="page"
        pageNumber={pageNumber}
      />

      <section className="admin-section">
        <h2>Upload to {BUCKETS.find((b) => b.id === active)?.label}</h2>
        <MediaUploadPanel bucket={active} />
      </section>
    </AdminPage>
  );
}
