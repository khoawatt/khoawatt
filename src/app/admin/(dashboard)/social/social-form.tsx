"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type { AdminSocialLink } from "./data";
import { createSocialLink, updateSocialLink, type SocialActionResult } from "./actions";

interface SocialLinkFormProps {
  existing?: AdminSocialLink;
}

export function SocialLinkForm({ existing }: SocialLinkFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);

    const data = {
      id: existing?.id ?? String(fd.get("id") ?? ""),
      label: String(fd.get("label") ?? ""),
      url: String(fd.get("url") ?? ""),
      iconKey: String(fd.get("iconKey") ?? "") || undefined,
      order: Number(fd.get("order") ?? 0),
    };

    startTransition(async () => {
      const result: SocialActionResult = existing
        ? await updateSocialLink(data)
        : await createSocialLink(data);
      if (result.ok) {
        router.push("/admin/social");
        router.refresh();
      } else {
        setError(result.fieldErrors ? Object.values(result.fieldErrors).join(" ") : (result.error ?? "Failed."));
      }
    });
  }

  return (
    <form className="admin-form" onSubmit={onSubmit}>
      {!existing ? (
        <label className="admin-field">
          <span>ID (slug, optional)</span>
          <input name="id" defaultValue="" />
        </label>
      ) : null}

      <label className="admin-field">
        <span>Label</span>
        <input name="label" required defaultValue={existing?.label ?? ""} />
      </label>
      <label className="admin-field">
        <span>URL (http/https)</span>
        <input name="url" required defaultValue={existing?.url ?? ""} />
      </label>
      <label className="admin-field">
        <span>Icon key</span>
        <input name="iconKey" defaultValue={existing?.iconKey ?? ""} />
      </label>
      <label className="admin-field">
        <span>Order</span>
        <input name="order" type="number" defaultValue={existing?.order ?? 0} />
      </label>

      {error ? (
        <p className="admin-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="admin-form-actions">
        <button disabled={isPending} type="submit">
          {isPending ? "Saving…" : existing ? "Update link" : "Create link"}
        </button>
        <Link href="/admin/social">Cancel</Link>
      </div>
    </form>
  );
}
