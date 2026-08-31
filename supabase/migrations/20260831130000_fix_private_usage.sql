-- Fix permission denied for schema private when calling delete RPCs
-- Authenticated users need USAGE on private schema to execute private.is_owner() and other helpers

grant usage on schema private to authenticated, service_role;
grant execute on all functions in schema private to authenticated, service_role;
