export const navigationSectionIds = [
  "home",
  "about",
  "skills",
  "projects",
  "resume",
  "contact",
] as const;

export type NavigationSectionId = (typeof navigationSectionIds)[number];

/** Blog is the first multi-route area; it is a page link, not an anchor. */
export type NavigationItemId = NavigationSectionId | "blog";

/** Header/footer order: Blog sits between Resume and Contact (spec §8.1). */
export const primaryNavigationIds: readonly NavigationItemId[] = [
  "home",
  "about",
  "skills",
  "projects",
  "resume",
  "blog",
  "contact",
];

export const blogNavigationPath = "/blog";