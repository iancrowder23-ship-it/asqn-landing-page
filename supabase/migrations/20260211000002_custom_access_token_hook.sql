-- ============================================================
-- Custom Access Token Hook
--
-- Called by Supabase Auth every time a JWT is issued (login + token refresh).
-- Reads user's role from user_roles table and injects it as 'user_role' claim.
--
-- After this hook is registered in the Dashboard, RLS policies can evaluate
-- (auth.jwt() ->> 'user_role') without an additional DB round-trip per request.
--
-- Source: https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac
-- ============================================================

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
  declare
    claims jsonb;
    user_role public.app_role;
  begin
    -- Read the user's role from user_roles table
    -- user_roles is denied to authenticated users — only accessible to supabase_auth_admin
    select role into user_role
    from public.user_roles
    where user_id = (event->>'user_id')::uuid;

    claims := event->'claims';

    if user_role is not null then
      -- Inject role as string into JWT claims
      claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
    else
      -- User has no role assigned — set null so RLS policies deny access cleanly
      claims := jsonb_set(claims, '{user_role}', 'null');
    end if;

    event := jsonb_set(event, '{claims}', claims);
    return event;
  end;
$$;

-- Grant supabase_auth_admin permission to call this function
-- Revoke from everyone else to prevent direct invocation
grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;

-- Grant supabase_auth_admin read access to user_roles for the hook to work
grant all on table public.user_roles to supabase_auth_admin;
revoke all on table public.user_roles from authenticated, anon, public;

-- RLS policy: allow supabase_auth_admin to read user_roles (required for hook)
-- The existing "Deny authenticated access to user_roles" restrictive policy
-- does not apply to supabase_auth_admin role.
create policy "Allow auth admin to read user roles"
  on public.user_roles
  as permissive for select
  to supabase_auth_admin
  using (true);
