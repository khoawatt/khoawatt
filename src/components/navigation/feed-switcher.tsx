"use client";

import { useEffect, useRef, useState } from "react";

import type { Locale } from "@/features/i18n/config";
import { getLocalizedPathname } from "@/features/i18n/routing";

interface FeedSwitcherProps {
  locale: Locale;
}

export function FeedSwitcher({ locale }: Readonly<FeedSwitcherProps>) {
  const [open, setOpen] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus({ preventScroll: true });
      }
    }

    function closeOutside(event: PointerEvent) {
      if (event.target instanceof Node && !switcherRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", closeOnEscape, true);
    document.addEventListener("pointerdown", closeOutside);

    return () => {
      document.removeEventListener("keydown", closeOnEscape, true);
      document.removeEventListener("pointerdown", closeOutside);
    };
  }, [open]);

  const rssHref = getLocalizedPathname("/feed.xml", locale);

  return (
    <div className="locale-switcher feed-switcher" ref={switcherRef}>
      <button
        aria-controls="feed-options"
        aria-expanded={open}
        aria-label="Feeds: RSS, Atom, JSONFeed"
        className="locale-switcher__trigger feed-switcher__trigger"
        onClick={() => setOpen((current) => !current)}
        ref={triggerRef}
        title="Feeds: RSS, Atom, JSONFeed"
        type="button"
      >
        <svg
          aria-hidden="true"
          fill="none"
          height="20"
          viewBox="0 0 24 24"
          width="20"
        >
          <path
            d="M5.5 14.5A4 4 0 0 1 9.5 18.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M5.5 10.5A8 8 0 0 1 13.5 18.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M5.5 6.5A12 12 0 0 1 17.5 18.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="5.5" cy="18.5" r="1.7" fill="currentColor" />
        </svg>
      </button>

      <nav
        aria-label="Feed options"
        className="locale-switcher__popover feed-switcher__popover"
        data-open={open ? "true" : "false"}
        id="feed-options"
      >
        <a href={rssHref} rel="alternate" type="application/rss+xml" onClick={() => setOpen(false)}>
          <span>RSS</span>
          <span className="feed-switcher__hint">.xml</span>
        </a>
        <a href="/feeds.atom" rel="alternate" type="application/atom+xml" onClick={() => setOpen(false)}>
          <span>Atom</span>
          <span className="feed-switcher__hint">.atom</span>
        </a>
        <a href="/feeds.json" rel="alternate" type="application/feed+json" onClick={() => setOpen(false)}>
          <span>JSONFeed</span>
          <span className="feed-switcher__hint">.json</span>
        </a>
      </nav>
    </div>
  );
}
