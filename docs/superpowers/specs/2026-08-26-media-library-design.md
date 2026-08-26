# Media Library Design — WordPress-style shared picker + catalog

Date: 2026-08-26 · Issue: #102 · Status: approved in chat (see issue for summary)

## Goals

Replace the flat `/admin/media` rows and fragmented per-section pickers with one
media library engine that scales to thousands of images and gives every asset
editable metadata (alt text first-class, bilingual).

## Decisions

| Topic | Decision |
|---|---|
| Catalog | New table `media_assets`, PK `(bucket, path)`. Storage stays source of truth for bytes; catalog powers listing/search/sort. |
| Metadata fields | `title` (internal display name, default from filename, searchable), `alt_en`, `alt_vi`. Auto at upload: `width`, `height`, `size_bytes`, `mime`. No caption/description (near-zero SEO value in 2026). |
| RLS | Enable RLS; owner-only CRUD via `private.is_owner()`; **no anon policy** — public pages never read this table (public URLs go straight to Storage). |
| Surfaces | One `MediaLibraryGrid` engine, two hosts: `MediaPickerModal` (`<dialog>`) scoped to one bucket opened from editors; revamped `/admin/media` page with bucket tabs. |
| Loading | Modal = infinite scroll via keyset cursor (`created_at desc, path desc`) + IntersectionObserver sentinel + "Load more" fallback. Page = numbered pagination through URL searchParams (deep-linkable). Both call one `listMediaAssets({bucket, query?, limit, page?|cursor?})`. |
| Search | `ilike` over `title` + `path` (wildcards escaped). Supabase Storage prefix-only search is insufficient, hence the catalog. |
| Dimensions | Server-side header parsing of PNG (IHDR), JPEG (SOF scan), WebP (VP8/VP8L/VP8X) — no new dependency; reused by backfill script. |
| Upload flow | Keep existing mime/10MB/owner-session guards → parse dimensions → upload to Storage first → insert catalog row (failure degrades to warning; file remains usable, metadata editable later). Title defaults from filename. Modal has Library / Upload tabs. |
| Delete | Existing reference-check preserved; after Storage remove succeeds, catalog row is deleted too. |
| Blog wiring (phase 1) | Cover picker and inline-insert use the modal (blog-media). Inline insert uses the asset's locale-appropriate alt. Public listing enriches cover alt from the catalog per locale when present. |
| Phase 2 | Project/resume/portfolio editors adopt the same picker (separate issue). |

## A11y contract

Native `<dialog>` (Esc handled by browser), focus restored to invoker on close,
initial focus on search input, grid cards are named `<button>`s, upload status
and errors announced via `aria-live="polite"`, visible `:focus-visible` styles,
no motion beyond theme tokens.

## Data access details

- Page mode: `.range(from, to)` + `count: "exact"`.
- Cursor mode keyset: `.or("created_at.lt.T,and(created_at.eq.T,path.lt.P))`.
- Index: `media_assets (bucket, created_at desc, path desc)`.

## Rollout

1. PR 1 — schema migration, backfill script, dimension parser, catalog data
   layer, tests (unit + local-Supabase catalog tests + RLS SQL test).
2. PR 2 — MediaLibraryGrid/modal/metadata-dialog/upload-modal + `/admin/media`
   revamp.
3. PR 3 — blog editor wiring + public cover-alt enrichment.

Local-first DB workflow applies: apply migration + backfill locally, verify,
then promote with human approval.
