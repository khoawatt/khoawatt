"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import type { BlogCategoryNavEntry } from "@/features/blog/types";
import type { Locale } from "@/features/i18n/config";
import type { BlogMessages } from "@/features/i18n/messages/types";
import { getLocalizedPathname } from "@/features/i18n/routing";

interface BlogCategoryDropdownProps {
  entries: BlogCategoryNavEntry[];
  locale: Locale;
  activeSlug?: string | null;
  messages: BlogMessages;
}

export function BlogCategoryDropdown({
  entries,
  locale,
  activeSlug,
  messages,
}: Readonly<BlogCategoryDropdownProps>) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const labelId = useId();

  const activeEntry = activeSlug
    ? entries.find((e) => e.slug === activeSlug)
    : undefined;

  // Fallbacks for older message shapes
  const filterLabel = (messages as { filterLabel?: string }).filterLabel ?? messages.topicsLabel;
  const allLabel =
    (messages as { allPostsLabel?: string }).allPostsLabel ??
    (messages as { filterAllLabel?: string }).filterAllLabel ??
    messages.topicsViewAll ??
    "All posts";
  const countTemplate = messages.categoryPostCount;

  const triggerLabel = activeEntry ? activeEntry.name : allLabel;
  const triggerCount = activeEntry
    ? countTemplate.replace("{count}", String(activeEntry.postCount))
    : undefined;

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !containerRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus({ preventScroll: true });
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open]);

  // Close on route change via navigation is handled by Link click

  function handleTriggerKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpen(true);
      requestAnimationFrame(() => {
        menuRef.current?.querySelector<HTMLAnchorElement>("a")?.focus({ preventScroll: true });
      });
    }
  }

  function handleMenuKeyDown(event: React.KeyboardEvent) {
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLAnchorElement>("a") ?? [],
    );
    const currentIndex = items.indexOf(document.activeElement as HTMLAnchorElement);
    if (event.key === "ArrowDown") {
      event.preventDefault();
      const next = items[(currentIndex + 1) % items.length];
      next?.focus({ preventScroll: true });
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      const prev = items[(currentIndex - 1 + items.length) % items.length];
      prev?.focus({ preventScroll: true });
    } else if (event.key === "Home") {
      event.preventDefault();
      items[0]?.focus({ preventScroll: true });
    } else if (event.key === "End") {
      event.preventDefault();
      items[items.length - 1]?.focus({ preventScroll: true });
    }
  }

  // Do not render filter when there are no categories and no active selection
  // — still show "All" alone if activeSlug is present? But entries empty means no dropdown.
  if (entries.length === 0) return null;

  const blogHref = getLocalizedPathname("/blog", locale);

  return (
    <div className="blog-filter" ref={containerRef}>
      <span className="blog-filter__label" id={labelId}>
        {filterLabel}
      </span>
      <div className="blog-filter__control">
        <button
          aria-controls={menuId}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-labelledby={`${labelId} ${menuId}-trigger-label`}
          className="blog-filter__trigger"
          onClick={() => setOpen((v) => !v)}
          onKeyDown={handleTriggerKeyDown}
          ref={triggerRef}
          type="button"
        >
          <span className="blog-filter__trigger-text" id={`${menuId}-trigger-label`}>
            {triggerLabel}
          </span>
          {triggerCount ? <span className="blog-filter__count">{triggerCount}</span> : null}
          <svg
            aria-hidden="true"
            className="blog-filter__chevron"
            fill="none"
            height="16"
            viewBox="0 0 24 24"
            width="16"
          >
            <path
              d="m6 9 6 6 6-6"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
          </svg>
        </button>

        <ul
          aria-label={filterLabel}
          className="blog-filter__menu"
          data-open={open ? "true" : "false"}
          hidden={!open}
          id={menuId}
          onKeyDown={handleMenuKeyDown}
          ref={menuRef}
          role="menu"
        >
          <li role="none">
            <Link
              aria-current={!activeSlug ? "page" : undefined}
              className="blog-filter__item"
              data-active={!activeSlug ? "true" : undefined}
              href={blogHref}
              onClick={() => setOpen(false)}
              role="menuitem"
              tabIndex={open ? 0 : -1}
            >
              <span className="blog-filter__item-name">{allLabel}</span>
              {!activeSlug ? (
                <svg aria-hidden="true" fill="none" height="14" viewBox="0 0 24 24" width="14">
                  <path d="m5 13 4 4L19 7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
              ) : null}
            </Link>
          </li>
          {entries.map((entry) => {
            const isActive = entry.slug === activeSlug;
            return (
              <li key={entry.slug} role="none">
                <Link
                  aria-current={isActive ? "page" : undefined}
                  className="blog-filter__item"
                  data-active={isActive ? "true" : undefined}
                  href={getLocalizedPathname(`/blog/category/${entry.slug}`, locale)}
                  onClick={() => setOpen(false)}
                  role="menuitem"
                  tabIndex={open ? 0 : -1}
                >
                  <span className="blog-filter__item-name">{entry.name}</span>
                  <span className="blog-filter__item-count">
                    {countTemplate.replace("{count}", String(entry.postCount))}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
