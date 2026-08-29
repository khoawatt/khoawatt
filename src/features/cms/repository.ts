import type { Locale } from "@/features/i18n/config";
import {
  getPortfolioProfile as getLocalProfile,
  type PortfolioProfileView,
} from "@/content/profile";
import {
  foldOtherCategories,
  getSkillsContent as getLocalSkills,
  type OtherCategoryEntry,
  type SkillGroup,
  type SkillIconKey,
  type SkillsContentView,
} from "@/content/skills";
import {
  getContactContent as getLocalContact,
  type ContactContentView,
} from "@/content/contact";
import {
  getFeaturedProjects as getLocalFeaturedProjects,
  type FeaturedProjectsView,
} from "@/content/projects";
import {
  getResumeContent as getLocalResume,
  type ResumeCategory,
  type ResumeContentView,
} from "@/content/resume";
import { getServiceClient } from "./server";
import { hasCmsConfig } from "./config";

/**
 * Repository boundary for the public read path (Issue #20 / #18).
 *
 * The public, unauthenticated SSR page reads CMS-managed content through this
 * adapter. Per the accepted #18 design, the public runtime read path uses the
 * narrow server-only service-role client (anon has zero privileges and RLS
 * would deny it). This is intentionally separate from the authenticated-owner
 * CRUD path used by the admin dashboard.
 *
 * Each accessor returns the existing typed view model: CMS data overrides the
 * CMS-managed fields, and the static copy (hero/contact/skills copy, form
 * labels, images) falls back to the local typed content when the CMS is not
 * configured or a record is missing. The public UI never sees raw Supabase rows.
 */

interface ProfileRow {
  name: string | null;
  github_url: string | null;
  profile_translations: Array<{
    locale: string;
    role: string;
    intro: string;
  }>;
}

interface SkillTranslation {
  locale: string;
  name: string;
  category: string | null;
}

interface SkillRow {
  id: string;
  group_key: SkillGroup;
  icon_key: SkillIconKey | null;
  url: string | null;
  order: number;
  category_key?: string | null;
  skill_translations: SkillTranslation[];
}

interface SocialRow {
  id: string;
  label: string;
  url: string;
  icon_key: string | null;
  order: number;
}

export async function getPortfolioProfile(
  locale: Locale,
): Promise<PortfolioProfileView> {
  const base = getLocalProfile(locale);

  if (!hasCmsConfig()) {
    return base;
  }

  const client = getServiceClient();
  if (!client) return base;

  try {
    const { data, error } = await client
      .from("profile")
      .select(
        "name, github_url, profile_translations(locale, role, intro)",
      )
      .maybeSingle();

    if (error || !data) return base;

    const row = data as ProfileRow;
    const en = row.profile_translations.find((t) => t.locale === "en");
    const vi = row.profile_translations.find((t) => t.locale === "vi");
    const active = locale === "vi" ? vi : en;

    return {
      ...base,
      name: row.name || base.name,
      role: active?.role || base.role,
      githubUrl: row.github_url || base.githubUrl,
      about: {
        ...base.about,
        intro: active?.intro || base.about.intro,
      },
    };
  } catch {
    return base;
  }
}

/**
 * Single source of truth for the header GitHub icon.
 * Priority: `social_links` (icon_key='github') > `profile.github_url` > static fallback.
 * This eliminates the previous duplication where `admin/profile` and `admin/social`
 * both managed a GitHub URL and `SiteHeader` was wired to the static import.
 */
export async function getGithubUrl(): Promise<string> {
  const fallback = getLocalProfile("en").githubUrl;

  if (!hasCmsConfig()) return fallback;

  const client = getServiceClient();
  if (!client) return fallback;

  try {
    const { data: socialRow } = await client
      .from("social_links")
      .select("url")
      .eq("icon_key", "github")
      .order("order")
      .limit(1)
      .maybeSingle();

    const socialUrl = (socialRow as { url?: string | null } | null)?.url;
    if (socialUrl && socialUrl.startsWith("https://")) return socialUrl;

    const { data: profileRow } = await client
      .from("profile")
      .select("github_url")
      .maybeSingle();

    const profileUrl = (profileRow as { github_url?: string | null } | null)
      ?.github_url;
    if (profileUrl && profileUrl.startsWith("https://")) return profileUrl;

    return fallback;
  } catch {
    return fallback;
  }
}

export async function getSkillsContent(
  locale: Locale,
): Promise<SkillsContentView> {
  const base = getLocalSkills(locale);

  if (!hasCmsConfig()) {
    return base;
  }

  const client = getServiceClient();
  if (!client) return base;

  try {
    const { data, error } = await client
      .from("skills")
      .select(
        "id, group_key, icon_key, url, order, category_key, skill_translations(locale, name, category)",
      )
      .order("group_key")
      .order("order")
      .order("id");

    if (error || !data) return base;

    const rows = data as SkillRow[];

    const techStack = rows
      .filter((r) => r.group_key === "tech-stack")
      .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
      .map((r) => ({
        id: r.id,
        name: pickTranslation(r.skill_translations, "name", locale),
        iconKey: r.icon_key ?? undefined,
      }));

    const otherRows = rows
      .filter((r) => r.group_key === "others")
      .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));

    const otherEntries: OtherCategoryEntry[] = otherRows.map((row) => {
      const translationEn = row.skill_translations.find(
        (t) => t.locale === "en",
      );
      const categoryEn = translationEn?.category ?? null;

      return {
        id: row.id,
        name: pickTranslation(row.skill_translations, "name", locale),
        categoryKey: row.category_key ?? undefined,
        categoryEn,
        categoryDisplay:
          row.skill_translations.find((t) => t.locale === locale)?.category ??
          categoryEn ??
          undefined,
        iconKey: row.icon_key ?? undefined,
      };
    });

    return {
      ...base,
      techStack,
      otherCategories: foldOtherCategories(otherEntries, locale),
    };
  } catch {
    return base;
  }
}

export async function getContactContent(
  locale: Locale,
): Promise<ContactContentView> {
  const base = getLocalContact(locale);

  if (!hasCmsConfig()) {
    return base;
  }

  const client = getServiceClient();
  if (!client) return base;

  try {
    const { data, error } = await client
      .from("social_links")
      .select("id, label, url, icon_key, order")
      .order("order")
      .order("id");

    if (error || !data) return base;

    const rows = data as SocialRow[];
    const platformSet = new Set<string>([
      "facebook",
      "github",
      "instagram",
      "linkedin",
      "thread",
      "x",
    ]);

    const cmsSocials = rows
      .filter(
        (row) =>
          row.url.startsWith("https://") &&
          row.icon_key !== null &&
          platformSet.has(row.icon_key),
      )
      .map((row) => ({
        id: row.icon_key as ContactContentView["socials"][number]["id"],
        label: row.label,
        href: row.url,
      }));

    return {
      ...base,
      // Contact details stay owner-managed static content; only configured
      // socials are CMS-driven. An empty table falls back to static defaults.
      socials: cmsSocials.length > 0 ? cmsSocials : base.socials,
    };
  } catch {
    return base;
  }
}

interface ProjectMediaRow {
  id: string;
  src: string;
  width: number | null;
  height: number | null;
  focal_point: string | null;
  order: number;
  project_media_translations: Array<{ locale: string; alt: string }>;
}

interface ProjectRow {
  id: string;
  slug: string;
  tech_stack: string[] | string;
  live_demo_url: string | null;
  code_url: string | null;
  featured: boolean;
  order: number;
  status: string;
  published: boolean;
  project_translations: Array<{
    locale: string;
    title: string;
    category: string;
    summary: string;
    description: string | null;
    highlights?: string[] | string;
  }>;
  project_media: ProjectMediaRow[];
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

function orUndefined(value: string | null | undefined): string | undefined {
  return value == null ? undefined : value;
}

export async function getFeaturedProjects(
  locale: Locale,
): Promise<FeaturedProjectsView> {
  const base = getLocalFeaturedProjects(locale);

  if (!hasCmsConfig()) {
    return base;
  }

  const client = getServiceClient();
  if (!client) return base;

  try {
    const { data, error } = await client
      .from("projects")
      .select(
        "id, slug, tech_stack, live_demo_url, code_url, featured, order, status, published, project_translations(locale, title, category, summary, description, highlights), project_media(id, src, width, height, focal_point, order, project_media_translations(locale, alt))",
      )
      .eq("featured", true)
      .eq("published", true)
      .eq("status", "active")
      .order("order")
      .order("id");

    if (error || !data) return base;

    const rows = data as ProjectRow[];
    rows.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));

    // A featured+published project with zero media is non-renderable (the
    // carousel has no zero-media state). Drop such rows BEFORE assigning the
    // visible index so numbering stays contiguous (01/…, 02/…).
    const renderable = rows
      .map((row) => ({
        row,
        media: [...(row.project_media ?? [])]
          .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
          .map((m) => {
            const alt =
              m.project_media_translations.find((t) => t.locale === locale)?.alt ??
              m.project_media_translations.find((t) => t.locale === "en")?.alt ??
              "";
            return {
              id: m.id,
              src: m.src,
              alt,
              width: m.width ?? 800,
              height: m.height ?? 600,
              focalPoint: m.focal_point ?? "50% 50%",
            };
          }),
      }))
      .filter((entry) => entry.media.length > 0);

    const projects = renderable.map(({ row, media }, index) => {
      const en = row.project_translations.find((t) => t.locale === "en");
      const active = row.project_translations.find((t) => t.locale === locale);

      const highlights =
        parseStringArray(active?.highlights).length > 0
          ? parseStringArray(active?.highlights)
          : parseStringArray(en?.highlights);

      return {
        id: row.id,
        index: String(index + 1).padStart(2, "0"),
        title: active?.title ?? en?.title ?? "",
        category: active?.category ?? en?.category ?? "",
        summary: active?.summary ?? en?.summary ?? "",
        techStack: parseTechStack(row.tech_stack),
        media,
        liveDemoUrl: row.live_demo_url ?? undefined,
        codeUrl: row.code_url ?? undefined,
        ...(highlights.length > 0 ? { highlights } : {}),
      };
    });

    return {
      ...base,
      projects,
    };
  } catch {
    return base;
  }
}

function pickTranslation(
  translations: SkillTranslation[],
  key: "name" | "category",
  locale: Locale,
): string {
  const en = translations.find((t) => t.locale === "en");
  const active = translations.find((t) => t.locale === locale);
  return active?.[key] ?? en?.[key] ?? "";
}

interface ResumeCategoryRow {
  id: string;
  slug: string;
  order: number;
  resume_category_translations: Array<{ locale: string; name: string }>;
}

interface ResumeEntryRow {
  id: string;
  category_id: string;
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
  resume_media: Array<{
    id: string;
    thumbnail_src: string;
    full_src: string;
    width: number | null;
    height: number | null;
    resume_media_translations: Array<{
      locale: string;
      alt: string;
      caption: string | null;
    }>;
  }>;
}

export async function getResumeContent(
  locale: Locale,
): Promise<ResumeContentView> {
  const base = getLocalResume(locale);

  if (!hasCmsConfig()) {
    return base;
  }

  const client = getServiceClient();
  if (!client) return base;

  try {
    const [categoriesRes, entriesRes] = await Promise.all([
      client
        .from("resume_categories")
        .select("id, slug, order, resume_category_translations(locale, name)")
        .order("order")
        .order("id"),
      client
        .from("resume_entries")
        .select(
          "id, category_id, order, draft, resume_entry_translations(locale, title, organization, location, date_label, summary, highlights, tags), resume_media(id, thumbnail_src, full_src, width, height, resume_media_translations(locale, alt, caption))",
        )
        .eq("draft", false)
        .order("order")
        .order("id"),
    ]);

    if (categoriesRes.error || entriesRes.error) return base;

    const categories = (categoriesRes.data ?? []) as ResumeCategoryRow[];
    const entries = (entriesRes.data ?? []) as ResumeEntryRow[];

    const categoriesView = categories.map((category) => {
      const categoryEn = category.resume_category_translations.find(
        (t) => t.locale === "en",
      );
      const categoryActive = category.resume_category_translations.find(
        (t) => t.locale === locale,
      );
      const categoryEntries = entries
        .filter((entry) => entry.category_id === category.id)
        .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));

      return {
        id: category.id as ResumeCategory,
        name: categoryActive?.name ?? categoryEn?.name ?? category.slug,
        entries: categoryEntries.map((entry, index) => {
          const en = entry.resume_entry_translations.find((t) => t.locale === "en");
          const active = entry.resume_entry_translations.find(
            (t) => t.locale === locale,
          );
          const media = (entry.resume_media ?? []).map((m) => {
            const mActive = m.resume_media_translations.find(
              (t) => t.locale === locale,
            );
            const mEn = m.resume_media_translations.find((t) => t.locale === "en");
            return {
              id: m.id,
              thumbnailSrc: m.thumbnail_src,
              fullSrc: m.full_src,
              alt: mActive?.alt ?? mEn?.alt ?? "",
              caption: mActive?.caption ?? mEn?.caption ?? undefined,
              width: m.width ?? undefined,
              height: m.height ?? undefined,
            };
          });
          const highlights = parseStringArray(active?.highlights).length
            ? parseStringArray(active?.highlights)
            : parseStringArray(en?.highlights);
          const tags = parseStringArray(active?.tags).length
            ? parseStringArray(active?.tags)
            : parseStringArray(en?.tags);

          return {
            id: entry.id,
            index: String(index + 1).padStart(2, "0"),
            title: active?.title ?? en?.title ?? "",
            ...(orUndefined(active?.organization) ?? orUndefined(en?.organization)
              ? { organization: orUndefined(active?.organization) ?? orUndefined(en?.organization) }
              : {}),
            ...(orUndefined(active?.location) ?? orUndefined(en?.location)
              ? { location: orUndefined(active?.location) ?? orUndefined(en?.location) }
              : {}),
            ...(orUndefined(active?.date_label) ?? orUndefined(en?.date_label)
              ? { dateLabel: orUndefined(active?.date_label) ?? orUndefined(en?.date_label) }
              : {}),
            ...(orUndefined(active?.summary) ?? orUndefined(en?.summary)
              ? { summary: orUndefined(active?.summary) ?? orUndefined(en?.summary) }
              : {}),
            ...(highlights.length > 0 ? { highlights } : {}),
            ...(tags.length > 0 ? { tags } : {}),
            ...(media.length > 0 ? { media } : {}),
          };
        }),
      };
    });

    return {
      ...base,
      categories: categoriesView,
    };
  } catch {
    return base;
  }
}