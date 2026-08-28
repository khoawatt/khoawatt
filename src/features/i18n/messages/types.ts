import type { NavigationItemId } from "@/features/navigation/config";

export interface LocaleSwitcherMessages {
  label: string;
  currentLanguage: string;
  english: string;
  vietnamese: string;
}

export interface HeaderMessages {
  primaryNavigation: string;
  homeAction: string;
  openMenu: string;
  closeMenu: string;
  github: string;
  sections: Record<NavigationItemId, string>;
}

export interface ThemeToggleMessages {
  toggle: string;
  switchToLight: string;
  switchToDark: string;
}

export interface BlogMessages {
  eyebrow: string;
  title: string;
  intro: string;
  emptyState: string;
  readMinutes: string;
  publishedLabel: string;
  updatedLabel: string;
  categoryLabel: string;
  tagsLabel: string;
  onThisPage: string;
  relatedPosts: string;
  breadcrumbLabel: string;
  backToBlog: string;
  homeLabel: string;
  paginationLabel: string;
  paginationPrev: string;
  paginationNext: string;
  pageNumberLabel: string;
  topicsLabel: string;
  topicsViewAll: string;
  categoryPostCount: string;
  readMoreLabel: string;
  backToTopLabel: string;
  filterLabel: string;
  allPostsLabel: string;
  tocExpandLabel: string;
  tocCollapseLabel: string;
  markdownTooltip: string;
  markdownCopyLabel: string;
  markdownViewLabel: string;
  markdownCopiedLabel: string;
  markdownCopyErrorLabel: string;
}

export interface PortfolioMessages {
  metadata: {
    title: string;
    description: string;
  };
  localeSwitcher: LocaleSwitcherMessages;
  header: HeaderMessages;
  themeToggle: ThemeToggleMessages;
  blog: BlogMessages;
  notFound: {
    eyebrow: string;
    title: string;
    description: string;
    homeAction: string;
  };
  foundation: {
    eyebrow: string;
    title: string;
    description: string;
    items: ReadonlyArray<{
      id: string;
      title: string;
      description: string;
    }>;
  };
}
