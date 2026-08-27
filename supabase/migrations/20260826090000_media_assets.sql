-- Media assets catalog (#102): editable metadata for Storage objects so the
-- admin library can paginate, search and sort without relying on the
-- prefix-only Storage list API. Storage remains the source of truth for bytes;
-- this table is admin-only (no anon policy — public pages read public URLs
-- straight from Storage, never this table).

create table public.media_assets (
  bucket      text        not null
    check (bucket in ('resume-media', 'project-media', 'blog-media', 'portfolio')),
  path        text        not null,
  title       text        not null,
  alt_en      text        not null default '',
  alt_vi      text        not null default '',
  width       integer     check (width is null or width > 0),
  height      integer     check (height is null or height > 0),
  size_bytes  bigint      check (size_bytes is null or size_bytes >= 0),
  mime        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (bucket, path)
);

comment on table public.media_assets is
  'Admin catalog for media buckets: display title, bilingual alt text and technical facts captured at upload.';

create index media_assets_bucket_recent
  on public.media_assets (bucket, created_at desc, path desc);

alter table public.media_assets enable row level security;

create policy "media assets owner all" on public.media_assets
  for all to authenticated
  using (private.is_owner()) with check (private.is_owner());

-- Same privilege posture as the blog tables: anon has zero handle on the
-- table; owner-session clients and the service-role server path do DML.
revoke all on public.media_assets from anon;
grant select, insert, update, delete on public.media_assets
  to authenticated, service_role;
