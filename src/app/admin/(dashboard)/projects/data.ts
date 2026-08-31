import { getServerClient } from "@/features/cms/session";

export interface AdminProjectRow {
  id: string;
  slug: string;
  techStack: string[];
  liveDemoUrl: string | null;
  codeUrl: string | null;
  featured: boolean;
  order: number;
  status: string;
  published: boolean;
  titleEn: string;
  titleVi: string;
  categoryEn: string;
  categoryVi: string;
  summaryEn: string;
  summaryVi: string;
  descriptionEn: string | null;
  descriptionVi: string | null;
  highlightsEn: string[];
  highlightsVi: string[];
}

interface ProjectTranslation {
  locale: string;
  title: string;
  category: string;
  summary: string;
  description: string | null;
  highlights?: string[] | string;
}

interface ProjectRowWithTranslations {
  id: string;
  slug: string;
  tech_stack: string[] | string;
  live_demo_url: string | null;
  code_url: string | null;
  featured: boolean;
  order: number;
  status: string;
  published: boolean;
  project_translations: ProjectTranslation[];
}

export async function listProjects(): Promise<AdminProjectRow[]> {
  const client = await getServerClient();

  const { data, error } = await client
    .from("projects")
    .select(
      "id, slug, tech_stack, live_demo_url, code_url, featured, order, status, published, project_translations(locale, title, category, summary, description, highlights)",
    )
    .is("deleted_at", null)
    .order("featured", { ascending: false })
    .order("order")
    .order("id");

  if (error || !data) return [];

  return data.map(mapProjectRow);
}

export async function getProject(id: string): Promise<AdminProjectRow | null> {
  const rows = await listProjects();
  return rows.find((row) => row.id === id) ?? null;
}

function mapProjectRow(
  data: ProjectRowWithTranslations,
): AdminProjectRow {
  const en = data.project_translations.find((t) => t.locale === "en");
  const vi = data.project_translations.find((t) => t.locale === "vi");

  return {
    id: data.id,
    slug: data.slug,
    techStack: parseTechStack(data.tech_stack),
    liveDemoUrl: data.live_demo_url,
    codeUrl: data.code_url,
    featured: data.featured,
    order: data.order,
    status: data.status,
    published: data.published,
    titleEn: en?.title ?? "",
    titleVi: vi?.title ?? "",
    categoryEn: en?.category ?? "",
    categoryVi: vi?.category ?? "",
    summaryEn: en?.summary ?? "",
    summaryVi: vi?.summary ?? "",
    descriptionEn: en?.description ?? null,
    descriptionVi: vi?.description ?? null,
    highlightsEn: parseStringArray(en?.highlights),
    highlightsVi: parseStringArray(vi?.highlights),
  };
}

function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item));
  }
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

function parseTechStack(value: string[] | string | null | undefined): string[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value.length > 0) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}