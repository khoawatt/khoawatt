import type { SupabaseClient } from "@supabase/supabase-js";

import type { Locale } from "@/features/i18n/config";

import {
  validateNewsletterSignup,
  type NewsletterFieldErrors,
} from "./validation";

export interface NewsletterSubmitInput {
  email: string;
  locale: Locale;
}

export interface NewsletterSubmitDeps {
  supabase: SupabaseClient | null;
}

export type NewsletterSubmitResult =
  | { status: "success" }
  | { status: "already-subscribed" }
  | { status: "field-error"; fieldErrors: NewsletterFieldErrors }
  | { status: "server-error" };

export async function submitNewsletter(
  input: NewsletterSubmitInput,
  deps: NewsletterSubmitDeps,
): Promise<NewsletterSubmitResult> {
  const fieldErrors = validateNewsletterSignup({ email: input.email });
  if (Object.keys(fieldErrors).length > 0) {
    return { status: "field-error", fieldErrors };
  }

  if (!deps.supabase) {
    return { status: "server-error" };
  }

  const email = input.email.trim().toLowerCase();
  const locale: Locale = input.locale === "vi" ? "vi" : "en";

  const { error } = await deps.supabase
    .from("newsletter_subscribers")
    .insert({ email, locale });

  if (error) {
    const code = (error as { code?: string }).code;
    // Unique violation on lower(email)
    if (code === "23505") {
      return { status: "already-subscribed" };
    }
    return { status: "server-error" };
  }

  return { status: "success" };
}
