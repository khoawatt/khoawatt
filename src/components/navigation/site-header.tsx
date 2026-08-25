"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { type MouseEvent, useEffect, useRef, useState } from "react";

import type { Locale } from "@/features/i18n/config";
import { LocaleSwitcher } from "@/features/i18n/locale-switcher";
import type {
  HeaderMessages,
  LocaleSwitcherMessages,
  ThemeToggleMessages,
} from "@/features/i18n/messages/types";
import {
  blogNavigationPath,
  navigationSectionIds,
  primaryNavigationIds,
  type NavigationItemId,
  type NavigationSectionId,
} from "@/features/navigation/config";
import { getLocalizedPathname } from "@/features/i18n/routing";
import { ThemeToggle } from "@/features/theme/theme-toggle";

interface SiteHeaderProps {
  githubUrl: string;
  locale: Locale;
  localeSwitcherMessages: LocaleSwitcherMessages;
  messages: HeaderMessages;
  themeToggleMessages: ThemeToggleMessages;
}

const menuFocusLocaleStorageKey = "qvak.menu-focus-locale";

export function SiteHeader({
  githubUrl,
  locale,
  localeSwitcherMessages,
  messages,
  themeToggleMessages,
}: Readonly<SiteHeaderProps>) {
  const [activeSection, setActiveSection] =
    useState<NavigationItemId>("home");
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const navigationRef = useRef<HTMLDivElement>(null);
  const restoreMenuFocusAfterLocaleRef = useRef(false);
  const homePath = getLocalizedPathname("/", locale);
  const blogPath = getLocalizedPathname(blogNavigationPath, locale);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    function updateActiveSection() {
      // Blog is a multi-route page link, not an anchor section: it is active on
      // every blog route, independent of scroll position.
      const blogPrefix = `${blogPath}/`;
      if (window.location.pathname === blogPath || window.location.pathname.startsWith(blogPrefix)) {
        setActiveSection("blog");
        return;
      }

      const headerBottom = headerRef.current?.getBoundingClientRect().bottom ?? 0;
      const marker = Math.max(headerBottom + 48, window.innerHeight * 0.45);
      let currentSection: NavigationSectionId = "home";

      for (const sectionId of navigationSectionIds.slice(1)) {
        const section = document.getElementById(sectionId);

        if (section && section.getBoundingClientRect().top <= marker) {
          currentSection = sectionId;
        }
      }

      setActiveSection(currentSection);
    }

    updateActiveSection();
    window.addEventListener("resize", updateActiveSection);
    window.addEventListener("scroll", updateActiveSection, { passive: true });

    return () => {
      window.removeEventListener("resize", updateActiveSection);
      window.removeEventListener("scroll", updateActiveSection);
    };
  }, [blogPath]);

  useEffect(() => {
    function updateScrolled() {
      setScrolled(window.scrollY > 16);
    }

    updateScrolled();
    window.addEventListener("scroll", updateScrolled, { passive: true });

    return () => window.removeEventListener("scroll", updateScrolled);
  }, []);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const firstLink = navigationRef.current?.querySelector<HTMLAnchorElement>(
      ".site-navigation__link",
    );
    firstLink?.focus({ preventScroll: true });

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButtonRef.current?.focus({ preventScroll: true });
      }
    }

    window.addEventListener("keydown", closeOnEscape);

    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 72rem)");

    function closeAtDesktop(event: MediaQueryListEvent) {
      if (event.matches) {
        setMenuOpen(false);
      }
    }

    desktopQuery.addEventListener("change", closeAtDesktop);

    return () => desktopQuery.removeEventListener("change", closeAtDesktop);
  }, []);

  useEffect(() => {
    const hashSection = navigationSectionIds
      .slice(1)
      .find((sectionId) => window.location.hash === `#${sectionId}`);

    if (!hashSection) {
      return;
    }

    const frame = window.requestAnimationFrame(() =>
      document.getElementById(hashSection)?.scrollIntoView(),
    );

    return () => window.cancelAnimationFrame(frame);
  }, [locale, pathname]);

  useEffect(() => {
    if (menuOpen) {
      return;
    }

    let pendingLocale: string | null = null;

    try {
      pendingLocale = window.sessionStorage.getItem(menuFocusLocaleStorageKey);
    } catch {
      // The instance-local ref still restores focus when storage is unavailable.
    }

    if (
      !restoreMenuFocusAfterLocaleRef.current &&
      pendingLocale !== locale
    ) {
      return;
    }

    if (pendingLocale !== null && pendingLocale !== locale) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      restoreMenuFocusAfterLocaleRef.current = false;

      try {
        if (
          window.sessionStorage.getItem(menuFocusLocaleStorageKey) === locale
        ) {
          window.sessionStorage.removeItem(menuFocusLocaleStorageKey);
        }
      } catch {
        // Focus restoration does not depend on storage cleanup succeeding.
      }

      menuButtonRef.current?.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [locale, menuOpen]);

  function closeAfterNavigation() {
    if (menuOpen) {
      setMenuOpen(false);
      window.requestAnimationFrame(() =>
        menuButtonRef.current?.focus({ preventScroll: true }),
      );
    }
  }

  function closeAfterLocaleNavigation(targetLocale: Locale) {
    if (menuOpen) {
      restoreMenuFocusAfterLocaleRef.current = true;

      if (targetLocale !== locale) {
        try {
          window.sessionStorage.setItem(
            menuFocusLocaleStorageKey,
            targetLocale,
          );
        } catch {
          // Synchronous focus remains available when storage is blocked.
        }
      }

      setMenuOpen(false);
      menuButtonRef.current?.focus({ preventScroll: true });
    }
  }

  function navigateToSection(
    event: MouseEvent<HTMLAnchorElement>,
    sectionId: NavigationSectionId,
  ) {
    event.preventDefault();
    closeAfterNavigation();

    // Section anchors only exist on the home page. From any other route
    // (e.g. /blog) a real navigation to `homePath#section` is required —
    // pushState alone would rewrite the URL without loading the section.
    if (!document.getElementById(sectionId)) {
      setActiveSection(sectionId);
      router.push(`${homePath}#${sectionId}`);
      return;
    }

    const hash = `#${sectionId}`;

    if (window.location.hash !== hash) {
      window.history.pushState(null, "", hash);
    }

    setActiveSection(sectionId);
    window.requestAnimationFrame(() =>
      document.getElementById(sectionId)?.scrollIntoView(),
    );
  }

  function navigateHome(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    closeAfterNavigation();

    if (pathname !== homePath) {
      setActiveSection("home");
      router.push(`${homePath}${window.location.search}`);
      return;
    }

    const homeUrl = `${homePath}${window.location.search}`;

    if (
      `${window.location.pathname}${window.location.search}${window.location.hash}` !==
      homeUrl
    ) {
      window.history.pushState(null, "", homeUrl);
    }

    setActiveSection("home");
    window.requestAnimationFrame(() => {
      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      window.scrollTo({
        behavior: reduceMotion ? "auto" : "smooth",
        top: 0,
      });
    });
  }

  return (
    <header
      className="site-header"
      data-scrolled={scrolled ? "true" : "false"}
      ref={headerRef}
    >
      <div className="container-shell" data-size="wide">
        <div className="site-header__surface">
          <a
            aria-label={messages.homeAction}
            className="site-header__logo"
            href={homePath}
            onClick={navigateHome}
          >
            <Image
              alt=""
              className="site-header__logo-image"
              height={727}
              priority
              src="/images/brand/qvak-logo.png"
              width={906}
            />
          </a>

          <button
            aria-controls="portfolio-navigation"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? messages.closeMenu : messages.openMenu}
            className="site-header__menu-button"
            data-open={menuOpen ? "true" : "false"}
            onClick={() => setMenuOpen((current) => !current)}
            ref={menuButtonRef}
            type="button"
          >
            <svg
              aria-hidden="true"
              className="site-header__menu-icon site-header__menu-icon--open"
              fill="none"
              height="20"
              viewBox="0 0 24 24"
              width="20"
            >
              <path
                d="M4 7h16M4 12h16M4 17h16"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="2"
              />
            </svg>
            <svg
              aria-hidden="true"
              className="site-header__menu-icon site-header__menu-icon--close"
              fill="none"
              height="20"
              viewBox="0 0 24 24"
              width="20"
            >
              <path
                d="m6 6 12 12M18 6 6 18"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="2"
              />
            </svg>
          </button>

          <div
            className="site-header__navigation"
            data-open={menuOpen ? "true" : "false"}
            id="portfolio-navigation"
            ref={navigationRef}
          >
            <nav aria-label={messages.primaryNavigation}>
              <ul className="site-navigation__list">
                {primaryNavigationIds.map((itemId) => {
                  const isBlog = itemId === "blog";
                  const href =
                    isBlog
                      ? blogPath
                      : itemId === "home"
                        ? homePath
                        : `#${itemId}`;

                  return (
                    <li key={itemId}>
                      <a
                        aria-current={
                          activeSection === itemId ? "location" : undefined
                        }
                        className="site-navigation__link"
                        href={href}
                        onClick={
                          isBlog
                            ? undefined
                            : (event) =>
                                itemId === "home"
                                  ? navigateHome(event)
                                  : navigateToSection(event, itemId)
                        }
                      >
                        {messages.sections[itemId]}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <div className="site-header__actions">
              <a
                aria-label={messages.github}
                className="site-header__icon-action"
                href={githubUrl}
                rel="noopener noreferrer"
                target="_blank"
                title={messages.github}
              >
                <svg
                  aria-hidden="true"
                  fill="currentColor"
                  height="19"
                  viewBox="0 0 24 24"
                  width="19"
                >
                  <path d="M12 .7a11.5 11.5 0 0 0-3.64 22.41c.58.11.79-.25.79-.56v-2.23c-3.22.7-3.9-1.37-3.9-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.71.08-.71 1.17.08 1.78 1.2 1.78 1.2 1.04 1.78 2.72 1.27 3.38.97.1-.75.4-1.27.74-1.56-2.57-.29-5.27-1.28-5.27-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.47.11-3.05 0 0 .97-.31 3.16 1.18a10.9 10.9 0 0 1 5.75 0c2.19-1.49 3.15-1.18 3.15-1.18.64 1.58.24 2.76.12 3.05.74.81 1.19 1.83 1.19 3.09 0 4.42-2.71 5.39-5.29 5.68.42.36.79 1.06.79 2.14v3.17c0 .31.21.68.8.56A11.5 11.5 0 0 0 12 .7Z" />
                </svg>
              </a>
              <LocaleSwitcher
                locale={locale}
                messages={localeSwitcherMessages}
                onNavigate={closeAfterLocaleNavigation}
              />
              <ThemeToggle messages={themeToggleMessages} />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
