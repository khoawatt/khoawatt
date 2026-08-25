# 03 — Content & Data Model

## Principle

UI components consume normalized typed models. MVP data may live in TypeScript/JSON/MDX, but its shape should be compatible with a future database/CMS.

## Locale model

Initial locales:

- `en`
- `vi`

Translatable text should be stored separately from stable identifiers/URLs/media references.

## Profile

```ts
export interface Profile {
  name: string;
  shortName: string;
  role: LocalizedText;
  intro: LocalizedText;
  location?: LocalizedText;
  email?: string;
  phone?: string;
  githubUrl: string;
  linkedInUrl?: string;
  resumeUrl?: string;
}
```

## Localized text

```ts
export type Locale = 'en' | 'vi';

export type LocalizedText = Record<Locale, string>;
```

For larger rich text blocks, use locale-keyed content objects or MDX rather than forcing everything into a single string.

## Skills

```ts
export type SkillGroup = 'tech-stack' | 'others';

export interface Skill {
  id: string;
  name: string;
  group: SkillGroup;
  category?: string;
  iconKey?: string;
  url?: string;
  order: number;
  featured?: boolean;
}
```

Do not infer proficiency percentages unless Khoa explicitly wants them.

## Projects

```ts
export interface Project {
  id: string;
  slug: string;
  title: LocalizedText;
  category: LocalizedText;
  summary: LocalizedText;
  description?: LocalizedText;
  techStack: string[];
  media: ProjectMedia[];
  liveDemoUrl?: string;
  codeUrl?: string;
  featured: boolean;
  order: number;
  status?: 'active' | 'archived' | 'private';
}

export interface ProjectMedia {
  id: string;
  src: string;
  alt: LocalizedText;
  kind: 'image';
  width?: number;
  height?: number;
  order: number;
}
```

UI rules:

- show Live Demo only when `liveDemoUrl` exists
- show Code only when `codeUrl` exists
- do not create fake links (`#`) for missing destinations

## Resume categories

```ts
export type ResumeCategory =
  | 'career-journey'
  | 'education-certifications';
```

The type may later become a CMS-managed stable slug.

## Resume entry

```ts
export interface ResumeEntry {
  id: string;
  category: string;
  title: LocalizedText;
  organization: LocalizedText;
  location?: LocalizedText;
  startDate?: string;
  endDate?: string;
  dateLabel?: LocalizedText;
  summary?: LocalizedText;
  highlights?: Record<Locale, string[]>;
  tags?: string[];
  media?: ResumeMedia[];
  order: number;
}

export interface ResumeMedia {
  id: string;
  thumbnailSrc: string;
  fullSrc: string;
  alt: LocalizedText;
  caption?: LocalizedText;
  width?: number;
  height?: number;
}
```

## Contact form

```ts
export interface ContactSubmission {
  name: string;
  email: string;
  subject: string;
  message: string;
  locale: Locale;
  honeypot?: string;
}
```

Server adds metadata if needed:

- timestamp
- request fingerprint/rate-limit key
- delivery result

Avoid storing unnecessary personal data.

## Social links

```ts
export interface SocialLink {
  id: string;
  label: string;
  url: string;
  iconKey: string;
  order: number;
}
```

## Newsletter

MVP model:

```ts
export interface NewsletterSignup {
  email: string;
  locale: Locale;
}
```

If persistence is deferred, keep the UI disabled/marked appropriately rather than simulating a successful subscription.

## Blog

Blog entities live in Supabase (`blog_*` tables) following the CMS conventions — stable text ids, `_translations` child tables keyed `(entity_id, locale)`, and a publish gate inside the atomic mutation RPC that requires complete `en` + `vi` translations before a post can go live.

```ts
export interface BlogCategory {
  slug: string;
  name: LocalizedText;
}

export interface BlogTag {
  slug: string;
  name: LocalizedText;
}

export interface BlogPost {
  slug: string;                 // one stable slug shared by both locales
  title: LocalizedText;
  summary: LocalizedText;
  contentMd: LocalizedText;     // Markdown source, rendered by the shared pipeline
  category: BlogCategory;
  tags: BlogTag[];
  coverImage?: ManagedImage;    // bucket path in the public 'blog-media' bucket
  publishedAt?: string;         // ISO, stamped once on first publish
  updatedAt?: string;
  readingTimeMinutes: number;   // computed at render, never stored
}

export type ManagedImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
};
```

Rules:

- A post is publicly visible only when `status='published'`; the repository adapter enforces the published-only filter (fail-closed, like resume publicity).
- `published_at` is stamped on the first successful publish and preserved on later edits (including unpublish/republish).
- Missing translations resolve to `notFound()`, never a partial render.

## Future CMS mapping

Recommended entities:

- `profile`
- `profile_translations`
- `skills`
- `projects`
- `project_translations`
- `project_media`
- `resume_categories`
- `resume_category_translations`
- `resume_entries`
- `resume_entry_translations`
- `resume_media`
- `social_links`
- `blog_categories` (+ `blog_category_translations`)
- `blog_tags` (+ `blog_tag_translations`)
- `blog_posts` (+ `blog_post_translations`, `blog_post_tags`)

Stable IDs and translation tables make locale additions possible without duplicating entire documents.
