-- ============================================================
-- Phase 4: Awards and Qualifications
--
-- Creates 4 new tables:
--   qualifications       (reference/lookup)
--   member_qualifications (member-qualification join)
--   awards               (reference/lookup)
--   member_awards        (member-award join)
--
-- RLS policy design:
--   - All authenticated users can read all 4 tables
--   - Admin can manage reference tables (qualifications, awards)
--   - NCO+ can INSERT into member_qualifications
--   - Command+ can UPDATE member_qualifications (for revocation)
--   - Command+ can INSERT into member_awards
--   - All FK member_id references public.soldiers(id) — NOT profiles
--   - JWT role check uses SELECT subquery wrapper (per established pattern)
--
-- Note: Legacy stubs of these tables may exist from prior schema work.
-- Drop them first to ensure correct FK references (soldiers.id not profiles.id).
-- All tables are empty (no data to preserve).
-- ============================================================

-- Drop legacy tables if they exist (in dependency order)
drop table if exists public.member_qualifications cascade;
drop table if exists public.member_awards cascade;
drop table if exists public.qualifications cascade;
drop table if exists public.awards cascade;

-- ============================================================
-- 1. qualifications (reference/lookup table)
-- ============================================================
create table public.qualifications (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  abbreviation     text,
  category         text,
  description      text,
  badge_url        text,
  expires          boolean not null default false,
  expiration_days  int,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.qualifications enable row level security;

-- All authenticated users can read qualifications
create policy "Authenticated can read qualifications"
  on public.qualifications for select
  to authenticated
  using (true);

-- Admin only can manage (insert/update/delete) qualifications reference data
create policy "Admin can manage qualifications"
  on public.qualifications for all
  to authenticated
  using (
    (select (auth.jwt() ->> 'user_role')::public.app_role) = 'admin'
  )
  with check (
    (select (auth.jwt() ->> 'user_role')::public.app_role) = 'admin'
  );

-- ============================================================
-- 2. member_qualifications (member-qualification join)
-- ============================================================
create table public.member_qualifications (
  id               uuid primary key default gen_random_uuid(),
  member_id        uuid not null references public.soldiers(id) on delete cascade,
  qualification_id uuid not null references public.qualifications(id) on delete restrict,
  awarded_by       uuid references auth.users(id) on delete set null,
  awarded_date     date not null default current_date,
  expiration_date  date,
  status           text not null default 'active'
                     check (status in ('active', 'expired', 'revoked')),
  notes            text,
  evidence_url     text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.member_qualifications enable row level security;

-- All authenticated users can read member qualifications
create policy "Authenticated can read member qualifications"
  on public.member_qualifications for select
  to authenticated
  using (true);

-- NCO+ can insert member qualifications (grant qualification)
create policy "NCO and above can insert member qualifications"
  on public.member_qualifications for insert
  to authenticated
  with check (
    (select (auth.jwt() ->> 'user_role')::public.app_role)
      in ('nco', 'command', 'admin')
  );

-- Command+ can update member qualifications (for future revocation)
create policy "Command and above can update member qualifications"
  on public.member_qualifications for update
  to authenticated
  using (
    (select (auth.jwt() ->> 'user_role')::public.app_role)
      in ('command', 'admin')
  );

-- ============================================================
-- 3. awards (reference/lookup table)
-- ============================================================
create table public.awards (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  abbreviation text,
  award_type   text not null,
  description  text,
  ribbon_url   text,
  precedence   int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.awards enable row level security;

-- All authenticated users can read awards
create policy "Authenticated can read awards"
  on public.awards for select
  to authenticated
  using (true);

-- Admin only can manage (insert/update/delete) awards reference data
create policy "Admin can manage awards"
  on public.awards for all
  to authenticated
  using (
    (select (auth.jwt() ->> 'user_role')::public.app_role) = 'admin'
  )
  with check (
    (select (auth.jwt() ->> 'user_role')::public.app_role) = 'admin'
  );

-- ============================================================
-- 4. member_awards (member-award join)
-- ============================================================
create table public.member_awards (
  id           uuid primary key default gen_random_uuid(),
  member_id    uuid not null references public.soldiers(id) on delete cascade,
  award_id     uuid not null references public.awards(id) on delete restrict,
  awarded_by   uuid references auth.users(id) on delete set null,
  awarded_date date not null default current_date,
  citation     text,
  orders_url   text,
  created_at   timestamptz not null default now()
);

alter table public.member_awards enable row level security;

-- All authenticated users can read member awards
create policy "Authenticated can read member awards"
  on public.member_awards for select
  to authenticated
  using (true);

-- Command+ can insert member awards (grant award)
create policy "Command and above can insert member awards"
  on public.member_awards for insert
  to authenticated
  with check (
    (select (auth.jwt() ->> 'user_role')::public.app_role)
      in ('command', 'admin')
  );

-- ============================================================
-- 5. Seed data for qualifications reference table
-- ============================================================
insert into public.qualifications (name, abbreviation, category, description, expires, expiration_days)
values
  ('Marksman',  'MRK',  'combat_qual', 'Basic marksmanship qualification demonstrating proficiency with assigned weapon.', false, null),
  ('Combat Lifesaver', 'CLS', 'medical', 'Basic trauma and lifesaving skills for non-medical personnel in combat environments.', true, 365),
  ('Joint Terminal Attack Controller', 'JTAC', 'combat_qual', 'Qualification to control and coordinate close air support and other airborne assets.', true, 365),
  ('Breacher', 'BCH', 'combat_qual', 'Demolitions and mechanical breach qualification for entry operations.', false, null),
  ('Basic Combat Training', 'BCT', 'course', 'Foundational military training course required for all enlisted personnel.', false, null),
  ('Advanced Individual Training', 'AIT', 'course', 'Specialty skill training course for assigned military occupational specialty.', false, null);
