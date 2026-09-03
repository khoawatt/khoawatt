"use server";

import { getServiceClient } from "@/features/cms/server";
import { hasCmsConfig } from "@/features/cms/config";
import type { Locale } from "@/features/i18n/config";

import { submitNewsletter, type NewsletterSubmitResult } from "./submit";
import {
  validateNewsletterSignup,
  type NewsletterFieldErrors,
} from "./validation";

export type NewsletterActionState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "already-subscribed" }
  | { status: "field-error"; fieldErrors: NewsletterFieldErrors }
  | { status: "server-error" };

const initialState: NewsletterActionState = { status: "idle" };

export async function subscribeNewsletter(
  _prevState: NewsletterActionState,
  formData: FormData,
): Promise<NewsletterActionState> {
  const email = String(formData.get("email") ?? "");
  const rawLocale = String(formData.get("locale") ?? "en");
  const locale: Locale = rawLocale === "vi" ? "vi" : "en";

  const fieldErrors = validateNewsletterSignup({ email });
  if (Object.keys(fieldErrors).length > 0) {
    return { status: "field-error", fieldErrors };
  }

  if (!hasCmsConfig()) {
    return { status: "server-error" };
  }

  const client = getServiceClient();
  if (!client) {
    return { status: "server-error" };
  }

  const result: NewsletterSubmitResult = await submitNewsletter(
    { email, locale },
    { supabase: client },
  );

  switch (result.status) {
    case "success":
      return { status: "success" };
    case "already-subscribed":
      return { status: "already-subscribed" };
    case "field-error":
      return { status: "field-error", fieldErrors: result.fieldErrors };
    case "server-error":
      return { status: "server-error" };
    default:
      return { status: "server-error" };
  }
}
