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
          height="19"
          viewBox="0 0 24 24"
          width="19"
        >
          <path
            d="M4 11a9 9 0 0 1 9 9"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M4 15.5a4.5 4.5 0 0 1 4.5 4.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <circle cx="4.5" cy="19.5" r="1.5" fill="currentColor" />
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
