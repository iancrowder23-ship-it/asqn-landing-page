-- ============================================================
-- Phase 2: Public Site Tables and Anon RLS Policies
-- ============================================================

-- enlistments: anonymous application submissions
create table public.enlistments (
  id              uuid primary key default gen_random_uuid(),
  display_name    text not null,
  discord_username text not null,
  age             int,
  timezone        text,
  arma_experience text,
  why_join        text not null,
  referred_by     text,
  status          text not null default 'pending'
                    check (status in ('pending', 'reviewing', 'accepted', 'rejected')),
  submitted_at    timestamptz not null default now(),
  reviewed_at     timestamptz,
  reviewed_by     uuid references auth.users(id) on delete set null,
  notes           text
);
alter table public.enlistments enable row level security;

-- events: unit operations and training schedule
create table public.events (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  event_date  timestamptz not null,
  event_type  text not null check (event_type in ('operation', 'training', 'ftx')),
  status      text not null default 'scheduled'
                check (status in ('scheduled', 'completed', 'cancelled')),
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);
alter table public.events enable row level security;

-- ============================================================
-- Anon RLS policies for public reads
-- ============================================================

-- ranks: anon can read (rank chart, ORBAT display)
create policy "Anon can read ranks" on public.ranks for select to anon using (true);

-- units: anon can read (ORBAT)
create policy "Anon can read units" on public.units for select to anon using (true);

-- soldiers: anon can read active soldiers only (partial roster)
create policy "Anon can read active soldiers" on public.soldiers for select to anon using (status = 'active');

-- enlistments: anon can INSERT only (submit application, no reading back)
create policy "Anon can submit enlistments" on public.enlistments for insert to anon with check (true);

-- enlistments: NCO+ can read all
create policy "NCO and above can read enlistments" on public.enlistments for select to authenticated
  using ((select (auth.jwt() ->> 'user_role')::public.app_role) in ('nco', 'command', 'admin'));

-- events: anon can read scheduled events (public events page)
create policy "Anon can read scheduled events" on public.events for select to anon using (status = 'scheduled');

-- events: authenticated can read all events
create policy "Authenticated can read events" on public.events for select to authenticated using (true);

-- events: NCO+ can insert events
create policy "NCO and above can create events" on public.events for insert to authenticated
  with check ((select (auth.jwt() ->> 'user_role')::public.app_role) in ('nco', 'command', 'admin'));
