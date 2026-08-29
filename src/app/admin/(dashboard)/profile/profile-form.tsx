"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { AdminProfileView } from "./data";
import {
  deleteProfile,
  updateProfile,
  type ProfileActionResult,
} from "./actions";

interface ProfileFormProps {
  initial: AdminProfileView;
}

export function ProfileForm({ initial }: ProfileFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDelete] = useTransition();
  const [localeTab, setLocaleTab] = useState<"en" | "vi">("en");

  function handleDelete() {
    if (
      !confirm(
        `Delete this profile? The public page will fall back to local content until you save a new profile.`,
      )
    ) {
      return;
    }

    startDelete(async () => {
      const result = await deleteProfile(initial.id);
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.error ?? "Failed to delete.");
      }
    });
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);

    const data = {
      name: String(fd.get("name") ?? ""),
      shortName: String(fd.get("shortName") ?? ""),
      githubUrl: String(fd.get("githubUrl") ?? ""),
      linkedinUrl: String(fd.get("linkedinUrl") ?? ""),
      resumeUrl: String(fd.get("resumeUrl") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      email: String(fd.get("email") ?? ""),
      roleEn: String(fd.get("roleEn") ?? ""),
      roleVi: String(fd.get("roleVi") ?? ""),
      introEn: String(fd.get("introEn") ?? ""),
      introVi: String(fd.get("introVi") ?? ""),
      locationEn: String(fd.get("locationEn") ?? ""),
      locationVi: String(fd.get("locationVi") ?? ""),
    };

    startTransition(async () => {
      const result: ProfileActionResult = await updateProfile(data);
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.fieldErrors ? Object.values(result.fieldErrors).join(" ") : (result.error ?? "Failed."));
      }
    });
  }

  return (
    <form className="admin-form" onSubmit={onSubmit}>
      <div className="blog-post-editor">
        <div className="blog-post-editor__side">
          <label className="admin-field">
            <span>Name</span>
            <input name="name" required defaultValue={initial.name} />
          </label>
          <label className="admin-field">
            <span>Short name</span>
            <input name="shortName" defaultValue={initial.shortName} />
          </label>
          <h3>Links</h3>
          <label className="admin-field">
            <span>GitHub URL</span>
            <input name="githubUrl" defaultValue={initial.githubUrl ?? ""} />
          </label>
          <label className="admin-field">
            <span>LinkedIn URL</span>
            <input name="linkedinUrl" defaultValue={initial.linkedinUrl ?? ""} />
          </label>
          <label className="admin-field">
            <span>Resume URL</span>
            <input name="resumeUrl" defaultValue={initial.resumeUrl ?? ""} />
          </label>
          <label className="admin-field">
            <span>Email</span>
            <input name="email" type="email" defaultValue={initial.email ?? ""} />
          </label>
          <label className="admin-field">
            <span>Phone</span>
            <input name="phone" defaultValue={initial.phone ?? ""} />
          </label>
        </div>

        <div className="blog-post-editor__main">
          <div className="admin-locale-tabs" role="tablist" aria-label="Profile language">
            <button
              aria-selected={localeTab === "en"}
              onClick={() => setLocaleTab("en")}
              role="tab"
              type="button"
            >
              English
            </button>
            <button
              aria-selected={localeTab === "vi"}
              onClick={() => setLocaleTab("vi")}
              role="tab"
              type="button"
            >
              Tiếng Việt
            </button>
          </div>

          <div role="tabpanel">
            <div hidden={localeTab !== "en"}>
              <label className="admin-field">
                <span>Role (EN)</span>
                <input name="roleEn" defaultValue={initial.roleEn} />
              </label>
              <label className="admin-field">
                <span>Intro (EN)</span>
                <textarea name="introEn" rows={4} defaultValue={initial.introEn} />
              </label>
              <label className="admin-field">
                <span>Location (EN)</span>
                <input name="locationEn" defaultValue={initial.locationEn ?? ""} />
              </label>
            </div>
            <div hidden={localeTab !== "vi"}>
              <label className="admin-field">
                <span>Role (VI)</span>
                <input name="roleVi" defaultValue={initial.roleVi} />
              </label>
              <label className="admin-field">
                <span>Intro (VI)</span>
                <textarea name="introVi" rows={4} defaultValue={initial.introVi} />
              </label>
              <label className="admin-field">
                <span>Location (VI)</span>
                <input name="locationVi" defaultValue={initial.locationVi ?? ""} />
              </label>
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <p className="admin-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="admin-form-actions">
        <button disabled={isPending} type="submit">
          {isPending ? "Saving…" : "Save profile"}
        </button>
        <button className="admin-button-secondary" disabled={isPending} type="reset">
          Cancel changes
        </button>
        {initial.id ? (
          <button
            className="admin-link-button admin-link-button--danger"
            disabled={isDeleting}
            onClick={handleDelete}
            type="button"
          >
            {isDeleting ? "Deleting…" : "Delete profile"}
          </button>
        ) : null}
      </div>
    </form>
  );
}
