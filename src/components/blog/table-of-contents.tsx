"use client";

import { useEffect, useState } from "react";

import type { TocEntry } from "@/features/blog/types";

interface TableOfContentsProps {
  label: string;
  toc: TocEntry[];
}

/**
 * Scroll-spy table of contents. Renders two variants sharing one active state:
 * a collapsed `<details>` (narrow screens, above the article) and a sticky
 * `<aside>` (wide screens, side rail). Only one is visible at a time, so only
 * one copy is focusable/announced.
 */
export function TableOfContents({ label, toc }: Readonly<TableOfContentsProps>) {
  const [activeId, setActiveId] = useState<string | null>(null);

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

  return (
    <>
      <details className="blog-toc blog-toc--narrow">
        <summary className="blog-toc__summary">{label}</summary>
        {list}
      </details>

      <aside aria-label={label} className="blog-toc blog-toc--wide">
        <p className="blog-toc__title">{label}</p>
        {list}
      </aside>
    </>
  );
}