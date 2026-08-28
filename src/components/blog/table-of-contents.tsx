"use client";

import { useEffect, useState } from "react";

import type { TocEntry } from "@/features/blog/types";

interface TableOfContentsProps {
  label: string;
  toc: TocEntry[];
  expandLabel?: string;
  collapseLabel?: string;
}

/**
 * Scroll-spy table of contents. Renders two variants sharing one active state:
 * a collapsed `<details>` (narrow screens, above the article) and a sticky
 * `<aside>` (wide screens, side rail with a back-to-top control). Only one is
 * visible at a time, so only one copy is focusable/announced.
 */
export function TableOfContents({
  label,
  toc,
  expandLabel,
  collapseLabel,
}: Readonly<TableOfContentsProps>) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [wideCollapsed, setWideCollapsed] = useState(false);

  useEffect(() => {
    if (toc.length === 0) return;

    const visible = new Map<string, Element>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visible.set(entry.target.id, entry.target);
          } else {
            visible.delete(entry.target.id);
          }
        }
        const firstVisible = toc.map((entry) => entry.id).find((id) => visible.has(id));
        if (firstVisible) setActiveId(firstVisible);
      },
      { rootMargin: "-88px 0px -66% 0px", threshold: 0 },
    );

    for (const entry of toc) {
      const element = document.getElementById(entry.id);
      if (element) observer.observe(element);
    }

    return () => observer.disconnect();
  }, [toc]);

  if (toc.length === 0) return null;

  const list = (
    <nav aria-label={label} className="blog-toc__nav">
      <ol className="blog-toc__list">
        {toc.map((entry) => (
          <li
            className="blog-toc__item"
            data-depth={entry.depth}
            key={entry.id}
          >
            <a
              aria-current={activeId === entry.id ? "location" : undefined}
              className="blog-toc__link"
              href={`#${entry.id}`}
            >
              {entry.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );

  const titleIcon = (
    <svg
      aria-hidden="true"
      className="blog-toc__title-icon"
      fill="none"
      height="16"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="16"
    >
      <path d="M3 6h13M3 12h13M3 18h9" />
    </svg>
  );

  // Wide toggle — replaces the previous "scroll to top" action.
  // The button now collapses/expands the sticky TOC list on desktop.
  const toggleLabel = wideCollapsed
    ? (expandLabel ?? `Show ${label}`)
    : (collapseLabel ?? `Hide ${label}`);
  const backToTop = (
    <button
      aria-controls="toc-list"
      aria-expanded={!wideCollapsed}
      aria-label={toggleLabel}
      className="blog-toc__top"
      data-collapsed={wideCollapsed ? "true" : "false"}
      onClick={() => setWideCollapsed((v) => !v)}
      title={toggleLabel}
      type="button"
    >
      <svg
        aria-hidden="true"
        fill="none"
        height="16"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
        width="16"
      >
        <path d="m18 15-6-6-6 6" />
      </svg>
    </button>
  );

  return (
    <>
      <details className="blog-toc blog-toc--narrow">
        <summary className="blog-toc__summary">
          {titleIcon}
          {label}
        </summary>
        {list}
      </details>

      <aside
        aria-label={label}
        className="blog-toc blog-toc--wide"
        data-collapsed={wideCollapsed ? "true" : "false"}
      >
        <div className="blog-toc__head">
          <p className="blog-toc__title">
            {titleIcon}
            {label}
          </p>
          {backToTop}
        </div>
        <div
          className="blog-toc__collapsible"
          data-collapsed={wideCollapsed ? "true" : "false"}
          hidden={wideCollapsed}
          id="toc-list"
        >
          {list}
        </div>
      </aside>
    </>
  );
}
