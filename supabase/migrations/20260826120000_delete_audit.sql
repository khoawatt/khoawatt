-- Append-only audit trail for destructive operations (#104).
--
-- Every hard delete writes one row here after the DB + storage cleanup
-- succeeds. Immutability is enforced by granting NO update/delete to any
-- application role (authenticated and service_role get select/insert only);
-- migrations/superuser can still prune history deliberately, which the
-- application never does.

create table public.delete_audit (
  id             bigint generated always as identity primary key,
  entity_type    text        not null,
  entity_id      text        not null,
  deleted_by     uuid        not null references auth.users(id),
  impact         jsonb       not null default '{}'::jsonb,
  cleanup        jsonb       not null default '[]'::jsonb,
  result         text        not null check (result in ('success', 'failed')),
  failure_reason text,
  created_at     timestamptz not null default now()
);

comment on table public.delete_audit is
  'Immutable record of every hard delete: entity, impact, storage cleanup, outcome.';

create index delete_audit_entity_idx on public.delete_audit (entity_type, created_at desc);

alter table public.delete_audit enable row level security;

create policy "delete audit owner insert" on public.delete_audit
  for insert to authenticated
  with check (private.is_owner());

create policy "delete audit owner select" on public.delete_audit
  for select to authenticated
  using (private.is_owner());

-- No update/delete policies exist: rows are append-only even for the owner.
revoke all on public.delete_audit from anon;
grant select, insert on public.delete_audit to authenticated, service_role;