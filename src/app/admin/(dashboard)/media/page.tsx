import { listBucketObjects, getMediaPublicUrl } from "@/features/cms/media";
import type { MediaBucket } from "@/features/cms/media";
import { MediaUploadForm } from "./media-upload-form";
import { AdminPage } from "../admin-page";
import {
  BulkDeleteBar,
  BulkSelectionProvider,
  DeleteActionButton,
  SelectAllCheckbox,
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

export default async function AdminMediaPage() {
  const bucketRows = await Promise.all(
    buckets.map(async (bucket) => ({
      bucket,
      objects: await listBucketObjects(bucket.id),
    })),
  );

  return (
    <AdminPage title="Media">
      <p className="admin-message">
        Upload and manage images stored in Supabase Storage. Resume media is
        private and served only through the gated route; project and portfolio
        media are public.
      </p>

      {bucketRows.map(({ bucket, objects }) => {
        const items = objects.map((object) => ({
          id: object.name,
          label: object.name,
        }));
        return (
          <section className="admin-section" key={bucket.id}>
            <div className="admin-page-head">
              <h2>{bucket.label}</h2>
            </div>
            <p className="admin-note">{bucket.note}</p>
            <MediaUploadForm bucket={bucket.id} />

            <BulkSelectionProvider>
              <BulkDeleteBar bucket={bucket.id} entity="media" items={items} noun="file" />

              {objects.length === 0 ? (
                <p className="admin-message">No files uploaded yet.</p>
              ) : (
                <ul className="admin-media-list">
                  <li className="admin-media-item admin-media-item--select-all">
                    <SelectAllCheckbox ids={items.map((item) => item.id)} label={`Select all files in ${bucket.label}`} />
                    <span>Select all</span>
                  </li>
                  {objects.map((object) => (
                    <li className="admin-media-item" key={object.id}>
                      <div className="admin-media-preview">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          alt={object.name}
                          height={80}
                          loading="lazy"
                          src={getMediaPublicUrl(bucket.id, object.name)}
                          width={80}
                        />
                      </div>
                      <div className="admin-media-meta">
                        <code>{object.name}</code>
                        <div className="admin-media-actions">
                          <SelectionCheckbox id={object.name} label={object.name} />
                          <DeleteActionButton
                            bucket={bucket.id}
                            entity="media"
                            item={{ id: object.name, label: object.name }}
                            noun="file"
                          />
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </BulkSelectionProvider>
          </section>
        );
      })}
    </AdminPage>
  );
}
