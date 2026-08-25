"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

function SettingsIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
      <path
        d="M4 7h16M4 12h16M4 17h16"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function SkillsIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
      <path
        d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-2.4 2.6-2.6Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function SocialIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
      <path
        d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1.5-1.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ProjectsIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
      <rect height="14" stroke="currentColor" strokeWidth="1.8" width="16" x="4" y="5" rx="2" />
      <path d="M4 10h16M9 5v14" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function ResumeIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
      <path
        d="M7 3h7l4 4v14H7V3Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path d="M14 3v4h4M10 12h5M10 15h5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function MediaIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
      <rect height="14" stroke="currentColor" strokeWidth="1.8" width="18" x="3" y="5" rx="2" />
      <circle cx="9" cy="10" r="1.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="m21 15-4-4-5 5-3-3-6 6" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function BlogIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
      <path
        d="M4 5h16M4 12h16M4 19h10"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

const navLinks: Array<{ href: string; label: string; icon: () => ReactNode }> = [
  { href: "/admin/settings", label: "Settings", icon: SettingsIcon },
  { href: "/admin/profile", label: "Profile", icon: ProfileIcon },
  { href: "/admin/skills", label: "Skills", icon: SkillsIcon },
  { href: "/admin/social", label: "Social", icon: SocialIcon },
  { href: "/admin/projects", label: "Projects", icon: ProjectsIcon },
  { href: "/admin/resume", label: "Resume", icon: ResumeIcon },
  { href: "/admin/media", label: "Media", icon: MediaIcon },
];

const blogLinks: Array<{ href: string; label: string; icon: () => ReactNode }> = [
  { href: "/admin/blog", label: "Posts", icon: BlogIcon },
  { href: "/admin/blog/categories", label: "Categories", icon: BlogIcon },
];

function matchesHref(pathname: string, href: string): boolean {
  if (href === "/admin/settings") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Longest matching href wins, so `/admin/blog/categories` marks only the
 *  Categories link active, never the sibling Posts link. */
function activeHref(
  pathname: string,
  links: ReadonlyArray<{ href: string }>,
): string | null {
  const matched = links.filter((link) => matchesHref(pathname, link.href));
  if (matched.length === 0) return null;
  return matched.reduce(
    (longest, link) => (link.href.length > longest.href.length ? link : longest),
    matched[0],
  ).href;
}

function SidebarLinks({
  links,
  pathname,
}: {
  links: Array<{ href: string; label: string; icon: () => ReactNode }>;
  pathname: string;
}) {
  const current = activeHref(pathname, links);
  return links.map((link) => {
    const Icon = link.icon;
    return (
      <Link
        aria-current={link.href === current ? "page" : undefined}
        className="admin-sidebar__link"
        href={link.href}
        key={link.href}
      >
        <span className="admin-sidebar__icon">
          <Icon />
        </span>
        {link.label}
      </Link>
    );
  });
}

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="admin-sidebar" aria-label="Admin navigation">
      <div className="admin-brand">
        <span className="admin-brand__mark">Q</span>
        <span className="admin-brand__name">Khoa Watt</span>
      </div>
      <nav className="admin-sidebar__nav">
        <SidebarLinks links={navLinks} pathname={pathname} />
        <p className="admin-sidebar__group-label">Blog</p>
        <SidebarLinks links={blogLinks} pathname={pathname} />
      </nav>
    </aside>
  );
}
