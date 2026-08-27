"use server";

import { revalidatePath } from "next/cache";

import { getServerClient, isAdminUser } from "@/features/cms/session";
import { isHttpUrl, required } from "@/features/cms/validation";

export interface SocialLinkFormData {
  id?: string;
  label: string;
  url: string;
  iconKey?: string;
  order: number;
}

export interface SocialActionResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Partial<Record<keyof SocialLinkFormData, string>>;
}

function validate(data: SocialLinkFormData): SocialActionResult | null {
  const errors: Partial<Record<keyof SocialLinkFormData, string>> = {};
  if (!required(data.label)) errors.label = "Label is required.";
  if (!required(data.url)) errors.url = "URL is required.";
  else if (!isHttpUrl(data.url)) errors.url = "URL must be http(s).";
  if (Object.keys(errors).length > 0) return { ok: false, fieldErrors: errors };
  return null;
}

export async function createSocialLink(
  data: SocialLinkFormData,
): Promise<SocialActionResult> {
  if (!(await isAdminUser())) return { ok: false, error: "Unauthorized." };
  const invalid = validate(data);
  if (invalid) return invalid;

  const client = await getServerClient();

  const { error } = await client.rpc("cms_upsert_social", {
    p_id: data.id && data.id.length > 0 ? data.id : data.label.toLowerCase().replaceAll(" ", "-"),
    p_label: data.label.trim(),
    p_url: data.url.trim(),
    p_icon_key: data.iconKey || null,
    p_order: data.order,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/vi");
  revalidatePath("/admin/social");
  return { ok: true };
}

export async function updateSocialLink(
  data: SocialLinkFormData,
): Promise<SocialActionResult> {
  if (!(await isAdminUser())) return { ok: false, error: "Unauthorized." };
  const invalid = validate(data);
  if (invalid) return invalid;
  if (!data.id) return { ok: false, error: "Missing id." };

  const client = await getServerClient();

  const { error } = await client.rpc("cms_upsert_social", {
    p_id: data.id,
    p_label: data.label.trim(),
    p_url: data.url.trim(),
    p_icon_key: data.iconKey || null,
    p_order: data.order,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/vi");
  revalidatePath("/admin/social");
  return { ok: true };
}

export async function deleteSocialLink(id: string): Promise<SocialActionResult> {
  if (!(await isAdminUser())) return { ok: false, error: "Unauthorized." };
  const client = await getServerClient();

  const { error } = await client.rpc("cms_delete_social", { p_id: id });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/vi");
  revalidatePath("/admin/social");
  return { ok: true };
}
