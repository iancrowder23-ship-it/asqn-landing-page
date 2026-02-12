# Phase 6: Events, Attendance, and Admin Dashboard - Research

**Researched:** 2026-02-11
**Domain:** SvelteKit server load functions for aggregated metrics, Supabase multi-table queries, RLS for role-differentiated write access, dual-table event schema (public events vs internal operations)
**Confidence:** HIGH (all schema findings verified against migration files and live codebase; stack fully established from prior phases)

---

## Summary

Phase 6 has three parallel sub-domains: **Event Management** (EVNT-01 through EVNT-05), and the **Admin Dashboard** (ADMN-01 through ADMN-03). The most critical architectural finding is that this project has **two separate event-related tables** that serve different purposes and must NOT be conflated:

1. `public.events` (Phase 2) — public-facing schedule table. Anon-readable. Has `title`, `description`, `event_date`, `event_type`, `status`. No attendance tracking. Already shown on the public site.
2. `public.operations` (Phase 3) — internal completed-op tracking table. Has `title`, `operation_date`, `operation_type`, `status`, `description`, `created_by`. Joined with `public.operation_attendance` for per-member attendance. Already consumed by the soldier profile page for combat record display.

The requirements for Phase 6 need to be fulfilled by **extending the `events` table** (adding UPDATE/DELETE RLS policies so NCO+ can edit/cancel) and **extending the `operations` table** (adding create/edit forms so NCO+ can manage them — currently there are no routes for creating operations). The `operation_attendance` table already exists with correct structure and RLS.

The Admin Dashboard (ADMN-01 through ADMN-03) is a read-only metrics page. No new tables are required — all dashboard data comes from existing tables via `count()` queries and `service_records` timeline queries. The current `/(app)/dashboard/+page.svelte` is a placeholder ("Welcome. You are authenticated.") that this phase replaces with real data.

**Primary recommendation:** Use SvelteKit `load` functions with parallel Supabase queries (not sequential) for the dashboard to avoid waterfall latency. Extend `events` with NCO+ UPDATE/DELETE RLS. Build `operations` CRUD in a new `/(app)/events/` route group. Attendance recording belongs on the operation detail page.

---

## Critical Schema Findings

### Dual Event Table Architecture (CONFIRMED FROM MIGRATIONS)

| Table | Phase | Purpose | Attendance | Public |
|-------|-------|---------|-----------|--------|
| `public.events` | Phase 2 | Public-facing schedule | No | Yes (anon read) |
| `public.operations` | Phase 3 | Internal completed ops | Yes (via operation_attendance) | No |

**These are SEPARATE tables, not the same concept.** The requirements talk about "events" in the milsim sense (operations, training, FTX) but the implementation must work across BOTH tables depending on the use case:

- EVNT-01/EVNT-02 ("NCO+ can create/edit/cancel events"): Write to BOTH `events` (so public schedule stays current) AND `operations` (for attendance tracking). OR: unify by only using one table. See design decision below.
- EVNT-03 ("NCO+ records attendance"): Only `operation_attendance` — attendance is internal.
- EVNT-04 ("member can view upcoming events"): Already done (Phase 2 public page). Internal view = query `events` table unfiltered for authenticated users.
- EVNT-05 ("attendance links to service record"): `operation_attendance` → `operations` join already on soldier profile.

### Design Decision: One Table or Two for Phase 6?

**The two-table design was intentional** (confirmed in Phase 3 migration comment: "Internal completed ops for attendance tracking. Separate from public `events` table used on the public site."). However, maintaining two tables where an NCO must create an entry in both is error-prone.

**Recommended approach for Phase 6:** Keep the two tables but clarify their lifecycle:

- `events` = the scheduling/announcement table. NCO creates here when scheduling. Status: `scheduled` → `completed` / `cancelled`.
- `operations` = the attendance-tracking record. Created when an NCO is ready to record attendance for a completed event. Can optionally reference an `events` row via a new FK (but not required — can also be standalone).

**Simplest valid implementation** (avoids FK coupling): NCO creates in `events` for public visibility; NCO creates in `operations` when recording attendance (may or may not correspond to a specific `events` row). This is already how it works — there's no foreign key between the two tables.

**What Phase 6 MUST deliver:**
1. `/(app)/events/` route: list of all events (not just scheduled, not just public) for authenticated users — shows `completed` and `cancelled` too
2. `/(app)/events/new/` route: form for NCO+ to create a new event (writes to `events` table)
3. `/(app)/events/[id]/edit/` route: form for NCO+ to edit/cancel an event (writes to `events` table)
4. `/(app)/operations/` route: list of operations (internal) for NCO+ to manage
5. `/(app)/operations/new/` route: form to create an operation (writes to `operations` table)
6. `/(app)/operations/[id]/` route: attendance recording form (writes to `operation_attendance`)
7. `/(app)/dashboard/` route: replace placeholder with live metrics

### Existing RLS Gaps for Phase 6

**`events` table** — current RLS from Phase 2:
```sql
"Anon can read scheduled events"           -- SELECT for anon, status='scheduled'
"Authenticated can read events"            -- SELECT for authenticated, all
"NCO and above can create events"          -- INSERT for NCO+
-- MISSING: UPDATE policy (needed for EVNT-02: edit/cancel)
-- MISSING: DELETE policy (not required — use status='cancelled' instead)
```

Phase 6 migration must add:
```sql
-- NCO+ can UPDATE events (to edit title/description or set status=cancelled)
CREATE POLICY "NCO and above can update events"
  ON public.events FOR UPDATE TO authenticated
  USING (
    (SELECT (auth.jwt() ->> 'user_role')::public.app_role)
      IN ('nco', 'command', 'admin')
  )
  WITH CHECK (
    (SELECT (auth.jwt() ->> 'user_role')::public.app_role)
      IN ('nco', 'command', 'admin')
  );
```

**`operations` table** — current RLS from Phase 3:
```sql
"Authenticated can read completed operations"   -- SELECT for authenticated, status='completed'
"NCO and above can manage operations"           -- ALL (SELECT+INSERT+UPDATE+DELETE) for NCO+
```

The `"NCO and above can manage operations"` ALL policy already covers INSERT and UPDATE for creating and editing operations. No new RLS needed on `operations`.

**`operation_attendance` table** — current RLS from Phase 3 + fix:
```sql
"Members can read own attendance"        -- SELECT own records
"NCO and above can read all attendance"  -- SELECT all for NCO+
"NCO and above can manage attendance"    -- ALL for NCO+
"Authenticated can read all attendance"  -- Added in phase3_attendance_rls_fix.sql
```

No new RLS needed on `operation_attendance`.

### service_records `action_type` Check Constraint

Current constraint (from Phase 1 initial_schema):
```sql
action_type CHECK (action_type IN (
  'rank_change', 'award', 'qualification',
  'transfer', 'status_change', 'enlistment', 'note'
))
```

**EVNT-05 requires attendance records to "link to the soldier's service record and update their profile stats."** Looking at how attendance stats work: the soldier profile page queries `operation_attendance` directly (not `service_records`) for combat record and stats. The current architecture does NOT write to `service_records` for attendance — it reads from `operation_attendance` directly.

**Decision:** Do NOT add an 'attendance' action_type to service_records. The existing architecture is:
- Attendance stats = count queries on `operation_attendance` (already working on soldier profile)
- Combat record = join of `operation_attendance` + `operations` (already working)

The phrase "links to the soldier's service record" in the requirement means "is reflected in the soldier's profile" — which already works via the direct `operation_attendance` queries. No service_records schema change needed.

### Dashboard Data Sources (All Existing Tables)

All ADMN dashboard metrics come from existing tables with no schema changes:

| Metric | Table | Query |
|--------|-------|-------|
| Total member count | `soldiers` | `count() WHERE status IN ('active','loa','awol')` |
| Pending application count | `enlistments` | `count() WHERE status NOT IN ('accepted','rejected')` |
| Active vs LOA vs AWOL | `soldiers` | Group by `status`, count each |
| Recent personnel actions | `service_records` | Last 10 ordered by `occurred_at DESC` |
| Attendance trends | `operation_attendance` | Count present/excused/absent per last N operations |

---

## Standard Stack

No new libraries required. Phase 6 uses only what is already installed.

### Core (All Already Installed)

| Library | Version | Purpose | Phase 6 Use |
|---------|---------|---------|-------------|
| SvelteKit | ^2.50.2 | Full-stack framework | New routes: `/(app)/events/`, `/(app)/operations/`, expanded `/(app)/dashboard/` |
| Svelte | ^5.49.2 | UI with runes | `$state()` for filter/tab state, `$derived()` for computed metrics |
| @supabase/supabase-js | ^2.95.3 | DB client | count queries, multi-table joins, INSERT/UPDATE on events+operations |
| @supabase/ssr | ^0.8.0 | Server client | Already in hooks.server.ts |
| sveltekit-superforms | ^2.29.1 | Form handling | Event create/edit forms, operation create form, attendance bulk-record form |
| zod | ^4.3.6 | Schema validation | Event/operation/attendance Zod schemas (use `zod4` adapter) |
| tailwindcss | ^4.1.18 | Styling | Existing custom color tokens |

**No new npm installs required for Phase 6.**

---

## Architecture Patterns

### Recommended Project Structure for Phase 6

```
src/
├── routes/
│   └── (app)/
│       ├── dashboard/
│       │   └── +page.svelte         # REPLACE: placeholder → live metrics dashboard
│       │   └── +page.server.ts      # NEW: parallel metric queries
│       ├── events/
│       │   ├── +page.server.ts      # NEW: list all events (authenticated sees all statuses)
│       │   ├── +page.svelte         # NEW: event list with create button for NCO+
│       │   └── new/
│       │       ├── +page.server.ts  # NEW: load form + createEvent action
│       │       └── +page.svelte     # NEW: event creation form
│       │   └── [id]/
│       │       └── edit/
│       │           ├── +page.server.ts  # NEW: load event + editEvent/cancelEvent actions
│       │           └── +page.svelte     # NEW: event edit form
│       └── operations/
│           ├── +page.server.ts      # NEW: list operations (NCO+ only)
│           ├── +page.svelte         # NEW: operations list with create button
│           └── new/
│               ├── +page.server.ts  # NEW: load form + createOperation action
│               └── +page.svelte     # NEW: operation creation form
│           └── [id]/
│               ├── +page.server.ts  # NEW: load operation + attendance + recordAttendance action
│               └── +page.svelte     # NEW: operation detail + bulk attendance form
├── lib/
│   └── schemas/
│       ├── createEvent.ts           # NEW: Zod schema for event creation
│       ├── editEvent.ts             # NEW: Zod schema for event edit
│       ├── createOperation.ts       # NEW: Zod schema for operation creation
│       └── recordAttendance.ts      # NEW: Zod schema for attendance bulk-record
supabase/
└── migrations/
    └── 20260211000008_phase6_events_attendance_dashboard.sql  # NEW: adds NCO+ UPDATE on events
```

### Pattern 1: Parallel Dashboard Queries in `load`

**What:** The dashboard needs 5+ independent metrics. Fetch them in parallel using `Promise.all` to avoid waterfall latency.

**When to use:** Any `load` function that makes multiple independent queries.

**Example:**
```typescript
// Source: SvelteKit docs pattern + established project conventions
// src/routes/(app)/dashboard/+page.server.ts

export const load: PageServerLoad = async ({ locals: { supabase, getClaims } }) => {
  const claims = await getClaims()
  const userRole = (claims?.['user_role'] as string) ?? null

  if (!hasRole(userRole, 'command')) {
    redirect(303, '/dashboard')
  }

  // Fire all queries in parallel — do not await sequentially
  const [
    { count: activeCount },
    { count: loaCount },
    { count: awolCount },
    { count: pendingAppsCount },
    { data: recentActions },
    { data: recentOps },
  ] = await Promise.all([
    supabase.from('soldiers').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('soldiers').select('*', { count: 'exact', head: true }).eq('status', 'loa'),
    supabase.from('soldiers').select('*', { count: 'exact', head: true }).eq('status', 'awol'),
    supabase.from('enlistments').select('*', { count: 'exact', head: true })
      .not('status', 'in', '("accepted","rejected")'),
    supabase.from('service_records')
      .select('id, action_type, payload, occurred_at, soldiers ( display_name )')
      .order('occurred_at', { ascending: false })
      .limit(10),
    supabase.from('operations')
      .select('id, title, operation_date, operation_type, status')
      .order('operation_date', { ascending: false })
      .limit(5),
  ])

  return {
    metrics: {
      activeCount: activeCount ?? 0,
      loaCount: loaCount ?? 0,
      awolCount: awolCount ?? 0,
      pendingAppsCount: pendingAppsCount ?? 0,
    },
    recentActions: recentActions ?? [],
    recentOps: recentOps ?? [],
    userRole,
  }
}
```

### Pattern 2: Event Create/Edit Forms (Standard Superforms Pattern)

**What:** NCO+ creates/edits events via SvelteKit form actions with superforms + Zod validation.

**Note on `event_date` handling:** HTML `<input type="datetime-local">` returns a string like `"2026-03-15T19:00"` (no timezone). Store as `timestamptz` in Postgres. The Zod schema should accept ISO datetime strings. In the form action, pass the value directly to Supabase — Postgres parses ISO datetime strings.

```typescript
// src/lib/schemas/createEvent.ts
import { z } from 'zod'

const EVENT_TYPES = ['operation', 'training', 'ftx'] as const

export const createEventSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  description: z.string().max(2000).optional(),
  event_date: z.string().min(1, 'Date is required'),  // ISO string from datetime-local input
  event_type: z.enum(EVENT_TYPES, { error: 'Select event type' }),
})
```

```typescript
// src/lib/schemas/editEvent.ts
import { z } from 'zod'

const EVENT_STATUSES = ['scheduled', 'completed', 'cancelled'] as const
const EVENT_TYPES = ['operation', 'training', 'ftx'] as const

export const editEventSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(2000).optional(),
  event_date: z.string().min(1),
  event_type: z.enum(EVENT_TYPES),
  status: z.enum(EVENT_STATUSES),
})
```

### Pattern 3: Operation CRUD

**What:** Operations are internal records for attendance tracking. They have the same fields as events but different lifecycle (created when ready to record attendance for a past or present operation).

```typescript
// src/lib/schemas/createOperation.ts
import { z } from 'zod'

const OPERATION_TYPES = ['operation', 'training', 'ftx'] as const
const OPERATION_STATUSES = ['scheduled', 'completed', 'cancelled'] as const

export const createOperationSchema = z.object({
  title: z.string().min(3, 'Title required').max(200),
  operation_date: z.string().min(1, 'Date required'),
  operation_type: z.enum(OPERATION_TYPES, { error: 'Select type' }),
  status: z.enum(OPERATION_STATUSES).default('completed'),
  description: z.string().max(2000).optional(),
})
```

### Pattern 4: Bulk Attendance Recording

**What:** NCO views an operation detail page and records attendance for all soldiers in a single form submission. Uses a repeating form field pattern (multiple soldier rows, each with a status select).

**Key constraint:** `operation_attendance` has a `UNIQUE (soldier_id, operation_id)` constraint. The form action must use upsert (`insert(...).upsert()`) or check for existing records.

```typescript
// src/lib/schemas/recordAttendance.ts
import { z } from 'zod'

const ATTENDANCE_STATUSES = ['present', 'excused', 'absent'] as const

// Each entry is one soldier's attendance record
const attendanceEntrySchema = z.object({
  soldier_id: z.string().uuid(),
  status: z.enum(ATTENDANCE_STATUSES),
  role_held: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
})

export const recordAttendanceSchema = z.object({
  entries: z.array(attendanceEntrySchema).min(1, 'At least one entry required'),
})
```

**Upsert pattern for attendance (handles re-recording):**
```typescript
// In the recordAttendance action:
const entries = form.data.entries.map(e => ({
  soldier_id: e.soldier_id,
  operation_id: params.id,
  status: e.status,
  role_held: e.role_held ?? null,
  notes: e.notes ?? null,
  recorded_by: claims?.sub as string,
}))

const { error } = await supabase
  .from('operation_attendance')
  .upsert(entries, { onConflict: 'soldier_id,operation_id' })

if (error) {
  console.error('Attendance upsert error:', error)
  return message(form, 'Failed to record attendance', { status: 500 })
}
```

### Pattern 5: Service Records Feed on Dashboard (ADMN-02)

**What:** Display the 10 most recent personnel actions from `service_records`, joined to soldier name.

**Note:** The `service_records` table join to `soldiers` is via `soldier_id`. Fetching the performer name requires either joining to `soldiers` by `performed_by → auth.users.id → soldiers.user_id` (a multi-step join) or storing `performed_by_name` in the payload (which the project already does). Use the payload's `performed_by_name` field — it's already there.

```typescript
// Dashboard recent actions query
const { data: recentActions } = await supabase
  .from('service_records')
  .select(`
    id,
    action_type,
    payload,
    occurred_at,
    soldiers ( id, display_name )
  `)
  .order('occurred_at', { ascending: false })
  .limit(10)

// Normalize FK join
const actions = (recentActions ?? []).map(r => {
  const soldier = Array.isArray(r.soldiers) ? r.soldiers[0] : r.soldiers
  return {
    id: r.id,
    action_type: r.action_type,
    payload: r.payload as Record<string, unknown>,
    occurred_at: r.occurred_at,
    soldier_name: soldier?.display_name ?? 'Unknown',
    soldier_id: soldier?.id ?? null,
  }
})
```

### Pattern 6: Internal Events List (EVNT-04 Internal View)

**What:** The authenticated events list shows ALL events (scheduled, completed, cancelled) — unlike the public page which only shows scheduled. Load from `events` table without status filter.

```typescript
// src/routes/(app)/events/+page.server.ts
export const load: PageServerLoad = async ({ locals: { supabase, getClaims } }) => {
  const claims = await getClaims()
  const userRole = (claims?.['user_role'] as string) ?? null

  const { data: events } = await supabase
    .from('events')
    .select('id, title, description, event_date, event_type, status, created_at')
    .order('event_date', { ascending: false })  // most recent first for internal view

  return { events: events ?? [], userRole }
}
```

### Anti-Patterns to Avoid

- **Conflating `events` and `operations` tables:** They serve different purposes. Creating an event record automatically does NOT create an operation record. NCO must separately create an operation when ready to track attendance.
- **Sequential queries in dashboard load:** Don't chain `await` calls one after another — use `Promise.all`. With 5-6 queries, sequential awaits add hundreds of ms of latency.
- **Using INSERT instead of UPSERT for attendance:** The `UNIQUE (soldier_id, operation_id)` constraint will cause a duplicate key error if NCO records attendance twice. Always upsert.
- **Storing `event_date` from datetime-local as local time without UTC consideration:** `datetime-local` returns local browser time with no timezone. Supabase stores `timestamptz`. The value passes through as-is and Postgres treats it as the server's local time (UTC on Supabase). For a milsim unit, all times should be entered as Zulu (UTC) — document this in the UI with a "Z" suffix reminder.
- **Showing all soldiers in the attendance form including discharged/retired:** The attendance form should only list `status IN ('active', 'loa')` soldiers — plus those already marked absent who are now AWOL might still warrant tracking. Use `status NOT IN ('discharged', 'retired', 'inactive')`.
- **Dashboard accessible to members:** ADMN-01 through ADMN-03 are Command/Admin-only. The layout already passes `userRole` to every page. Gate the dashboard load with `hasRole(userRole, 'command')` redirect.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Parallel async queries | Sequential `await` chain | `Promise.all([...])` | SvelteKit `load` is async; parallel saves N×latency |
| Attendance upsert | Check-then-insert logic | Supabase `.upsert()` with `onConflict` | Handles race conditions; one round-trip |
| Bulk form with N soldier rows | Custom form serialization | Superforms array field pattern | Zod `z.array()` schema + superforms handles multi-row forms |
| Metric counts | Fetching all rows and counting in JS | Supabase `select('*', { count: 'exact', head: true })` | DB-level count; no data transfer; standard Supabase pattern |
| Date formatting for military time | Custom formatter | Same UTC-based `formatDate()` already in site events page | Copy the `formatDate()` function from `(site)/events/+page.svelte` into a `$lib/utils/date.ts` shared utility |
| Status badge components | One-off per-page badge logic | Extract to `$lib/components/StatusBadge.svelte` | Already duplicated across site and app; worth extracting |

---

## Common Pitfalls

### Pitfall 1: Forgetting the UPDATE RLS Policy on `events`

**What goes wrong:** NCO creates an event successfully (INSERT works) but when they try to edit or cancel it, the UPDATE silently fails or returns a 403 — the event doesn't change.

**Why it happens:** Phase 2 migration only created INSERT and SELECT policies for `events`. No UPDATE policy exists. With RLS enabled and no UPDATE policy, all UPDATEs are denied.

**How to avoid:** The Phase 6 migration must add the NCO+ UPDATE policy on `events` before any edit functionality is implemented.

**Warning signs:** Supabase UPDATE returns `{ data: [], error: null }` (0 rows affected) instead of an error, because RLS silently blocks it.

### Pitfall 2: Superforms with Array Fields (Bulk Attendance)

**What goes wrong:** A form submitting multiple attendance rows (one per soldier) doesn't work with standard superforms because the form data doesn't serialize as an array automatically.

**Why it happens:** HTML forms submit `entries[0][soldier_id]`, `entries[0][status]`, etc. Superforms handles array fields but requires the schema to use `z.array()` and the form to be submitted with `use:enhance`.

**How to avoid:** Use `z.array(entrySchema)` in the Zod schema. In the Svelte component, use `{#each}` over the form's array state. Superforms v2 with `zod4` adapter supports array fields natively.

**Alternative approach:** Instead of a single bulk form, submit one attendance entry at a time via individual forms per soldier row with `use:enhance` for progressive enhancement. Simpler implementation, slower for large rosters (50+ soldiers). For a milsim unit (typically 10-30 active), either approach works.

**Recommendation:** Use per-row individual forms (simpler, no array Zod complexity) unless the roster size makes it impractical.

### Pitfall 3: Dashboard Load Too Slow (Sequential Queries)

**What goes wrong:** The dashboard takes 2-3 seconds to load because 5 Supabase queries run sequentially.

**Why it happens:** Writing `const a = await supabase.from('soldiers')...` followed by `const b = await supabase.from('enlistments')...` runs queries one-at-a-time. Each query has ~50-100ms latency.

**How to avoid:** Wrap all independent queries in `Promise.all([...])`. SvelteKit `load` functions support top-level `await Promise.all`.

**Warning signs:** Network tab shows requests starting after previous ones complete rather than in parallel.

### Pitfall 4: `operations` Table `"Authenticated can read completed operations"` RLS Blocks Scheduled Ops

**What goes wrong:** NCO creates an operation with `status = 'scheduled'`, then goes to the operations list page and doesn't see it — even though they just created it.

**Why it happens:** The Phase 3 RLS policy `"Authenticated can read completed operations"` has `USING (status = 'completed')`. Scheduled operations are invisible to `authenticated` role (only NCO+ can see all via the ALL policy).

**How to avoid:** The `"NCO and above can manage operations"` ALL policy already includes SELECT for NCO+. So NCO CAN see scheduled operations. However, plain `member` role users cannot see scheduled operations — only completed ones. This is correct behavior for milsim security. No fix needed, but the operations list page should be NCO+ only (redirect members away).

**Also:** The `operations` page in the `(app)` route group must redirect non-NCO users to `/dashboard` with `if (!hasRole(userRole, 'nco')) redirect(303, '/dashboard')`.

### Pitfall 5: FK Normalization in Dashboard Queries

**What goes wrong:** The dashboard query `service_records.select('..., soldiers ( display_name )')` returns soldiers as an array (`[{display_name: 'Doe'}]`) instead of an object due to Supabase TypeScript type inference treating FK joins as arrays.

**Why it happens:** Supabase JS returns FK joins as arrays in the TypeScript types even when logically they're a single row. This is the established codebase pattern — every FK join is normalized with `Array.isArray(x) ? x[0] : x`.

**How to avoid:** Apply the established normalization pattern from the soldiers profile page:
```typescript
const soldier = Array.isArray(r.soldiers) ? r.soldiers[0] : r.soldiers
```

### Pitfall 6: Attendance Form Shows Full Roster Including Discharged Soldiers

**What goes wrong:** The attendance recording form lists 50 soldiers including 20 who are discharged. NCO must scroll past inactive soldiers to find active ones.

**Why it happens:** Fetching all soldiers without a status filter.

**How to avoid:** When loading the operation detail page for attendance recording, filter soldiers:
```typescript
const { data: soldiers } = await supabase
  .from('soldiers')
  .select('id, display_name, callsign, status, ranks(abbreviation)')
  .not('status', 'in', '("discharged","retired","inactive")')
  .order('display_name')
```

### Pitfall 7: Navigation Links Not Updated in App Layout

**What goes wrong:** The new routes exist but users have no way to navigate to them because the `(app)` layout nav doesn't have links.

**Why it happens:** The layout at `src/routes/(app)/+layout.svelte` must be updated to add "Events" and "Operations" (or combined "Events" with sub-navigation) links.

**How to avoid:** Include layout nav update as an explicit task in the plan. The current nav: Dashboard, Roster, My Profile, Enlistments (NCO+). Phase 6 adds: Events (all authenticated), Operations (NCO+).

---

## Code Examples

### Dashboard Page Server Load (Parallel Queries)

```typescript
// Source: SvelteKit async load + Supabase count pattern
// src/routes/(app)/dashboard/+page.server.ts

import { redirect } from '@sveltejs/kit'
import { hasRole } from '$lib/auth/roles'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals: { supabase, getClaims } }) => {
  const claims = await getClaims()
  const userRole = (claims?.['user_role'] as string) ?? null

  if (!hasRole(userRole, 'command')) {
    // Members and NCO see a simplified dashboard — or redirect; planner decides scope
    // For now, show basic info to all authenticated, metrics to command+
  }

  const [
    { count: activeCount },
    { count: loaCount },
    { count: awolCount },
    { count: pendingAppsCount },
    { data: rawRecentActions },
    { data: recentOps },
  ] = await Promise.all([
    supabase.from('soldiers').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('soldiers').select('*', { count: 'exact', head: true }).eq('status', 'loa'),
    supabase.from('soldiers').select('*', { count: 'exact', head: true }).eq('status', 'awol'),
    supabase.from('enlistments').select('*', { count: 'exact', head: true })
      .not('status', 'in', '("accepted","rejected")'),
    supabase.from('service_records')
      .select('id, action_type, payload, occurred_at, soldiers ( id, display_name )')
      .order('occurred_at', { ascending: false })
      .limit(10),
    supabase.from('operations')
      .select('id, title, operation_date, operation_type, status')
      .order('operation_date', { ascending: false })
      .limit(5),
  ])

  // Normalize FK join on service_records → soldiers
  const recentActions = (rawRecentActions ?? []).map(r => {
    const soldier = Array.isArray(r.soldiers) ? r.soldiers[0] : r.soldiers
    return {
      id: r.id,
      action_type: r.action_type as string,
      payload: r.payload as Record<string, unknown>,
      occurred_at: r.occurred_at,
      soldier_name: soldier?.display_name ?? 'Unknown',
      soldier_id: soldier?.id ?? null,
    }
  })

  return {
    metrics: {
      activeCount: activeCount ?? 0,
      loaCount: loaCount ?? 0,
      awolCount: awolCount ?? 0,
      pendingAppsCount: pendingAppsCount ?? 0,
    },
    recentActions,
    recentOps: recentOps ?? [],
    userRole,
  }
}
```

### Event Create Form Action

```typescript
// Source: Established project form action pattern (Phase 4/5)
// src/routes/(app)/events/new/+page.server.ts

import { fail, redirect } from '@sveltejs/kit'
import { superValidate, message } from 'sveltekit-superforms'
import { zod4 } from 'sveltekit-superforms/adapters'
import { hasRole } from '$lib/auth/roles'
import { createEventSchema } from '$lib/schemas/createEvent'
import type { PageServerLoad, Actions } from './$types'

export const load: PageServerLoad = async ({ locals: { getClaims } }) => {
  const claims = await getClaims()
  const userRole = (claims?.['user_role'] as string) ?? null

  if (!hasRole(userRole, 'nco')) {
    redirect(303, '/events')
  }

  const form = await superValidate(zod4(createEventSchema))
  return { form }
}

export const actions: Actions = {
  default: async ({ request, locals: { supabase, getClaims } }) => {
    const claims = await getClaims()
    const userRole = (claims?.['user_role'] as string) ?? null

    if (!hasRole(userRole, 'nco')) {
      return fail(403, { message: 'NCO or higher required' })
    }

    const form = await superValidate(request, zod4(createEventSchema))
    if (!form.valid) return fail(400, { form })

    const { title, description, event_date, event_type } = form.data

    const { error } = await supabase.from('events').insert({
      title,
      description: description ?? null,
      event_date,
      event_type,
      status: 'scheduled',
      created_by: claims?.sub as string,
    })

    if (error) {
      console.error('Event insert error:', error)
      return message(form, 'Failed to create event', { status: 500 })
    }

    redirect(303, '/events')
  },
}
```

### Attendance Upsert (Per-Row Form Pattern)

```typescript
// Per-row individual form action — simpler than bulk array form
// src/routes/(app)/operations/[id]/+page.server.ts (attendance action)

recordAttendance: async ({ params, request, locals: { supabase, getClaims } }) => {
  const claims = await getClaims()
  const userRole = (claims?.['user_role'] as string) ?? null

  if (!hasRole(userRole, 'nco')) {
    return fail(403, { message: 'NCO or higher required' })
  }

  const form = await superValidate(request, zod4(recordAttendanceSchema))
  if (!form.valid) return fail(400, { form })

  const { soldier_id, status, role_held, notes } = form.data

  const { error } = await supabase
    .from('operation_attendance')
    .upsert(
      {
        soldier_id,
        operation_id: params.id,
        status,
        role_held: role_held ?? null,
        notes: notes ?? null,
        recorded_by: claims?.sub as string,
      },
      { onConflict: 'soldier_id,operation_id' }
    )

  if (error) {
    console.error('Attendance upsert error:', error)
    return message(form, 'Failed to record attendance', { status: 500 })
  }

  return message(form, `Attendance recorded`)
},
```

### Migration SQL (Phase 6)

```sql
-- 20260211000008_phase6_events_attendance_dashboard.sql

-- Add NCO+ UPDATE policy on events table (needed for EVNT-02 edit/cancel)
-- No INSERT or DELETE policies needed — INSERT already exists from Phase 2,
-- DELETE is replaced by setting status='cancelled'
CREATE POLICY "NCO and above can update events"
  ON public.events FOR UPDATE TO authenticated
  USING (
    (SELECT (auth.jwt() ->> 'user_role')::public.app_role)
      IN ('nco', 'command', 'admin')
  )
  WITH CHECK (
    (SELECT (auth.jwt() ->> 'user_role')::public.app_role)
      IN ('nco', 'command', 'admin')
  );

-- No other schema changes needed for Phase 6:
-- - operations: existing ALL policy covers INSERT/UPDATE for NCO+
-- - operation_attendance: existing manage policy covers upsert for NCO+
-- - service_records: no new action_type needed (attendance is not a service record event)
-- - No new tables required
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Sequential load queries | `Promise.all` parallel queries | Always best practice | Required for dashboard performance |
| Custom count JS | Supabase `head: true, count: 'exact'` | Always available | Zero data transfer for counts |
| Separate INSERT + check for upsert | `.upsert()` with `onConflict` | Supabase JS v2 | One round-trip; race-condition safe |
| Svelte 4 `$:` reactive | Svelte 5 `$derived()` | Svelte 5.0 (Oct 2024) | Use runes exclusively |
| `zod` adapter | `zod4` adapter in superforms | Established in Phase 3 | Use `zod4` — matches installed Zod v4 |
| Custom date formatters | `formatDate()` util from site events page | This project | Extract to `$lib/utils/date.ts` |

**Deprecated/outdated:**
- `import { enhance } from '$app/forms'`: Still current SvelteKit 2 — NOT deprecated. Required for progressive enhancement on all forms.

---

## Open Questions

1. **Dashboard Access Level: Command-only or All Authenticated?**
   - What we know: ADMN-01 says "Admin/Command can view dashboard." The current dashboard is a placeholder accessible to all authenticated users.
   - What's unclear: Should NCO and member roles see a reduced dashboard (e.g., just upcoming events) or be redirected away entirely?
   - Recommendation: Show a simplified view to all authenticated (upcoming events + basic stats). Show full metrics (personnel counts, pending apps, attendance trends, recent actions feed) to Command+. This is a UX decision the planner should flag as a sub-task.

2. **Attendance Trends Visualization: Chart or Table?**
   - What we know: ADMN-01 mentions "attendance trends." No charting library is installed.
   - What's unclear: Whether "trends" means a simple table (last 5 ops with % attendance) or a visual chart.
   - Recommendation: Use a simple HTML/CSS table or bar visualization built with Tailwind classes — no chart library. A table showing `[Operation Name | Date | Present | Excused | Absent | %]` for the last 10 operations is sufficient and requires no new dependencies.
   - Confidence: HIGH — the complexity of adding Chart.js or similar is not justified for a milsim unit admin dashboard at this project scale.

3. **Attendance Form UX: Bulk Submit or Per-Row?**
   - What we know: Two approaches are viable — bulk array Zod form or individual per-soldier forms.
   - What's unclear: Which is better for a roster of 10-30 soldiers.
   - Recommendation: Use per-row individual forms with `use:enhance`. Each row is a mini-form with soldier name, status select, and optional notes. NCO clicks the status for each soldier — optimistic updates via `use:enhance`. Simpler than bulk array schema, works well for small rosters. Planner should specify this approach.

4. **`events` vs `operations` NCO Workflow Clarity**
   - What we know: Two separate tables serve different purposes; no FK link between them.
   - What's unclear: Whether Phase 6 should add a `linked_event_id` FK from `operations` to `events` to tie a completed operation back to its original scheduled event.
   - Recommendation: Skip the FK link for Phase 6. The two tables remain independent. If an NCO wants to track attendance for a past operation, they create an `operations` record directly. The overhead of maintaining the link is not worth it for Phase 6 scope.

---

## Sources

### Primary (HIGH confidence)

- Codebase: `/supabase/migrations/20260211000000_initial_schema.sql` — soldiers, service_records, app_role enum
- Codebase: `/supabase/migrations/20260211000001_rls_policies.sql` — confirmed ALL existing RLS policies
- Codebase: `/supabase/migrations/20260211000003_phase2_public_site.sql` — events table schema + all existing events policies
- Codebase: `/supabase/migrations/20260211000004_phase3_profiles.sql` — operations + operation_attendance schemas + all RLS policies
- Codebase: `/supabase/migrations/20260211000005_phase3_attendance_rls_fix.sql` — confirmed "Authenticated can read all attendance" policy
- Codebase: `/src/routes/(app)/soldiers/[id]/+page.server.ts` — confirmed attendance stats query patterns, dual-write pattern, `getClaims()` usage
- Codebase: `/src/routes/(site)/events/+page.server.ts` — confirmed events table query pattern
- Codebase: `/src/routes/(site)/events/+page.svelte` — `formatDate()` utility for reuse
- Codebase: `/src/routes/(app)/dashboard/+page.svelte` — confirmed it's a placeholder (no server load)
- Codebase: `/src/routes/(app)/+layout.svelte` — confirmed current nav links
- Codebase: `/src/routes/(app)/+layout.server.ts` — confirmed `getClaims()` pattern
- Codebase: `/src/routes/(app)/roster/+page.server.ts` — confirmed FK normalization pattern
- Codebase: `/src/lib/auth/roles.ts` — confirmed role hierarchy and `hasRole()` signature
- Codebase: `/src/app.d.ts` — confirmed `locals.getClaims()` return type
- Codebase: `/package.json` — confirmed installed versions (sveltekit-superforms 2.29.1, zod 4.3.6)
- Phase 5 RESEARCH.md — confirmed `zod4` adapter requirement, dual-write pattern, non-fatal secondary write

### Secondary (MEDIUM confidence)

- Supabase Docs: `.upsert()` with `onConflict` — standard Supabase upsert pattern for conflict handling
- SvelteKit Docs: `Promise.all` in `load` functions — standard parallel query pattern

### Tertiary (LOW confidence)

- None — all findings verified against source files

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified in package.json; no new packages
- Schema findings: HIGH — verified directly against all migration SQL files
- RLS gap (events UPDATE): HIGH — confirmed absence by reading Phase 2 migration
- Architecture patterns: HIGH — direct extension of Phase 3/4/5 established patterns
- Dashboard query patterns: HIGH — Supabase count + Promise.all are standard, verified
- Attendance upsert: HIGH — Supabase `.upsert()` with `onConflict` is documented
- Pitfalls: HIGH — derived from actual code inspection, not speculation

**Research date:** 2026-02-11
**Valid until:** 2026-03-13 (30 days — stable foundation, no fast-moving libraries in scope)
