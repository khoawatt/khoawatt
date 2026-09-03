"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import type { FooterContentView } from "@/content/footer";
import type { Locale } from "@/features/i18n/config";
import { subscribeNewsletter } from "@/features/newsletter/actions";
import {
  validateNewsletterSignup,
  type NewsletterFieldErrors,
} from "@/features/newsletter/validation";

interface NewsletterFormProps {
  content: FooterContentView;
  locale: Locale;
}

function SubmitButton({
  newsletter,
}: Readonly<{ newsletter: FooterContentView["newsletter"] }>) {
  const { pending } = useFormStatus();

  return (
    <button
      className="newsletter-form__submit"
      disabled={pending}
      type="submit"
    >
      {pending ? newsletter.submitting : newsletter.submit}
    </button>
  );
}

const newsletterInitialState = { status: "idle" } as const;

export function NewsletterForm({
  content,
  locale,
}: Readonly<NewsletterFormProps>) {
  const [state, formAction] = useActionState(
    subscribeNewsletter,
    newsletterInitialState,
  );
  const [email, setEmail] = useState("");
  const [fieldErrors, setFieldErrors] = useState<NewsletterFieldErrors>({});
  const [lastState, setLastState] = useState(state);

  const newsletter = content.newsletter;

  if (state !== lastState) {
    setLastState(state);
    if (state.status === "success" || state.status === "already-subscribed") {
      setEmail("");
      setFieldErrors({});
    } else if (state.status === "field-error") {
      setFieldErrors(state.fieldErrors);
    } else if (state.status === "server-error") {
      setFieldErrors({});
    } else if (state.status === "idle") {
      setFieldErrors({});
    }
  }

  const fieldErrorCode = fieldErrors.email ?? null;
  const fieldError = fieldErrorCode ? newsletter.errors[fieldErrorCode] : null;
  const hasFieldError = fieldError !== null;

  const statusMessage = (() => {
    if (hasFieldError) {
      return "";
    }
    switch (state.status) {
      case "success":
        return newsletter.success;
      case "already-subscribed":
        return newsletter.alreadySubscribed;
      case "server-error":
        return newsletter.serverError;
      default:
        return "";
    }
  })();

  const statusClassName = (() => {
    if (!statusMessage) return "newsletter-form__status";
    const modifier =
      state.status === "server-error"
        ? "newsletter-form__status--error"
        : "newsletter-form__status--success";
    return `newsletter-form__status ${modifier}`;
  })();

  function handleChange(value: string) {
    setEmail(value);
    if (fieldErrors.email) {
      setFieldErrors((current) => {
        const next = { ...current };
        delete next.email;
        return next;
      });
    }
    // Clear server status when user edits
    if (state.status !== "idle" && state.status !== "field-error") {
      // We cannot reset server state directly; the next submission will replace it.
      // Clearing fieldErrors is sufficient for UX continuity.
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const errors: NewsletterFieldErrors = validateNewsletterSignup({ email });
    if (Object.keys(errors).length > 0) {
      event.preventDefault();
      setFieldErrors(errors);
    } else {
      setFieldErrors({});
    }
  }

  return (
    <form
      action={formAction}
      aria-label={newsletter.aria.formLabel}
      className="newsletter-form"
      noValidate
      onSubmit={handleSubmit}
    >
      <p className="newsletter-form__description">{newsletter.description}</p>
      <p className="newsletter-form__helper">{newsletter.helper}</p>

      <input name="locale" type="hidden" value={locale} />

      <div className="newsletter-form__field">
        <label htmlFor="newsletter-email">{newsletter.aria.emailLabel}</label>
        <input
          aria-describedby={fieldError ? "newsletter-email-error" : undefined}
          aria-invalid={fieldError ? true : undefined}
          autoComplete="email"
          id="newsletter-email"
          name="email"
          onChange={(event) => handleChange(event.target.value)}
          placeholder={newsletter.placeholder}
          required
          type="email"
          value={email}
        />
        {fieldError ? (
          <p className="newsletter-form__error" id="newsletter-email-error">
            {fieldError}
          </p>
        ) : null}
      </div>

      <SubmitButton newsletter={newsletter} />

      {statusMessage ? (
        <p
          aria-live="polite"
          className={statusClassName}
          role="status"
        >
          {statusMessage}
        </p>
      ) : null}
    </form>
  );
}
