# Blog Design — qvak-portfolio

Date: 2026-08-25
Status: Draft for review
Owner decision record: Supabase CMS-backed · fully bilingual publishing · category + tags · Markdown editor · ISR + tag revalidation · Blog added to header/footer navigation (approved 2026-08-25)

## 1. Purpose & goals

Add a blog subsystem to the portfolio at `khoawatt.com` with SEO as the primary driver:

- publish knowledge-sharing, technical deep-dives, and reviews under the owner's brand
- build topical authority through category clusters and structured data
- runtime publishing through the existing Supabase CMS admin (no deploy to publish)
- every published post exists in **both** `en` and `vi` before going live
- visual language strictly follows the existing portfolio design system (`docs/02-ui-ux-spec.md`)

### Relationship to canonical documents

The product brief (`docs/00-product-brief.md`) lists a full blog rebuild as an MVP non-goal and future scope. This specification supersedes that exclusion for the blog feature by explicit owner request (2026-08-25). It also extends primary navigation with a Blog entry, approved by the owner on the same date. Canonical documents `docs/02-ui-ux-spec.md` and `docs/03-content-data-model.md` gain a Blog section/entity set as part of the implementation slices defined below — this spec is the source until those land.

## 2. Resolved decisions

| Topic | Decision |
|---|---|
| Content storage | Supabase CMS (extends Phase 6 pattern), admin Markdown editor |
| Language | Fully bilingual — publish gate requires complete `en` + `vi` translations |
| Taxonomy | CMS-managed categories (topic clusters, own archive pages) + free tags on posts |
| Tags v1 | Non-interactive chips on cards/article; drive related-posts matching; no tag archive pages |
| Editor | Plain-Markdown textarea + server-rendered Preview (same pipeline as public site) |
| Rendering/caching | ISR with data-cache tag `blog`; admin Server Actions call `updateTag("blog")` at one choke point (read-your-writes, no stale window); freshness contract below |
| Slug strategy | One stable slug per post shared by both locales (`/blog/{slug}`, `/vi/blog/{slug}`); changing a published post's slug is a URL change requiring a redirect entry (see §6) |
| Published-post edits | Mutations that would remove/empty a required translation of a published post are rejected by the RPC (owner unpublishes explicitly first) |
| Reading time | Computed at render from `content_md` via the deterministic algorithm in §5; never stored |

## 3. Data model (Supabase)

Follows the established conventions: stable UUID ids + stable slug identifiers, `_translations` child tables keyed `(entity_id, locale)` with `locale ∈ ('en','vi')`, RLS separating anon reads from owner writes, atomic-mutation RPCs, local-first migration workflow.

```text
blog_categories              id (uuid pk), slug (unique), sort_order int, created_at
blog_category_translations   category_id → blog_categories (cascade),
                             locale, name (not null),
                             pk (category_id, locale)

blog_tags                    id (uuid pk), slug (unique), created_at
blog_tag_translations        tag_id → blog_tags (cascade),
                             locale, name (not null),
                             pk (tag_id, locale)

blog_posts                   id (uuid pk), slug (unique),
                             category_id → blog_categories (restrict),
                             cover_bucket_path text null
                               (object path inside a new public 'blog-media'
                                Storage bucket; covers follow the existing
                                bucket + path convention used by project/
                                resume media rather than a shared media table),
                             status ('draft' | 'published') default 'draft',
                             published_at timestamptz null,
                             created_at, updated_at

blog_post_translations       post_id → blog_posts (cascade),
                             locale, title (not null), summary (not null),
                             content_md (not null, Markdown source),
                             pk (post_id, locale)

blog_post_tags               post_id → blog_posts (cascade),
                             tag_id → blog_tags (cascade),
                             pk (post_id, tag_id)
```

Rules:

- Constraints (enforced in the migration, not only application code): every `_translations` table has `CHECK (locale IN ('en','vi'))`; `title`, `summary`, `name` carry non-empty `CHECK`s; post/category/tag slugs are normalized (`^[a-z0-9]+(-[a-z0-9]+)*$`) and unique; `blog_post_tags` has composite PK `(post_id, tag_id)`; supporting indexes for the high-frequency repository queries — posts by `(status, published_at DESC)`, posts by `category_id`, translations by their PKs.
- Category deletion is blocked while referenced by posts; tag deletion is likewise blocked while referenced (owner-operated CMS favors explicit blocking over silent association cleanup, for auditability).
- RLS: anonymous/service read path exposes only `status='published'` rows (and their children); writes require the authenticated single-owner session — same fail-closed philosophy as resume publicity.
- Publish gate lives inside an atomic RPC: setting `status='published'` fails unless both `en` and `vi` translations exist with non-empty `title`, `summary`, `content_md`, and a valid category. First successful publish stamps `published_at`; subsequent edits never alter it.
- Update invariants enforced by the same RPC (never application-layer only): status transitions are validated atomically (`draft→published` gated as above; `published→draft` always allowed); a mutation that would delete or empty any required translation of an already-published post is **rejected** with a field-level error — the owner must explicitly unpublish first; category/tag references are validated in the same transaction.
- All post mutations (create/update with translations + tag links, delete) go through atomic RPCs in one transaction, mirroring the existing `cms_atomic_mutations` pattern.
- Seed (local-first then promoted): 3 starter categories — Knowledge, Techniques, Reviews — plus demo tag set, applied via `supabase db query --local -f scripts/<file>.sql` before any `--linked` promotion.

## 4. Feature layer (`src/features/blog/`)

Public UI consumes view models only — never raw Supabase rows (Phase 6 rule).

Types (`types.ts`):

```ts
type PostListItem = {
  slug: string;
  title: string;
  summary: string;
  category: { slug: string; name: string };
  coverImage?: ManagedImage;      // src+alt from bucket path; rendered inside
                                  // a fixed-ratio frame so no layout shift
  publishedAt: string;            // ISO
  updatedAt?: string;
  readingTimeMinutes: number;
};

type TocEntry = { id: string; text: string; depth: 2 | 3 };

type PostDetail = PostListItem & {
  tags: { slug: string; name: string }[];
  toc: TocEntry[];
  html: string;                   // rendered once server-side by the pipeline
  relatedPosts: PostListItem[];   // ≤ 3
};
```

Repository adapter (`repository.ts`) maps rows → view models behind functions such as `getPublishedPosts(locale, page)`, `getPostBySlug(locale, slug)`, `getCategoryPage(locale, slug, page)`, `getRelatedPosts(...)`. **Single cache choke point:** every blog read — listing, detail, category, related posts, and the data feeding sitemap/RSS/OG generation — goes through repository functions wrapped in the Next data cache tagged `blog`, so one invalidation from any admin mutation refreshes all of them together.

**Invalidation primitive (Next.js 16):** admin mutations are Server Actions, so they call `updateTag("blog")` — the Next 16 read-your-writes primitive that immediately expires the tag's cached data; the **next** request for any blog page/sitemap/feed blocks on a fresh render and serves new data, with no stale window. This is exactly the documented freshness contract. `revalidateTag` is deliberately **not** used for this path: its recommended two-argument form (`revalidateTag("blog", "max")`) is stale-while-revalidate (first post-mutation visitor gets stale content while fresh data loads in the background), and the single-argument form that matches `updateTag` is deprecated in Next 16. If any future mutation path runs outside a Server Action (e.g. a Route Handler/webhook), use `revalidateTag("blog", { expire: 0 })` there to preserve immediate expiration. The ISR time-based revalidation window exists only as a safety net for missed invalidations.

Missing translation, unpublished post, or repository read failure on a public route resolves to `notFound()` / cached-stale behavior — never a partial render (fail closed, matching resume publicity).

## 5. Markdown pipeline

One server-side remark/rehype pipeline, shared verbatim by public pages and admin Preview:

- GFM (tables, task lists, strikethrough, autolinks)
- heading slugs (`rehype-slug` equivalent) restricted to h2/h3 for TOC extraction
- syntax highlighting for fenced code blocks with a palette defined per theme (light and dark designed deliberately, not inverted)
- **raw HTML passthrough disabled** — XSS-safe by construction; authoring stays pure Markdown
- output: sanitized HTML string + `{ toc, headingCount }` metadata

Reading time — deterministic algorithm (tests and implementation must agree exactly): strip fenced code blocks from the source first; count words in the remaining prose as maximal whitespace-separated runs after removing Markdown punctuation markers (`#`, `*`, `_`, `>`, `-`, table pipes); each removed code block contributes a fixed 60 "words"; total = `(proseWords + 60 × codeBlocks) / 200`, rounded up, minimum 1. Whitespace-splitting handles Vietnamese correctly (spaces delimit syllable groups).

## 6. Public routes & caching

Locale prefix follows existing routing: `en` at root, `vi` under `/vi`. All routes are server components under `[locale]`.

| Route | Content |
|---|---|
| `/blog` | Page 1 of the listing |
| `/blog/page/[n]` | Listing pages n ≥ 2 |
| `/blog/[slug]` | Article detail |
| `/blog/category/[slug]` | Category archive (same card grid, category header) |

- Listing pagination uses real links (crawler-followable); no infinite scroll.
- Canonical/redirect policy for listing URLs: `/blog` self-canonical; `/blog/page/1` permanently redirects to `/blog` (never a duplicate); `/blog/page/[n]` for n ≥ 2 self-canonical; out-of-range pages → `notFound()` (soft-404 prevention). Same rules apply under `/vi`.
- Detail includes breadcrumb, article header, cover, prose body, TOC, related posts.
- Draft/incomplete post access → `notFound()`.
- Slug changes on published posts are URL migrations: the admin editor requires recording the old→new mapping as an entry in the existing SEO redirect map (`src/features/seo/redirects.ts`, 301) before saving; unpublished posts may rename freely. Pagination URLs are ordering-dependent by nature and receive no per-post redirects — canonical tags above keep them non-duplicative.

## 7. SEO infrastructure

Mandatory baseline (already committed):

- `generateMetadata` per route: translated title/description, self-referencing canonical per locale, hreflang pair `en`↔`vi` + `x-default → en`.
- OG/Twitter: `og:type=article`, `article:published_time`, `article:modified_time`, `article:tag`, `summary_large_image` card.
- JSON-LD injected server-side: `BlogPosting` (headline, dates, author `Person` = Khoa, publisher, cover/OG image, `mainEntityOfPage`, `inLanguage`) + `BreadcrumbList` on detail; `Blog` + `ItemList` on listing page 1.
- `src/app/sitemap.ts` extended: blog index, category pages, and each published post ×2 locales with `alternates.languages`; `lastModified` from `updated_at`/`published_at`.

Owner-selected extras:

- **Auto-generated OG images** — `opengraph-image.tsx` (next/og `ImageResponse`) per article: brand-colored template with title, category, date, wordmark; 1200×630; generation failure never breaks the article page (isolated route).
- **RSS** — `/feed.xml` (`en`) and `/vi/feed.xml` (`vi`), latest 20 published posts (title, link, guid, pubDate, summary); RSS autodiscovery `<link rel="alternate">` emitted in the locale layout head.
- **Table of contents** — sticky sidebar on wide screens; `<details>` disclosure above the article on narrow screens; scroll-spy via a small client component; keyboard operable.
- **Reading time** — shown on cards and article header.

## 8. UX / UI specification (extends `docs/02-ui-ux-spec.md` conventions)

Blog inherits the global design system tokens (surfaces, text hierarchy, accent, spacing, radii, shadows, motion, typography scale). Both themes are designed deliberately; dark mode is not an inversion afterthought. Reference-free: structure below defines the target.

### 8.1 Navigation entry points

- Desktop header gains **Blog** between Resume and Contact, navigating to `/blog` (locale-aware). Active-section treatment applies on blog routes.
- Mobile menu gains Blog in the same order position.
- Footer navigation column gains Blog.
- Long-scroll homepage is unchanged; Blog is the first true multi-route area of the public site.

### 8.2 Listing

- Section header: eyebrow label + H1 (localized "Blog" / "Bài viết") + one-line intro.
- Responsive grid: 1 column mobile, 2 tablet, 3 desktop, within existing container widths.
- Card anatomy (top→bottom): cover image (16:9, `object-fit: cover`, explicit dimensions — no layout shift) → category badge (chip token) → title (2-line clamp) → summary (3-line clamp) → meta row (date · N min read).
- Whole card is one link (stretched-link pattern; accessible name = post title). Hover: border/elevation token shift; focus-visible ring per system.
- Pagination controls: numbered page links + prev/next, real hrefs, `aria-current="page"`.
- Empty state (no posts yet): short localized message + link back to home. No fake cards.

### 8.3 Article detail

- Breadcrumb `Home › Blog › {post}` (title truncates gracefully), semantic `<nav aria-label>`.
- Article header: H1 title, meta row (published date; updated date only when materially different; reading time; category link), tags as non-interactive chips (v1).
- Cover image spans the content column at a fixed aspect ratio.
- Reading column targets ~65–70 characters; TOC occupies a sticky side rail on wide screens and moves into a collapsed `<details>` labeled "On this page" above the article on narrow screens.
- Prose styling: h2/h3 with scroll-margin accounting for the sticky header; paragraphs, lists, blockquotes, inline code, tables, hr all token-driven; fenced code blocks use the per-theme syntax palette; images inside articles take explicit dimensions/ratios and support optional captions.
- Related posts: up to 3 cards reusing the exact listing card component.
- Motion: subtle reveal only; honors `prefers-reduced-motion`.

### 8.4 States

- Loading: ISR makes stale-first delivery the norm; a minimal skeleton exists only for uncached first paints.
- Error: route-level boundary with localized retry message; cached pages keep serving stale content upstream failures.

### 8.5 Accessibility acceptance criteria

Same bar as the existing spec: landmark structure, logical headings (H1 = post title; TOC is a labelled `<nav>`), all controls keyboard operable, visible focus, contrast in both themes, meaningful alt for covers and in-article images, stretched-link cards announce the title once.

## 9. Admin experience (inside existing `/admin` dashboard)

Reuses the dashboard's established list/form/Zod-error patterns; no new design language.

- Sidebar group **Blog**: Posts · Categories.
- Posts list: title, status badge, category, published date, edit/delete; filter by status.
- Post editor:
  - Common fields: slug (auto-suggested from `en` title, editable, uniqueness-checked), category select, tags multi-select with inline creation, cover picker over the `blog-media` bucket using the existing media-picker pattern.
  - Locale tabs `en` / `vi`: title, summary, Markdown textarea (monospace) + **Preview** button invoking a server action that renders through the shared pipeline.
  - Status control with publish gate: attempt surfaces exactly which locale/fields are missing; otherwise publishes atomically.
- Categories CRUD (slug + `en`/`vi` names), guarded against deletion while posts reference them.
- Every successful mutation triggers `updateTag("blog")` at the server-action choke point (read-your-writes: the editor and the next visitor both see fresh data immediately).

## 10. Error handling summary

- Public: draft/missing translation → `notFound()`; upstream DB failure → stale cache or localized error boundary; OG image failure isolated.
- Authoring: Zod validation mirroring the schema; slug conflicts surfaced inline; publish-gate failures enumerated field-by-field.
- Pipeline: raw HTML disabled; malformed Markdown degrades to plain rendering, never a thrown 500.

## 11. Testing & quality gates

Unit tests (`node:test` via `tsx`, colocated `*.test.ts` like existing features):

- Markdown pipeline: heading anchors + TOC extraction, code-block highlighting markup, reading-time calculation, raw-HTML rejection.
- Repository mapping row→view-model; publish-gate acceptance/rejection cases.
- Cache invalidation contract: publish, edit, unpublish, and delete each trigger `updateTag("blog")` at the choke point, and the immediately following read (listing, detail, sitemap, feed) reflects the new state — no stale window.
- RSS XML generation; sitemap entries incl. alternates; JSON-LD object shapes.

Standard gates before merge: `npm run lint`, `npm run typecheck`, production build (`-- --webpack` fallback per known Turbopack sandbox quirk), keyboard/a11y smoke on TOC + cards + pagination, responsive smoke at mobile/tablet/desktop, both themes, both locales, Rich Results validation of JSON-LD, feed validity check.

Database changes follow the local-first workflow: migration + seed applied and verified locally before any `--linked` promotion; production data changes mirrored back to local immediately.

## 12. Implementation slices (1 issue = 1 PR)

1. **Schema foundation** — blog tables, translations, RLS, atomic-mutation + publish-gate RPCs, seed; update `docs/03-content-data-model.md` with blog entities.
2. **Feature layer** — types, repository adapter, Markdown pipeline, reading time, unit tests.
3. **Public surface** — listing/detail/category routes, card + article + TOC components, core SEO (metadata/hreflang/canonical/sitemap/JSON-LD), navigation entry points; update `docs/02-ui-ux-spec.md` with the Blog section.
4. **Admin** — Posts/Categories CRUD, editor with locale tabs + Preview, publish gate wiring, `updateTag` choke point.
5. **Distribution extras** — auto OG images, RSS feeds, scroll-spy polish, related posts module.

Each slice ships with its own verification evidence per the PR contract (tests run, screenshots, limitations, docs affected).
