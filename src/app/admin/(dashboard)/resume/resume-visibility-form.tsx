"use client";

import { useState, useTransition } from "react";

import type { SettingsView } from "../settings/data";
import { setResumePublicity } from "../settings/actions";

interface ResumeVisibilityFormProps {
  initial: SettingsView;
}

export function ResumeVisibilityForm({ initial }: Readonly<ResumeVisibilityFormProps>) {
  const [view, setView] = useState(initial);
  const [confirmingVisible, setConfirmingVisible] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function apply(next: "private" | "visible") {
    setMessage(null);
    startTransition(async () => {
      const result = await setResumePublicity(next);
      if (result.ok && result.value) {
        setView((v) => ({
          ...v,
          publicity: result.value!,
          changedAt: new Date().toISOString(),
          changedBy: "you",
        }));
        setConfirmingVisible(false);
        setMessage(`Resume is now ${result.value}.`);
      } else {
        setMessage(result.error ?? "Something went wrong.");
      }
    });
  }

  const isVisible = view.publicity === "visible";

  return (
    <div className="admin-settings">
      <section className="admin-card">
        <h2>Resume visibility</h2>
        <p>
          Current state:{" "}
          <strong className={isVisible ? "is-visible" : "is-private"}>
            {isVisible ? "Visible" : "Private"}
          </strong>
        </p>
        <p className="admin-hint">
          Controls the public resume section and gated media at{" "}
          <code>/api/resume-media/*</code>. Private hides the section and blocks media.
        </p>

        {!isVisible ? (
          confirmingVisible ? (
            <div className="admin-confirm">
              <p>
                Make the resume public? Anyone can view your resume and its
                media.
              </p>
              <div className="admin-confirm__actions">
                <button
                  disabled={isPending}
                  onClick={() => apply("visible")}
                  type="button"
                >
                  Confirm: make visible
                </button>
                <button
                  disabled={isPending}
                  onClick={() => setConfirmingVisible(false)}
                  type="button"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              disabled={isPending}
              onClick={() => setConfirmingVisible(true)}
              type="button"
            >
              Make visible
            </button>
          )
        ) : (
          <button
            disabled={isPending}
            onClick={() => apply("private")}
            type="button"
          >
            Make private
          </button>
        )}

        {message ? (
          <p className="admin-message" role="status">
            {message}
          </p>
        ) : null}
      </section>

      <section className="admin-card">
        <h3>Last change</h3>
        <dl>
          <dt>Changed at</dt>
          <dd>{view.changedAt ? new Date(view.changedAt).toLocaleString() : "—"}</dd>
          <dt>Changed by</dt>
          <dd>{view.changedBy ?? "—"}</dd>
        </dl>
      </section>
    </div>
  );
}
