-- Feature A: newsletter subscription persistence.

create table newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null check (btrim(email) <> '' and char_length(email) <= 254),
  locale text not null check (locale in ('en','vi')),
  created_at timestamptz not null default now()
);

create unique index newsletter_subscribers_email_unique on newsletter_subscribers (lower(email));
create index newsletter_subscribers_created_at_idx on newsletter_subscribers (created_at desc);

revoke all on newsletter_subscribers from anon;

grant select, insert, update, delete on newsletter_subscribers to authenticated, service_role;

alter table newsletter_subscribers enable row level security;

create policy "owner all" on newsletter_subscribers for all to authenticated
  using (private.is_owner()) with check (private.is_owner());
