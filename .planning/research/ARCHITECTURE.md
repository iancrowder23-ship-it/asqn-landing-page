# Architecture Research

**Domain:** Milsim unit website with integrated personnel management system
**Researched:** 2026-02-10
**Confidence:** HIGH (based on Supabase official docs, verified patterns from existing milsim units, PERSCOM.io data model analysis)

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         BROWSER / CLIENT                            │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │  Public Site  │  │  Dashboard   │  │  Admin Panel  │             │
│  │  (no auth)    │  │  (member+)   │  │  (NCO+)      │             │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
│         │                 │                  │                       │
├─────────┴─────────────────┴──────────────────┴───────────────────── ┤
│                    Next.js App Router                                │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │   Route Groups   │  │    Middleware     │  │  Server Actions  │  │
│  │  (site)/(app)    │  │  (auth + RBAC)   │  │  (mutations)     │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
├─────────────────────────────────────────────────────────────────────┤
│                         Supabase Layer                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │  Auth + RLS   │  │  PostgreSQL  │  │   Storage    │             │
│  │  (Discord     │  │  (data +     │  │  (avatars,   │             │
│  │   OAuth)      │  │   triggers)  │  │   documents) │             │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Communicates With |
|-----------|----------------|-------------------|
| Public Site | Landing, about, leadership, events, enlistment form | Supabase (anon key, insert-only for enlistment) |
| Auth Middleware | Route protection, role injection from JWT claims | Next.js routes, Supabase Auth |
| Member Dashboard | Soldier profile, attendance, service record (self) | Supabase (authenticated, RLS-filtered) |
| Admin Panel | Personnel actions, roster management, event management | Supabase (service_role for privileged writes) |
| Supabase Auth | Discord OAuth, session management, JWT issuance | Discord API, Custom Access Token Hook |
| Custom Access Token Hook | Injects `user_role` claim into JWT on token issue | user_roles table |
| RLS Policies | Data access enforcement at row level | All authenticated queries |
| PostgreSQL Triggers | Auto-log service record on personnel action | personnel_actions → service_records |
| Supabase Storage | Avatar and document storage, access-controlled | Soldiers table (avatar_url), Documents |

## Recommended Project Structure

```
src/
├── app/
│   ├── (site)/                    # Public-facing, no auth required
│   │   ├── page.tsx               # Landing page
│   │   ├── about/
│   │   ├── leadership/
│   │   ├── events/
│   │   ├── enlist/                # Public enlistment form
│   │   └── contact/
│   ├── (app)/                     # Auth-required shell
│   │   ├── layout.tsx             # Auth guard layout
│   │   ├── dashboard/             # Member view (role: member+)
│   │   │   ├── page.tsx           # Personal overview
│   │   │   ├── profile/
│   │   │   └── attendance/
│   │   └── admin/                 # Leadership view (role: nco+)
│   │       ├── roster/            # All soldiers, multiple views
│   │       ├── soldiers/[id]/     # Individual soldier management
│   │       ├── events/            # Event creation and attendance
│   │       ├── enlistments/       # Review queue
│   │       └── personnel-actions/ # Promotions, awards, etc.
│   ├── auth/
│   │   ├── callback/              # Discord OAuth callback handler
│   │   └── login/
│   └── api/
│       └── webhooks/              # Discord bot integration (future)
├── components/
│   ├── ui/                        # Base design system (buttons, cards, inputs)
│   ├── public/                    # Public site components
│   └── app/                       # Authenticated app components
│       ├── roster/                # RosterCard, RosterTree, RosterTable
│       ├── soldier/               # ServiceRecord, AwardBadge, RankInsignia
│       └── events/                # EventCard, AttendanceTracker
├── lib/
│   ├── supabase/
│   │   ├── client.ts              # Browser Supabase client
│   │   ├── server.ts              # Server Supabase client (cookies)
│   │   └── admin.ts               # Service role client (server-only)
│   ├── auth/
│   │   └── roles.ts               # Role hierarchy constants + helpers
│   └── utils/
├── hooks/                         # Client-side data hooks
├── types/
│   └── database.ts                # Supabase-generated DB types
└── middleware.ts                   # Route protection + role injection
```

### Structure Rationale

- **(site)/ vs (app)/:** Route groups enforce auth boundary at the layout level. Public routes get no auth overhead; app routes gate behind Supabase session check in the layout.
- **lib/supabase/admin.ts:** Service role client kept strictly server-side. Never exported to client. Used only for privileged operations NCOs/admins perform (bypasses RLS for write operations that need cross-row access).
- **components/app/roster/:** Roster has three views (card, tree, table) pulling from the same query — co-locate these so they share a data hook and differ only in presentation.
- **middleware.ts:** Single place for route-level role enforcement. Reads `user_role` from JWT claims (no DB round-trip). Redirects on failure.

## Architectural Patterns

### Pattern 1: Custom JWT Claims for Role Hierarchy

**What:** Store the user's role (admin/command/nco/member) in the JWT via a Custom Access Token Hook. Middleware and RLS policies read `auth.jwt() ->> 'user_role'` — no extra DB query on every request.

**When to use:** Any time you need role checks. This is the foundation of the entire permission system.

**Trade-offs:** Role changes require the user to re-authenticate (log out / log back in) to get a new JWT. For a milsim unit where role changes (promotions) are deliberate events, this is acceptable. Document this behavior.

**Example:**
```sql
-- Auth hook: inject role into JWT on token issuance
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb language plpgsql stable as $$
declare
  claims jsonb;
  user_role public.app_role;
begin
  select role into user_role
  from public.user_roles
  where user_id = (event->>'user_id')::uuid;

  claims := event->'claims';
  if user_role is not null then
    claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
  end if;
  event := jsonb_set(event, '{claims}', claims);
  return event;
end;
$$;

-- RLS policy using the claim (no disk I/O)
create policy "NCO+ can update soldier records"
on public.soldiers for update
to authenticated
using (
  (auth.jwt() ->> 'user_role')::app_role in ('nco', 'command', 'admin')
);
```

### Pattern 2: Service Record as Append-Only Audit Log

**What:** Every personnel action (promotion, award, transfer, status change, qualification) writes to a `service_records` table via a PostgreSQL trigger on the source table. The service record is never edited — only appended.

**When to use:** Any mutation to a soldier's standing. Promotions write to `rank_records` which fires a trigger that appends to `service_records`. Same for awards, qualifications, etc.

**Trade-offs:** Slightly more DB complexity upfront. The payoff is a complete, tamper-evident history with zero application-layer code to maintain the log — the database enforces it.

**Example:**
```sql
-- Trigger: auto-append to service_records when a rank_record is inserted
create or replace function log_rank_change_to_service_record()
returns trigger language plpgsql as $$
begin
  insert into public.service_records (soldier_id, action_type, payload, performed_by, occurred_at)
  values (
    NEW.soldier_id,
    'rank_change',
    jsonb_build_object('from_rank', OLD.rank_id, 'to_rank', NEW.rank_id),
    auth.uid(),
    now()
  );
  return NEW;
end;
$$;

create trigger after_rank_record_insert
after insert on public.rank_records
for each row execute function log_rank_change_to_service_record();
```

### Pattern 3: Enlistment as a State Machine

**What:** Enlistment submissions move through defined states: `pending_review` → `interview_scheduled` → `accepted` | `denied`. Each state transition is a personnel action that also writes to `service_records`.

**When to use:** The enlistment flow from public form submission through review to soldier record creation.

**Trade-offs:** Requires a `status` column with an enum type and transition validation. Consider a DB-level check constraint to prevent invalid state jumps. Alternatively, enforce transitions in server actions only.

**Example:**
```sql
create type enlistment_status as enum (
  'pending_review',
  'interview_scheduled',
  'accepted',
  'denied'
);

create table public.enlistments (
  id uuid primary key default gen_random_uuid(),
  discord_username text not null,
  steam_id text,
  status enlistment_status not null default 'pending_review',
  reviewed_by uuid references auth.users,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### Pattern 4: Multiple Roster Views from One Query

**What:** The roster is fetched once with a query joining soldiers, ranks, units, and positions. Three presentational components (RosterCard, RosterTree, RosterTable) consume the same data shape — only rendering differs.

**When to use:** Any roster display. Avoid fetching different data per view type.

**Trade-offs:** The shared query must include enough data for all three views. Use a single React Query / SWR cache key so all three views are in sync without re-fetching.

**Example:**
```typescript
// Shared roster query — fetches everything all three views need
const { data: roster } = useQuery({
  queryKey: ['roster'],
  queryFn: () =>
    supabase
      .from('soldiers')
      .select(`
        id, display_name, avatar_url, status,
        rank:ranks(id, name, abbreviation, insignia_url, sort_order),
        unit:units(id, name, parent_unit_id),
        position:positions(id, title)
      `)
      .eq('status', 'active')
      .order('rank(sort_order)', { ascending: false })
})

// Three components, same data:
<RosterCard soldiers={roster} />
<RosterTree soldiers={roster} />
<RosterTable soldiers={roster} />
```

## Data Flow

### Request Flow: Public Enlistment Submission

```
User fills enlistment form (public)
    ↓
Next.js Server Action (validate input)
    ↓
Supabase anon client → INSERT into enlistments (RLS: insert-only for anon)
    ↓
Leadership sees new row in enlistments review queue (status = pending_review)
    ↓
Leadership updates status → accepted
    ↓
Server Action: create soldier record from enlistment data
    ↓
Trigger: append 'enlistment_accepted' to service_records
```

### Request Flow: Personnel Action (Promotion)

```
NCO/Command initiates promotion in Admin Panel
    ↓
Server Action (server-side, uses authenticated Supabase client)
    ↓
INSERT into rank_records (soldier_id, new_rank_id, effective_date)
    ↓
PostgreSQL trigger fires automatically
    ↓
INSERT into service_records (action_type='rank_change', payload, performed_by)
    ↓
UPDATE soldiers.rank_id to new rank (or derive from latest rank_record)
    ↓
User logs out / back in → JWT refreshed → new rank claim issued
```

### Request Flow: Authenticated Page Load

```
Browser request to /admin/roster
    ↓
middleware.ts: reads JWT cookie → extracts user_role claim
    ↓
Role < NCO? → redirect to /dashboard
    ↓
Server Component: supabase server client (reads from cookies)
    ↓
SELECT soldiers with RLS: policy checks user_role in JWT
    ↓
Render roster with fetched data (SSR)
```

### State Management

```
Supabase (source of truth)
    ↓ (initial fetch, SSR)
Server Components (render)
    ↓ (hydrate)
Client Components ←→ TanStack Query / SWR (cache)
                          ↓
                    Server Actions (mutations)
                          ↓
                    Supabase (write + trigger)
                          ↓
                    Cache invalidation → re-fetch
```

## Database Schema: Core Tables

```
auth.users (Supabase-managed)
    │
    ├── user_roles (user_id, role: app_role enum)
    │
    └── soldiers
            ├── id (uuid)
            ├── user_id (→ auth.users, nullable: pre-Discord members)
            ├── display_name
            ├── avatar_url
            ├── status (active/inactive/mia/kia/discharged)
            ├── rank_id (→ ranks)
            ├── unit_id (→ units)
            ├── position_id (→ positions)
            └── joined_at

ranks
    ├── id, name, abbreviation, insignia_url
    └── sort_order (determines chain of command display)

units
    ├── id, name, abbreviation
    └── parent_unit_id (→ units, self-referential for org tree)

service_records (append-only)
    ├── id, soldier_id (→ soldiers)
    ├── action_type (rank_change|award|qualification|transfer|status_change|note)
    ├── payload (jsonb — flexible per action type)
    ├── performed_by (→ auth.users)
    ├── visibility (public|leadership_only)
    └── occurred_at

events
    ├── id, title, description, event_type
    ├── scheduled_at, duration_minutes
    └── created_by (→ auth.users)

event_attendance
    ├── event_id (→ events)
    ├── soldier_id (→ soldiers)
    └── status (rsvp_yes|rsvp_no|attended|absent|excused)

enlistments
    ├── id, discord_username, steam_id, timezone
    ├── status (pending_review|interview_scheduled|accepted|denied)
    └── reviewed_by (→ auth.users)

awards
    ├── id, name, description, image_url
    └── sort_order

soldier_awards (junction)
    ├── soldier_id (→ soldiers)
    ├── award_id (→ awards)
    ├── awarded_by (→ auth.users)
    └── awarded_at
```

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Discord OAuth | Supabase Auth social provider → `/auth/callback` route handles code exchange | User's Discord ID stored on `soldiers` table for future bot integration |
| Supabase Storage | Direct client upload (avatars), server-side upload (documents) | Use separate buckets: `avatars` (public), `documents` (private, RLS-controlled) |
| Discord Bot (future) | Webhook or REST API from bot → Next.js API route → Supabase service_role | Keep this boundary clean — bot authenticates via service key, not OAuth |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Public Site ↔ Supabase | Anon key, insert-only for enlistments, read-only for public data | Never expose service_role key to public routes |
| Middleware ↔ Auth | JWT cookie read (no DB call) | Fast — role from JWT claim, not a DB query |
| Admin Panel ↔ DB | Authenticated client (RLS) for reads; service_role for privileged writes | Scope service_role use to specific server actions, not a general client |
| Roster views ↔ Data | Shared TanStack Query cache, single fetch | Three views (card/tree/table) never fetch separately |

## Anti-Patterns

### Anti-Pattern 1: Checking Roles in the Frontend Only

**What people do:** Read the user role from a client-side state store and conditionally render admin UI, trusting the client to hide restricted operations.
**Why it's wrong:** The API/database is still accessible. A user can bypass UI guards entirely and hit Supabase directly.
**Do this instead:** Put roles in RLS policies and middleware. UI guards are cosmetic only. The database is the enforcement point.

### Anti-Pattern 2: Using service_role Client for All Operations

**What people do:** Create one Supabase client with `service_role` key for simplicity — bypasses all the RLS complexity.
**Why it's wrong:** Eliminates the entire security model. Any bug in application code becomes a full data breach.
**Do this instead:** Use the authenticated client (with user JWT) for all user-facing operations. Reserve service_role for a small set of deliberate admin server actions.

### Anti-Pattern 3: Storing Personnel Actions Without an Audit Trail

**What people do:** Update the soldiers table directly (e.g., `UPDATE soldiers SET rank_id = X`) without logging the change.
**Why it's wrong:** No history, no accountability, no undo path. This is how units lose track of who promoted whom and when.
**Do this instead:** Insert into a rank_records table; derive current rank from the most recent record. Use triggers to maintain service_records automatically.

### Anti-Pattern 4: Conflating the Service Record with a Log Table

**What people do:** Build a generic `activity_log` table that captures everything including UI clicks, page views, etc.
**Why it's wrong:** Service records are a military document, not a debug log. Noisy data makes meaningful records invisible.
**Do this instead:** `service_records` contains only meaningful personnel actions. Add a `visibility` flag for leadership-only items (notes, disciplinary actions). Keep it human-readable.

### Anti-Pattern 5: Building the Roster Before Auth

**What people do:** Start with the flashy roster UI because it's visible and exciting, before auth is solid.
**Why it's wrong:** Roster depends on RLS policies that require working auth, custom claims, and a soldier data model. Building roster first means rebuilding it when auth lands.
**Do this instead:** Build in this order: Auth → Data model + RLS → Personnel CRUD → Roster views.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-200 members | Monolith is fine. Single Supabase project. No caching layer needed. |
| 200-2,000 members | Add connection pooling (Supabase includes PgBouncer). Index all FK columns and RLS policy columns. |
| 2,000+ members | Roster queries may need materialized views or denormalization. Realtime attendance updates may need rate limiting. This scale is extremely unlikely for a single milsim unit. |

### Scaling Priorities

1. **First bottleneck:** Roster query with multiple joins (soldiers + ranks + units + positions). Fix by ensuring indexes on `soldiers.rank_id`, `soldiers.unit_id`, `soldiers.status`, and all columns used in RLS policies.
2. **Second bottleneck:** service_records table grows unbounded. Partition by year or archive records older than 2 years to a cold table if query performance degrades.

## Suggested Build Order

The component dependencies create a clear build order. Each phase unlocks the next.

```
Phase 1: Foundation
  Auth (Discord OAuth) → User session → Middleware (role protection)
       ↓
Phase 2: Data Model
  DB schema (soldiers, ranks, units) → RLS policies → Custom JWT claims hook
       ↓
Phase 3: Public Site
  Landing/About/Leadership/Events (static or lightly dynamic) → Enlistment form
       ↓
Phase 4: Core Personnel System
  Soldier CRUD → Service record triggers → Personnel actions (promote/award/qualify)
       ↓
Phase 5: Roster
  Shared data query → RosterCard → RosterTree → RosterTable
       ↓
Phase 6: Event Management
  Event creation → Attendance tracking → Attendance stats
       ↓
Phase 7: Enlistment Pipeline
  Review queue UI → Interview scheduling → Accept/deny → Auto-create soldier record
       ↓
Phase 8: Polish
  Notifications → Discord bot integration → Mobile-responsive audit
```

**Rationale for this order:**
- Auth must exist before any protected route is built. Building roster before auth means rebuilding with real role data later.
- Data model + RLS must be locked before application code that depends on it. Changing RLS mid-feature breaks queries silently.
- Public site is largely independent but comes after auth so the enlistment form can use the same Supabase client setup.
- Personnel actions before roster because roster is read-only; you need data to render.
- Enlistment pipeline last among core features because it requires the full soldier creation flow to already work.

## Sources

- Supabase Custom Claims and RBAC official docs: https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac (HIGH confidence — official docs)
- Supabase Row Level Security official docs: https://supabase.com/docs/guides/database/postgres/row-level-security (HIGH confidence — official docs)
- Supabase Auth with Next.js official docs: https://supabase.com/docs/guides/auth/server-side/nextjs (HIGH confidence — official docs)
- Supabase Discord OAuth docs: https://supabase.com/docs/guides/auth/social-login/auth-discord (HIGH confidence — official docs)
- PERSCOM.io feature set and data model: https://docs.perscom.io/docs/introduction (MEDIUM confidence — SaaS product docs, not a standard spec, but canonical for this domain)
- UNITAF milsim unit live example: https://unitedtaskforce.net/ (MEDIUM confidence — observed behavior of production system)
- Next.js RBAC middleware patterns: https://www.jigz.dev/blogs/how-to-use-middleware-for-role-based-access-control-in-next-js-15-app-router (MEDIUM confidence — community resource, consistent with Next.js official docs)
- MakerKit Next.js + Supabase architecture reference: https://makerkit.dev/docs/next-supabase/architecture/architecture (MEDIUM confidence — production SaaS template, widely used)

---
*Architecture research for: ASQN 1st SFOD milsim unit website with personnel management system*
*Researched: 2026-02-10*
