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

export async function listResumeEntries(): Promise<AdminResumeEntry[]> {
  const client = await getServerClient();

  const { data, error } = await client
    .from("resume_entries")
    .select(
      "id, category_id, start_date, end_date, order, draft, resume_entry_translations(locale, title, organization, location, date_label, summary, highlights, tags)",
    )
    .is("deleted_at", null)
    .order("order")
    .order("id");

  if (error || !data) return [];

  return data.map((row: EntryRow) => {
    const en = row.resume_entry_translations.find((t) => t.locale === "en");
    const vi = row.resume_entry_translations.find((t) => t.locale === "vi");
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
    };
  });
}

export async function getResumeEntry(id: string): Promise<AdminResumeEntry | null> {
  const rows = await listResumeEntries();
  return rows.find((row) => row.id === id) ?? null;
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