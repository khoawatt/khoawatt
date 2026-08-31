import { getServerClient } from "@/features/cms/session";

export interface AdminResumeCategory {
  id: string;
  slug: string;
  order: number;
  nameEn: string;
  nameVi: string;
}

export interface AdminResumeEntry {
  id: string;
  categoryId: string;
  startDate: string | null;
  endDate: string | null;
  order: number;
  draft: boolean;
  titleEn: string;
  titleVi: string;
  organizationEn: string | null;
  organizationVi: string | null;
  locationEn: string | null;
  locationVi: string | null;
  dateLabelEn: string | null;
  dateLabelVi: string | null;
  summaryEn: string | null;
  summaryVi: string | null;
  highlightsEn: string[];
  highlightsVi: string[];
  tagsEn: string[];
  tagsVi: string[];
  linkHref: string | null;
  linkLabelEn: string | null;
  linkLabelVi: string | null;
}

export interface AdminResumeMedia {
  id: string;
  resumeEntryId: string;
  thumbnailSrc: string;
  fullSrc: string;
  width: number | null;
  height: number | null;
  altEn: string;
  altVi: string;
  captionEn: string | null;
  captionVi: string | null;
}

interface ResumeMediaRow {
  id: string;
  resume_entry_id: string;
  thumbnail_src: string;
  full_src: string;
  width: number | null;
  height: number | null;
  resume_media_translations: Array<{ locale: string; alt: string; caption: string | null }>;
}

interface CategoryRow {
  id: string;
  slug: string;
  order: number;
  resume_category_translations: Array<{ locale: string; name: string }>;
}

interface EntryRow {
  id: string;
  category_id: string;
  start_date: string | null;
  end_date: string | null;
  order: number;
  draft: boolean;
  resume_entry_translations: Array<{
    locale: string;
    title: string;
    organization: string | null;
    location: string | null;
    date_label: string | null;
    summary: string | null;
    highlights: string[] | string;
    tags: string[] | string;
    links: Array<{ label: string; href: string }> | string;
  }>;
}

export async function listResumeCategories(): Promise<AdminResumeCategory[]> {
  const client = await getServerClient();

  const { data, error } = await client
    .from("resume_categories")
    .select("id, slug, order, resume_category_translations(locale, name)")
    .is("deleted_at", null)
    .order("order")
    .order("id");

  if (error || !data) return [];

  return data.map((row: CategoryRow) => {
    const en = row.resume_category_translations.find((t) => t.locale === "en");
    const vi = row.resume_category_translations.find((t) => t.locale === "vi");
    return {
      id: row.id,
      slug: row.slug,
      order: row.order,
      nameEn: en?.name ?? "",
      nameVi: vi?.name ?? "",
    };
  });
}

function parseLinks(value: unknown): Array<{ label: string; href: string }> {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (item && typeof item === "object" && "href" in item) {
          const href = String((item as { href: unknown }).href ?? "");
          const label = String((item as { label: unknown }).label ?? href);
          if (href) return { label, href };
        }
        return null;
      })
      .filter(Boolean) as Array<{ label: string; href: string }>;
  }
  if (typeof value === "string" && value.length > 0) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parseLinks(parsed);
    } catch {
      return [];
    }
  }
  return [];
}

export async function listResumeEntries(): Promise<AdminResumeEntry[]> {
  const client = await getServerClient();

  const { data, error } = await client
    .from("resume_entries")
    .select(
      "id, category_id, start_date, end_date, order, draft, resume_entry_translations(locale, title, organization, location, date_label, summary, highlights, tags, links)",
    )
    .is("deleted_at", null)
    .order("order")
    .order("id");

  if (error || !data) return [];

  return data.map((row: EntryRow) => {
    const en = row.resume_entry_translations.find((t) => t.locale === "en");
    const vi = row.resume_entry_translations.find((t) => t.locale === "vi");
    const enLinks = parseLinks(en?.links);
    const viLinks = parseLinks(vi?.links);
    const primaryHref = enLinks[0]?.href ?? viLinks[0]?.href ?? null;
    return {
      id: row.id,
      categoryId: row.category_id,
      startDate: row.start_date,
      endDate: row.end_date,
      order: row.order,
      draft: row.draft,
      titleEn: en?.title ?? "",
      titleVi: vi?.title ?? "",
      organizationEn: en?.organization ?? null,
      organizationVi: vi?.organization ?? null,
      locationEn: en?.location ?? null,
      locationVi: vi?.location ?? null,
      dateLabelEn: en?.date_label ?? null,
      dateLabelVi: vi?.date_label ?? null,
      summaryEn: en?.summary ?? null,
      summaryVi: vi?.summary ?? null,
      highlightsEn: parseStringArray(en?.highlights),
      highlightsVi: parseStringArray(vi?.highlights),
      tagsEn: parseStringArray(en?.tags),
      tagsVi: parseStringArray(vi?.tags),
      linkHref: primaryHref,
      linkLabelEn: enLinks[0]?.label ?? null,
      linkLabelVi: viLinks[0]?.label ?? null,
    };
  });
}

export async function getResumeEntry(id: string): Promise<AdminResumeEntry | null> {
  const rows = await listResumeEntries();
  return rows.find((row) => row.id === id) ?? null;
}

export async function listResumeMedia(entryId: string): Promise<AdminResumeMedia[]> {
  const client = await getServerClient();
  const { data, error } = await client
    .from("resume_media")
    .select("id, resume_entry_id, thumbnail_src, full_src, width, height, resume_media_translations(locale, alt, caption)")
    .eq("resume_entry_id", entryId)
    .order("id");
  if (error || !data) return [];
  return (data as ResumeMediaRow[]).map((row) => {
    const en = row.resume_media_translations.find((t) => t.locale === "en");
    const vi = row.resume_media_translations.find((t) => t.locale === "vi");
    return {
      id: row.id,
      resumeEntryId: row.resume_entry_id,
      thumbnailSrc: row.thumbnail_src,
      fullSrc: row.full_src,
      width: row.width,
      height: row.height,
      altEn: en?.alt ?? "",
      altVi: vi?.alt ?? "",
      captionEn: en?.caption ?? null,
      captionVi: vi?.caption ?? null,
    };
  });
}

function parseStringArray(value: string[] | string | null | undefined): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item));
  if (typeof value === "string" && value.length > 0) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
    } catch {
      return [];
    }
  }
  return [];
}