"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import type { Locale } from "@/features/i18n/config";
import type { BlogMessages } from "@/features/i18n/messages/types";
import { getLocalizedPathname } from "@/features/i18n/routing";

interface MarkdownCopyButtonProps {
  contentMd: string;
  locale: Locale;
  slug: string;
  messages: BlogMessages;
}

export function MarkdownCopyButton({
  contentMd,
  locale,
  slug,
  messages,
}: Readonly<MarkdownCopyButtonProps>) {
  const [copied, setCopied] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [error, setError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<number | null>(null);

  const mdHref = getLocalizedPathname(`/blog/${slug}.md`, locale);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setTooltipOpen(false);
      }
    }
    if (tooltipOpen) {
      document.addEventListener("pointerdown", onPointerDown);
      return () => document.removeEventListener("pointerdown", onPointerDown);
    }
  }, [tooltipOpen]);

  async function handleCopy() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(contentMd);
      } else {
        // Fallback for older browsers
        const ta = document.createElement("textarea");
        ta.value = contentMd;
        ta.setAttribute("readonly", "");
        ta.style.position = "absolute";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      setError(false);
      setTooltipOpen(false);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(true);
      setTooltipOpen(true);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => setError(false), 2000);
    }
  }

  return (
    <div
      className="markdown-action"
      ref={containerRef}
      onMouseEnter={() => setTooltipOpen(true)}
      onMouseLeave={() => setTooltipOpen(false)}
    >
      <button
        aria-label={messages.markdownTooltip}
        className="markdown-action__trigger"
        data-copied={copied ? "true" : "false"}
        onClick={handleCopy}
        onFocus={() => setTooltipOpen(true)}
        onBlur={() => setTooltipOpen(false)}
        type="button"
      >
        {/* Markdown icon: document with M */}
        <svg
          aria-hidden="true"
          fill="none"
          height="16"
          viewBox="0 0 24 24"
          width="16"
        >
          <path
            d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          <path
            d="M14 2v6h6"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          <path
            d="M8 13h2l1 2 1-2h2M8 17h6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="markdown-action__label">MD</span>
      </button>

      {/* Tooltip — visible on hover/focus, contains actions */}
      <div
        className="markdown-action__tooltip"
        data-open={tooltipOpen ? "true" : "false"}
        role="tooltip"
        id={`md-tooltip-${slug}`}
        hidden={!tooltipOpen && !copied && !error}
        aria-hidden={!tooltipOpen && !copied && !error ? "true" : undefined}
      >
        <p className="markdown-action__tooltip-title">{messages.markdownTooltip}</p>
        <div className="markdown-action__tooltip-actions">
          <button
            className="markdown-action__tooltip-btn"
            onClick={handleCopy}
            type="button"
          >
            {messages.markdownCopyLabel}
          </button>
          <span aria-hidden="true" className="markdown-action__dot">
            ·
          </span>
          <Link
            className="markdown-action__tooltip-link"
            href={mdHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setTooltipOpen(false)}
          >
            {messages.markdownViewLabel}
          </Link>
        </div>
      </div>

      {/* Toast */}
      <div
        aria-live="polite"
        className="markdown-action__toast"
        data-visible={copied || error ? "true" : "false"}
        role="status"
      >
        {copied ? messages.markdownCopiedLabel : error ? messages.markdownCopyErrorLabel : null}
      </div>
    </div>
  );
}
