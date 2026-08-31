"use server";

import { revalidatePath } from "next/cache";

import { getServerClient, isAdminUser } from "@/features/cms/session";
import { isHttpUrl, required } from "@/features/cms/validation";

export interface ResumeActionResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export interface ResumeCategoryFormData {
  id?: string;
  order: number;
  nameEn: string;
  nameVi: string;
}

export interface ResumeEntryFormData {
  id?: string;
  categoryId: string;
  startDate: string;
  endDate: string;
  order: number;
  draft: boolean;
  titleEn: string;
  titleVi: string;
  organizationEn: string;
  organizationVi: string;
  locationEn: string;
  locationVi: string;
  dateLabelEn: string;
  dateLabelVi: string;
  summaryEn: string;
  summaryVi: string;
  highlightsEn: string;
  highlightsVi: string;
  tagsEn: string;
  tagsVi: string;
  linkHref: string;
  linkLabelEn: string;
  linkLabelVi: string;
}

function splitLines(value: string): string[] {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitTags(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildLinks(href: string, labelEn: string, labelVi: string): { en: unknown[]; vi: unknown[] } {
  const cleanHref = href.trim();
  if (!cleanHref) return { en: [], vi: [] };
  const enLabel = labelEn.trim() || cleanHref;
  const viLabel = labelVi.trim() || enLabel;
  return {
    en: [{ label: enLabel, href: cleanHref }],
    vi: [{ label: viLabel, href: cleanHref }],
  };
}

export async function createResumeCategory(
  data: ResumeCategoryFormData,
): Promise<ResumeActionResult> {
  if (!(await isAdminUser())) return { ok: false, error: "Unauthorized." };
  if (!required(data.nameEn) || !required(data.nameVi)) {
    return { ok: false, error: "EN and VI names are required." };
  }

  const id = data.id && data.id.length > 0 ? data.id : slugify(data.nameEn);
  const client = await getServerClient();

  const { error } = await client.rpc("cms_upsert_resume_category", {
    p_id: id,
    p_order: data.order,
    p_name_en: data.nameEn.trim(),
    p_name_vi: data.nameVi.trim(),
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/resume");
  return { ok: true };
}

export async function updateResumeCategory(
  data: ResumeCategoryFormData,
): Promise<ResumeActionResult> {
  if (!(await isAdminUser())) return { ok: false, error: "Unauthorized." };
  if (!data.id) return { ok: false, error: "Missing id." };
  if (!required(data.nameEn) || !required(data.nameVi)) {
    return { ok: false, error: "EN and VI names are required." };
  }

  const client = await getServerClient();

  const { error } = await client.rpc("cms_upsert_resume_category", {
    p_id: data.id,
    p_order: data.order,
    p_name_en: data.nameEn.trim(),
    p_name_vi: data.nameVi.trim(),
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/vi");
  revalidatePath("/admin/resume");
  return { ok: true };
}

export async function deleteResumeCategory(
  id: string,
): Promise<ResumeActionResult> {
  if (!(await isAdminUser())) return { ok: false, error: "Unauthorized." };

  const client = await getServerClient();

  const { data, error } = await client.rpc("cms_delete_resume_category", { p_id: id });
  if (error) return { ok: false, error: error.message };
  if (data && typeof data === "object" && "status" in data) {
    const res = data as { status: string; errorCode?: string; errorMessage?: string };
    if (res.status !== "deleted") return { ok: false, error: res.errorMessage ?? res.errorCode ?? "Failed to delete." };
  }

  revalidatePath("/");
  revalidatePath("/vi");
  revalidatePath("/admin/resume");
  return { ok: true };
}

export async function createResumeEntry(
  data: ResumeEntryFormData,
): Promise<ResumeActionResult> {
  if (!(await isAdminUser())) return { ok: false, error: "Unauthorized." };
  const invalid = validateEntry(data);
  if (invalid) return invalid;

  const id =
    data.id && data.id.length > 0
      ? data.id
      : `${data.categoryId}-${slugify(data.titleEn)}`;
  const client = await getServerClient();
  const links = buildLinks(data.linkHref, data.linkLabelEn, data.linkLabelVi);

  const { error } = await client.rpc("cms_upsert_resume_entry", {
    p_id: id,
    p_category_id: data.categoryId,
    p_start_date: data.startDate || null,
    p_end_date: data.endDate || null,
    p_order: data.order,
    p_draft: data.draft,
    p_title_en: data.titleEn.trim(),
    p_title_vi: data.titleVi.trim(),
    p_organization_en: data.organizationEn.trim() || null,
    p_organization_vi: data.organizationVi.trim() || null,
    p_location_en: data.locationEn.trim() || null,
    p_location_vi: data.locationVi.trim() || null,
    p_date_label_en: data.dateLabelEn.trim() || null,
    p_date_label_vi: data.dateLabelVi.trim() || null,
    p_summary_en: data.summaryEn.trim() || null,
    p_summary_vi: data.summaryVi.trim() || null,
    p_highlights_en: splitLines(data.highlightsEn),
    p_highlights_vi: splitLines(data.highlightsVi),
    p_tags_en: splitTags(data.tagsEn),
    p_tags_vi: splitTags(data.tagsVi),
    p_links_en: links.en,
    p_links_vi: links.vi,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/vi");
  revalidatePath("/admin/resume");
  return { ok: true };
}

export async function updateResumeEntry(
  data: ResumeEntryFormData,
): Promise<ResumeActionResult> {
  if (!(await isAdminUser())) return { ok: false, error: "Unauthorized." };
  if (!data.id) return { ok: false, error: "Missing id." };
  const invalid = validateEntry(data);
  if (invalid) return invalid;

  const client = await getServerClient();

  const links = buildLinks(data.linkHref, data.linkLabelEn, data.linkLabelVi);
  const { error } = await client.rpc("cms_upsert_resume_entry", {
    p_id: data.id,
    p_category_id: data.categoryId,
    p_start_date: data.startDate || null,
    p_end_date: data.endDate || null,
    p_order: data.order,
    p_draft: data.draft,
    p_title_en: data.titleEn.trim(),
    p_title_vi: data.titleVi.trim(),
    p_organization_en: data.organizationEn.trim() || null,
    p_organization_vi: data.organizationVi.trim() || null,
    p_location_en: data.locationEn.trim() || null,
    p_location_vi: data.locationVi.trim() || null,
    p_date_label_en: data.dateLabelEn.trim() || null,
    p_date_label_vi: data.dateLabelVi.trim() || null,
    p_summary_en: data.summaryEn.trim() || null,
    p_summary_vi: data.summaryVi.trim() || null,
    p_highlights_en: splitLines(data.highlightsEn),
    p_highlights_vi: splitLines(data.highlightsVi),
    p_tags_en: splitTags(data.tagsEn),
    p_tags_vi: splitTags(data.tagsVi),
    p_links_en: links.en,
    p_links_vi: links.vi,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/vi");
  revalidatePath("/admin/resume");
  return { ok: true };
}

export async function deleteResumeEntry(
  id: string,
): Promise<ResumeActionResult> {
  if (!(await isAdminUser())) return { ok: false, error: "Unauthorized." };

  const client = await getServerClient();

  const { data, error } = await client.rpc("cms_delete_resume_entry", { p_id: id });
  if (error) return { ok: false, error: error.message };
  if (data && typeof data === "object" && "status" in data) {
    const res = data as { status: string; errorCode?: string; errorMessage?: string };
    if (res.status !== "deleted") return { ok: false, error: res.errorMessage ?? res.errorCode ?? "Failed to delete." };
  }

  revalidatePath("/");
  revalidatePath("/vi");
  revalidatePath("/admin/resume");
  return { ok: true };
}

function validateEntry(data: ResumeEntryFormData): ResumeActionResult | null {
  if (!required(data.categoryId)) {
    return { ok: false, fieldErrors: { categoryId: "Category is required." } };
  }
  if (!required(data.titleEn)) {
    return { ok: false, fieldErrors: { titleEn: "EN title is required." } };
  }
  if (!required(data.titleVi)) {
    return { ok: false, fieldErrors: { titleVi: "VI title is required." } };
  }
  if (data.linkHref && !isHttpUrl(data.linkHref)) {
    return { ok: false, fieldErrors: { linkHref: "Link must be http(s)." } };
  }
  return null;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}