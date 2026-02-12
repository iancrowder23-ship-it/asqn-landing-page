-- ============================================================
-- Baseline RLS Policies
--
-- Policy design:
--   - Wrap auth.jwt() in SELECT to cache result per statement (not per row)
--   - service_records: SELECT and INSERT only — no UPDATE or DELETE (append-only)
--   - user_roles: deny all authenticated access — only supabase_auth_admin reads it
-- ============================================================

-- ranks: all authenticated users can read; only admin/command can write
create policy "Authenticated can read ranks"
  on public.ranks for select
  to authenticated
  using (true);

create policy "Admin can manage ranks"
  on public.ranks for all
  to authenticated
  using (
    (select (auth.jwt() ->> 'user_role')::public.app_role) = 'admin'
  );

-- units: all authenticated users can read; only admin/command can write
create policy "Authenticated can read units"
  on public.units for select
  to authenticated
  using (true);

create policy "Admin and command can manage units"
  on public.units for all
  to authenticated
  using (
    (select (auth.jwt() ->> 'user_role')::public.app_role)
      in ('admin', 'command')
  );

-- soldiers: authenticated users can read active soldiers; NCO+ can write
create policy "Authenticated can read active soldiers"
  on public.soldiers for select
  to authenticated
  using (status = 'active');

create policy "NCO and above can insert soldiers"
  on public.soldiers for insert
  to authenticated
  with check (
    (select (auth.jwt() ->> 'user_role')::public.app_role)
      in ('nco', 'command', 'admin')
  );

create policy "NCO and above can update soldiers"
  on public.soldiers for update
  to authenticated
  using (
    (select (auth.jwt() ->> 'user_role')::public.app_role)
      in ('nco', 'command', 'admin')
  );

-- Members can read their own soldier record regardless of status
create policy "Members can read own soldier record"
  on public.soldiers for select
  to authenticated
  using (user_id = (select auth.uid()));

-- service_records: INSERT for NCO+, SELECT for authenticated.
-- NO UPDATE or DELETE policies — omitting them enforces append-only via RLS.
create policy "Authenticated can read public service records"
  on public.service_records for select
  to authenticated
  using (visibility = 'public');

create policy "NCO and above can read all service records including leadership_only"
  on public.service_records for select
  to authenticated
  using (
    visibility = 'public'
    or (select (auth.jwt() ->> 'user_role')::public.app_role)
      in ('nco', 'command', 'admin')
  );

create policy "NCO and above can insert service records"
  on public.service_records for insert
  to authenticated
  with check (
    (select (auth.jwt() ->> 'user_role')::public.app_role)
      in ('nco', 'command', 'admin')
  );

-- user_roles: deny all authenticated/anon access
-- Only supabase_auth_admin can read this table (granted in plan 01-04)
create policy "Deny authenticated access to user_roles"
  on public.user_roles
  as restrictive
  for all
  to authenticated, anon
  using (false);
