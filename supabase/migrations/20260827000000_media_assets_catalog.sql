-- Media asset catalog (#102).
--
-- One row per uploaded storage object, keyed by (bucket, path). Carries
-- editable metadata (title, locale alt text) plus upload-time dimensions and
-- size. The admin media library and the shared MediaPickerModal read from this
-- catalog instead of listing Storage directly, so large buckets stay paginated
-- and covers/inline images get real alt text for SEO/a11y.
--
-- Owner-only RLS (private.is_owner()): the owner can fully manage their own
-- catalog; anon has zero access (no policy) and no table grants.

create table if not exists public.media_assets (
  bucket     text        not null,
  path       text        not null,
  title      text        not null,
  alt_en     text        not null default '',
  alt_vi     text        not null default '',
  width      integer,
  height     integer,
  size_bytes bigint,
  mime       text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (bucket, path)
);

comment on table public.media_assets is
  'Editable catalog of uploaded media objects: title, locale alt text, dimensions.';

-- Keyset pagination for the picker modal + management grid (per bucket,
-- newest-first, path as the stable tiebreak).
create index if not exists media_assets_bucket_recent
  on public.media_assets (bucket, created_at desc, path desc);

-- Integrity guards: buckets must be one of the known storage buckets; dimensions
-- must be positive and size non-negative when present (never fabricated from a
-- corrupt file).
alter table public.media_assets
  drop constraint if exists media_assets_bucket_check,
  drop constraint if exists media_assets_width_check,
  drop constraint if exists media_assets_height_check,
  drop constraint if exists media_assets_size_bytes_check;

alter table public.media_assets
  add constraint media_assets_bucket_check check (
    bucket in ('resume-media', 'project-media', 'blog-media', 'portfolio')
  ),
  add constraint media_assets_width_check check (width is null or width > 0),
  add constraint media_assets_height_check check (height is null or height > 0),
  add constraint media_assets_size_bytes_check check (size_bytes is null or size_bytes >= 0);

alter table public.media_assets enable row level security;

drop policy if exists "media assets owner all" on public.media_assets;
create policy "media assets owner all" on public.media_assets
  for all to authenticated
  using (private.is_owner())
  with check (private.is_owner());

-- No anon access at the table level.
revoke all on public.media_assets from anon;
grant select, insert, update, delete on public.media_assets to authenticated, service_role;