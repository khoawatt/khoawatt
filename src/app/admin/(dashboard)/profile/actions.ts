"use server";

import { revalidatePath } from "next/cache";

import { getServerClient, isAdminUser } from "@/features/cms/session";
import { isHttpUrl, required } from "@/features/cms/validation";

export interface ProfileFormData {
  name: string;
  shortName: string;
  githubUrl: string;
  linkedinUrl: string;
  resumeUrl: string;
  phone: string;
  email: string;
  roleEn: string;
  roleVi: string;
  introEn: string;
  introVi: string;
  locationEn: string;
  locationVi: string;
}

export interface ProfileActionResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Partial<Record<keyof ProfileFormData, string>>;
}

function validate(data: ProfileFormData): ProfileActionResult | null {
  const errors: Partial<Record<keyof ProfileFormData, string>> = {};

  if (!required(data.name)) errors.name = "Name is required.";
  if (data.githubUrl && !isHttpUrl(data.githubUrl)) errors.githubUrl = "Must be http(s).";
  if (data.linkedinUrl && !isHttpUrl(data.linkedinUrl)) errors.linkedinUrl = "Must be http(s).";
  if (data.resumeUrl && !isHttpUrl(data.resumeUrl)) errors.resumeUrl = "Must be http(s).";
  if (data.email && !isValidEmail(data.email)) errors.email = "Must be a valid email.";
  if (!required(data.roleEn)) errors.roleEn = "EN role is required.";
  if (!required(data.roleVi)) errors.roleVi = "VI role is required.";
  if (!required(data.introEn)) errors.introEn = "EN intro is required.";
  if (!required(data.introVi)) errors.introVi = "VI intro is required.";

  if (Object.keys(errors).length > 0) return { ok: false, fieldErrors: errors };
  return null;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function updateProfile(
  data: ProfileFormData,
): Promise<ProfileActionResult> {
  if (!(await isAdminUser())) return { ok: false, error: "Unauthorized." };
  const invalid = validate(data);
  if (invalid) return invalid;

  const client = await getServerClient();

  // Profile is a required singleton keyed by the stable slug 'owner'. Resolve the
  // existing row's id, or generate a fresh id to create it on first save.
  const { data: existing } = await client
    .from("profile")
    .select("id")
    .eq("slug", "owner")
    .maybeSingle();
  const profileId =
    existing?.id ?? (crypto.randomUUID() as unknown as string);

  // Single-transaction write: base row + both translation rows roll back together
  // on any failure (see migration cms_atomic_mutations). Creates the singleton
  // profile on first save and updates it thereafter.
  const { error } = await client.rpc("cms_upsert_profile", {
    p_id: profileId,
    p_name: data.name.trim(),
    p_short_name: data.shortName.trim(),
    p_github_url: data.githubUrl || null,
    p_linkedin_url: data.linkedinUrl || null,
    p_resume_url: data.resumeUrl || null,
    p_phone: data.phone || null,
    p_email: data.email || null,
    p_role_en: data.roleEn.trim(),
    p_role_vi: data.roleVi.trim(),
    p_intro_en: data.introEn.trim(),
    p_intro_vi: data.introVi.trim(),
    p_location_en: data.locationEn || null,
    p_location_vi: data.locationVi || null,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/vi");
  return { ok: true };
}

export async function deleteProfile(id: string): Promise<ProfileActionResult> {
  if (!(await isAdminUser())) return { ok: false, error: "Unauthorized." };

  const client = await getServerClient();

  const { data, error } = await client.rpc("cms_delete_profile", { p_id: id });
  if (error) return { ok: false, error: error.message };
  if (data && typeof data === "object" && "status" in data) {
    const res = data as { status: string; errorCode?: string; errorMessage?: string };
    if (res.status !== "deleted") {
      return { ok: false, error: res.errorMessage ?? res.errorCode ?? "Failed to delete." };
    }
  }

  revalidatePath("/");
  revalidatePath("/vi");
  revalidatePath("/admin/profile");
  return { ok: true };
}