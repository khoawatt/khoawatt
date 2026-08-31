"use server";

import { revalidatePath } from "next/cache";

import { getServerClient, isAdminUser } from "@/features/cms/session";
import { isHttpUrl, required } from "@/features/cms/validation";

export interface ProjectFormData {
  id?: string;
  slug: string;
  techStack: string;
  liveDemoUrl: string;
  codeUrl: string;
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
  descriptionEn: string;
  descriptionVi: string;
  highlightsEn: string;
  highlightsVi: string;
}

export interface ProjectActionResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Partial<Record<keyof ProjectFormData, string>>;
}

function validate(data: ProjectFormData): ProjectActionResult | null {
  const errors: Partial<Record<keyof ProjectFormData, string>> = {};

  if (!required(data.slug)) errors.slug = "Slug is required.";
  if (data.liveDemoUrl && !isHttpUrl(data.liveDemoUrl)) {
    errors.liveDemoUrl = "Live Demo URL must be http(s).";
  }
  if (data.codeUrl && !isHttpUrl(data.codeUrl)) {
    errors.codeUrl = "Code URL must be http(s).";
  }
  if (!required(data.titleEn)) errors.titleEn = "EN title is required.";
  if (!required(data.titleVi)) errors.titleVi = "VI title is required.";
  if (!required(data.categoryEn)) errors.categoryEn = "EN category is required.";
  if (!required(data.categoryVi)) errors.categoryVi = "VI category is required.";
  if (!required(data.summaryEn)) errors.summaryEn = "EN summary is required.";
  if (!required(data.summaryVi)) errors.summaryVi = "VI summary is required.";

  if (Object.keys(errors).length > 0) return { ok: false, fieldErrors: errors };
  return null;
}

function splitTechStack(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitLines(value: string): string[] {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function createProject(
  data: ProjectFormData,
): Promise<ProjectActionResult> {
  if (!(await isAdminUser())) return { ok: false, error: "Unauthorized." };
  const invalid = validate(data);
  if (invalid) return invalid;

  const id =
    data.id && data.id.length > 0 ? data.id : data.slug.toLowerCase().replaceAll(" ", "-");

  const client = await getServerClient();

  const { error } = await client.rpc("cms_upsert_project", {
    p_id: id,
    p_slug: data.slug.trim(),
    p_tech_stack: splitTechStack(data.techStack),
    p_live_demo_url: data.liveDemoUrl || null,
    p_code_url: data.codeUrl || null,
    p_featured: data.featured,
    p_order: data.order,
    p_status: data.status || "active",
    p_published: data.published,
    p_title_en: data.titleEn.trim(),
    p_title_vi: data.titleVi.trim(),
    p_category_en: data.categoryEn.trim(),
    p_category_vi: data.categoryVi.trim(),
    p_summary_en: data.summaryEn.trim(),
    p_summary_vi: data.summaryVi.trim(),
    p_description_en: data.descriptionEn.trim() || null,
    p_description_vi: data.descriptionVi.trim() || null,
    p_highlights_en: splitLines(data.highlightsEn),
    p_highlights_vi: splitLines(data.highlightsVi),
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/vi");
  revalidatePath("/admin/projects");
  return { ok: true };
}

export async function updateProject(
  data: ProjectFormData,
): Promise<ProjectActionResult> {
  if (!(await isAdminUser())) return { ok: false, error: "Unauthorized." };
  const invalid = validate(data);
  if (invalid) return invalid;
  if (!data.id) return { ok: false, error: "Missing id." };

  const client = await getServerClient();

  const { error } = await client.rpc("cms_upsert_project", {
    p_id: data.id,
    p_slug: data.slug.trim(),
    p_tech_stack: splitTechStack(data.techStack),
    p_live_demo_url: data.liveDemoUrl || null,
    p_code_url: data.codeUrl || null,
    p_featured: data.featured,
    p_order: data.order,
    p_status: data.status || "active",
    p_published: data.published,
    p_title_en: data.titleEn.trim(),
    p_title_vi: data.titleVi.trim(),
    p_category_en: data.categoryEn.trim(),
    p_category_vi: data.categoryVi.trim(),
    p_summary_en: data.summaryEn.trim(),
    p_summary_vi: data.summaryVi.trim(),
    p_description_en: data.descriptionEn.trim() || null,
    p_description_vi: data.descriptionVi.trim() || null,
    p_highlights_en: splitLines(data.highlightsEn),
    p_highlights_vi: splitLines(data.highlightsVi),
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/vi");
  revalidatePath("/admin/projects");
  return { ok: true };
}

export async function deleteProject(id: string): Promise<ProjectActionResult> {
  if (!(await isAdminUser())) return { ok: false, error: "Unauthorized." };

  const client = await getServerClient();

  const { data, error } = await client.rpc("cms_delete_project", { p_id: id });
  if (error) return { ok: false, error: error.message };
  if (data && typeof data === "object" && "status" in data) {
    const res = data as { status: string; errorCode?: string; errorMessage?: string };
    if (res.status !== "deleted") {
      return { ok: false, error: res.errorMessage ?? res.errorCode ?? "Failed to delete." };
    }
  }

  revalidatePath("/");
  revalidatePath("/vi");
  revalidatePath("/admin/projects");
  return { ok: true };
}