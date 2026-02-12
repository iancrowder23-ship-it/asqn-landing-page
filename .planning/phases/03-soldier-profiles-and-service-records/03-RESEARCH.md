# Phase 3: Soldier Profiles and Service Records - Research

**Researched:** 2026-02-11
**Domain:** SvelteKit dynamic routes, Supabase joins with foreign keys, Svelte 5 runes, RLS policies for profile access, append-only service record display
**Confidence:** HIGH (all findings verified against migrations, existing source files, and official SvelteKit docs)

---

## Summary

Phase 3 builds member-facing profile pages within the existing `(app)` auth-gated route group. It adds a dynamic route `/(app)/soldiers/[id]` that any authenticated soldier can visit to see their own or another member's profile. The profile page displays rank with insignia, callsign, MOS, status, unit assignment, a chronological service record, and attendance/combat stats.

The most important finding is a schema gap: the `operation_attendance` and `operations` tables referenced by requirements SRVC-03 and SRVC-05 do NOT exist in the current database. The Phase 1 and Phase 2 migrations only created `ranks`, `units`, `soldiers`, `service_records`, `user_roles`, `enlistments`, and `events`. The `database.ts` type file contains many additional tables (e.g., `operation_attendance`, `operations`, `member_awards`) from the legacy project — those are type stubs only, NOT live tables. Phase 3 must create a new migration for `operations` and `operation_attendance` before the attendance stats and combat record features can work.

The `service_records.performed_by` column references `auth.users(id)`, not `soldiers.id`. To display the "performed by" name, Phase 3 needs to either join through `soldiers` via `user_id` or store a display snapshot in the `payload` JSONB. The join approach is cleanest and consistent with existing patterns.

**Primary recommendation:** Build in plan order: (1) migration + RLS for new tables, (2) profile page with rank/callsign/status/unit, (3) service record component, (4) attendance stats component. Each plan is independently deployable.

---

## Critical Schema Findings

### What EXISTS in the Database (Phase 1 + Phase 2 Migrations)

| Table | Columns relevant to Phase 3 |
|-------|----------------------------|
| `soldiers` | `id`, `user_id`, `display_name`, `callsign`, `mos`, `status`, `rank_id`, `unit_id`, `joined_at` |
| `ranks` | `id`, `name`, `abbreviation`, `sort_order`, `insignia_url` |
| `units` | `id`, `name`, `abbreviation`, `parent_unit_id` |
| `service_records` | `id`, `soldier_id`, `action_type`, `payload`, `performed_by`, `visibility`, `occurred_at` |
| `user_roles` | `user_id`, `role` |
| `events` | `id`, `title`, `event_date`, `event_type`, `status` |

**NOTE:** `ranks` has `sort_order` not `grade`. The phase context mentioned `grade` — this column does NOT exist in the migration.

### What DOES NOT EXIST (Legacy Stubs in database.ts Only)

The following tables appear in `src/lib/types/database.ts` but were NEVER created by a migration. Do not query them:

- `operations` — needs to be created in Phase 3 migration
- `operation_attendance` — needs to be created in Phase 3 migration
- `member_awards` — out of scope for Phase 3
- `qualifications` / `member_qualifications` — out of scope for Phase 3
- `promotion_requirements` — out of scope for Phase 3
- `profiles` — this is the old schema's profile table; it does NOT exist

### service_records Actual Columns (from Migration)

```
id            uuid
soldier_id    uuid (FK → soldiers.id)
action_type   text CHECK IN ('rank_change','award','qualification','transfer','status_change','enlistment','note')
payload       jsonb NOT NULL DEFAULT '{}'
performed_by  uuid (FK → auth.users.id) — NOT soldiers.id
visibility    text CHECK IN ('public','leadership_only')
occurred_at   timestamptz
```

**No `title`, `description`, `metadata`, or `record_type` columns.** The additional context description differs from the actual migration. Trust the migration.

### New Tables Needed for Phase 3

Phase 3 must create these in a new migration:

```sql
-- operations: the events that generate attendance records
-- (separate from public `events` table which is for scheduling)
create table public.operations (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  operation_date timestamptz not null,
  operation_type text not null check (operation_type in ('operation', 'training', 'ftx')),
  status         text not null default 'completed'
                   check (status in ('scheduled', 'completed', 'cancelled')),
  description    text,
  created_by     uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now()
);
alter table public.operations enable row level security;

-- operation_attendance: join table — soldier × operation
create table public.operation_attendance (
  id           uuid primary key default gen_random_uuid(),
  soldier_id   uuid not null references public.soldiers(id) on delete cascade,
  operation_id uuid not null references public.operations(id) on delete cascade,
  status       text not null check (status in ('present', 'excused', 'absent')),
  role_held    text,    -- e.g. 'Team Leader', 'Rifleman'
  notes        text,
  recorded_by  uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  unique (soldier_id, operation_id)
);
alter table public.operation_attendance enable row level security;
```

---

## Standard Stack

No new libraries needed. Phase 3 uses only what is already installed:

### Core (All Already Installed)

| Library | Version | Purpose | Phase 3 Use |
|---------|---------|---------|-------------|
| SvelteKit | ^2.50.2 | Full-stack framework | Dynamic route `/(app)/soldiers/[id]` |
| Svelte | ^5.49.2 | UI with runes | `$props()`, `$derived` for computed stats |
| @supabase/supabase-js | ^2.95.3 | DB queries | Joined profile + service record queries |
| @supabase/ssr | ^0.8.0 | Server client | `event.locals.supabase` (already in hooks) |
| tailwindcss | ^4.1.18 | Styling | Custom theme colors already defined |
| TypeScript | ^5.9.3 | Types | Inline types for joined query results |

**No new npm installs required for Phase 3.**

---

## Architecture Patterns

### Recommended Project Structure for Phase 3

```
src/
├── routes/
│   └── (app)/
│       ├── +layout.server.ts       # Already exists — auth guard + claims
│       └── soldiers/
│           └── [id]/
│               ├── +page.server.ts # Load soldier profile + service records + attendance
│               └── +page.svelte    # Profile display page
├── lib/
│   └── components/
│       ├── ServiceRecordEntry.svelte  # Single service record row component
│       └── AttendanceStats.svelte     # Stats card: op count, %, last active
```

### Pattern 1: SvelteKit Dynamic Route with `[id]` Parameter

**What:** Profile page at `/soldiers/{soldier-id}`. The `id` param is the `soldiers.id` UUID.
**When to use:** Any resource with a unique identifier that needs its own URL.

```typescript
// Source: https://svelte.dev/docs/kit/routing#Advanced-routing-Route-parameters
// src/routes/(app)/soldiers/[id]/+page.server.ts
import { error } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params, locals: { supabase, getClaims } }) => {
  const claims = await getClaims()
  // Note: (app) layout.server.ts already guards auth — claims will always be set here
  // But we need the user's user_id to determine "is this my profile?"
  const viewerUserId = claims?.sub as string | undefined

  const { data: soldier, error: soldierError } = await supabase
    .from('soldiers')
    .select(`
      id,
      display_name,
      callsign,
      mos,
      status,
      joined_at,
      user_id,
      ranks ( id, name, abbreviation, sort_order, insignia_url ),
      units ( id, name, abbreviation )
    `)
    .eq('id', params.id)
    .single()

  if (soldierError || !soldier) {
    error(404, 'Soldier not found')
  }

  return { soldier, isOwnProfile: soldier.user_id === viewerUserId }
}
```

**Important:** `params.id` is a string (the route param). It maps directly to `soldiers.id` UUID — Supabase/PostgREST handles UUID comparison from string automatically.

### Pattern 2: Fetching Service Records with Performer Name

**What:** Service records reference `performed_by` as `auth.users.id`. To display the performer's display name, join through `soldiers` using the `user_id` relationship.

**Problem:** PostgREST cannot join `service_records.performed_by` → `auth.users` → `soldiers.user_id` in a single select (auth schema is not directly queryable by client). Options:

1. **Snapshot approach** (recommended): Store `performed_by_name` in the `payload` JSONB at insert time. Already captures the name even if the soldier later changes their display_name.
2. **Two-query approach**: Fetch service records, collect unique `performed_by` UUIDs, fetch matching soldiers by `user_id`. Requires N+1 mitigation.
3. **DB function approach**: Create a Postgres function that does the join server-side.

**Recommended: Snapshot in payload.** When NCO+ inserts a service record, they include `performed_by_name` in the payload JSON. Phase 3 display reads from `payload->>'performed_by_name'` for the display name, falling back to "Unknown" if missing (for any pre-existing records without the field).

```typescript
// Fetching service records for a soldier profile
const { data: serviceRecords } = await supabase
  .from('service_records')
  .select('id, action_type, payload, performed_by, visibility, occurred_at')
  .eq('soldier_id', params.id)
  .order('occurred_at', { ascending: true })  // chronological — oldest first
```

### Pattern 3: Supabase FK Join Normalization (Established Project Pattern)

The codebase already handles the Supabase FK join type quirk. Follow the existing pattern:

```typescript
// Source: Established in src/routes/(site)/roster/+page.server.ts
// Supabase types FK joins as arrays, but single-FK returns a single object at runtime.
// Always normalize after fetching:
const rank = Array.isArray(soldier.ranks) ? soldier.ranks[0] : soldier.ranks
const unit = Array.isArray(soldier.units) ? soldier.units[0] : soldier.units
```

Or use inline type assertion to avoid the Array.isArray check:

```typescript
// Alternative: inline type cast (used in leadership page)
type SoldierRow = {
  ranks: { name: string; abbreviation: string; sort_order: number; insignia_url: string | null } | null
  units: { name: string; abbreviation: string | null } | null
  // ...
}
const s = soldier as SoldierRow
```

### Pattern 4: Attendance Stats via Aggregate Query

**What:** Count total operations, calculate attendance percentage, find last active date.
**When to use:** Profile page stats section.

```typescript
// Two queries: total ops count + soldier's attendance
const { data: totalOps } = await supabase
  .from('operations')
  .select('id', { count: 'exact' })
  .eq('status', 'completed')

const { data: attendance, count: attendedCount } = await supabase
  .from('operation_attendance')
  .select('operation_id, status, created_at', { count: 'exact' })
  .eq('soldier_id', params.id)
  .eq('status', 'present')
  .order('created_at', { ascending: false })

const lastActiveDate = attendance?.[0]?.created_at ?? null
const attendancePercent = totalOps?.length
  ? Math.round(((attendedCount ?? 0) / totalOps.length) * 100)
  : null
```

### Pattern 5: Status Badge Display

**What:** Visual status indicator using the `soldiers.status` enum values.
**Status values in migration:** `'active' | 'inactive' | 'loa' | 'awol' | 'discharged'`

**Note:** The phase requirements mention `'retired'` as a status, but the Phase 1 migration only has `'active', 'inactive', 'loa', 'awol', 'discharged'`. The `retired` status does not exist in the DB constraint. Phase 3 must either add `'retired'` to the check constraint via migration or use `'discharged'` to cover honorable separations.

```svelte
<!-- Status badge using existing Tailwind custom colors -->
{#snippet statusBadge(status: string)}
  {@const colors = {
    active: 'bg-od-green text-night',
    loa: 'bg-ranger-tan-muted text-night',
    awol: 'bg-alert text-night',
    inactive: 'bg-night-border text-steel',
    discharged: 'bg-night-border text-steel',
  } as const}
  <span class="px-2 py-0.5 rounded text-xs font-bold uppercase {colors[status as keyof typeof colors] ?? 'bg-night-border text-steel'}">
    {status.toUpperCase()}
  </span>
{/snippet}
```

### Anti-Patterns to Avoid

- **Querying `auth.users` directly from client:** The `auth` schema is not accessible via the Supabase JS client RLS layer. Use `soldiers` table joined via `user_id` for display names.
- **Using `supabase.from('profiles'):** A `profiles` table does NOT exist in this project. The `database.ts` type file is legacy. All member data is in `soldiers`.
- **Using `sort_order` as `grade`:** The `ranks` table has `sort_order` not `grade`. Do not use `grade` in queries.
- **Passing soldier UUID as a display identifier in URL:** UUIDs are valid URL params and are already used in this codebase pattern.
- **Calling `getClaims()` again inside a sub-load function:** The `(app)` layout already validates claims. Child `+page.server.ts` load functions receive `locals` with `supabase` — just destructure it.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Service record timeline | Custom date sorting logic | `.order('occurred_at', { ascending: true })` in Supabase query | PostgREST handles ordering server-side; no client-side sort needed |
| "Performed by" display name join | Custom join logic across auth.users | Store `performed_by_name` snapshot in `payload` at insert time | auth.users not directly queryable; snapshot is simpler and survives username changes |
| Attendance percentage calculation | Supabase aggregate function | Two simple count queries + JS division | The operations/attendance tables are simple; avoid over-engineering with DB functions |
| Profile URL from user session | Custom lookup of "my soldier ID" | Query `soldiers` where `user_id = auth.uid()` and redirect | One lightweight query; result can be cached in session layout data |
| Dynamic route type safety | Manual param type casting | SvelteKit `$types` (auto-generated `params.id: string`) | `+page.server.ts` gets typed params from `$types` automatically |

**Key insight:** Phase 3 is purely read-only display. No form actions, no mutations. The complexity is in getting the data shape right for the UI — keep queries straightforward.

---

## RLS Policies Needed for Phase 3

The existing `service_records` policies are:
- `"Authenticated can read public service records"` — `visibility = 'public'` only
- `"NCO and above can read all service records including leadership_only"` — all visibility

Phase 3 adds a new requirement: **a soldier should be able to read their own service records regardless of visibility**. This needs a new policy:

```sql
-- Members can read their own service records (including leadership_only)
create policy "Members can read own service records"
  on public.service_records for select
  to authenticated
  using (
    soldier_id in (
      select id from public.soldiers where user_id = (select auth.uid())
    )
  );
```

**Note:** There is a potential conflict with the existing two policies. PostgreSQL RLS uses OR logic for permissive policies — the most permissive matching policy wins. Adding the above policy is safe because it only expands access (own records), not reduces it.

For the new `operations` and `operation_attendance` tables:

```sql
-- operations: all authenticated can read completed operations
create policy "Authenticated can read completed operations"
  on public.operations for select to authenticated
  using (status = 'completed');

-- operation_attendance: authenticated can read their own attendance
create policy "Members can read own attendance"
  on public.operation_attendance for select to authenticated
  using (
    soldier_id in (
      select id from public.soldiers where user_id = (select auth.uid())
    )
  );

-- operation_attendance: NCO+ can read all attendance records
create policy "NCO and above can read all attendance"
  on public.operation_attendance for select to authenticated
  using (
    (select (auth.jwt() ->> 'user_role')::public.app_role)
      in ('nco', 'command', 'admin')
  );

-- operation_attendance: NCO+ can insert/update attendance records
create policy "NCO and above can manage attendance"
  on public.operation_attendance for all to authenticated
  using (
    (select (auth.jwt() ->> 'user_role')::public.app_role)
      in ('nco', 'command', 'admin')
  );
```

---

## Common Pitfalls

### Pitfall 1: Querying Tables That Don't Exist

**What goes wrong:** Phase 3 code queries `operations`, `operation_attendance`, or any other legacy table from `database.ts` without creating it first. The Supabase client returns no data (or an error) with no type-system warning because `database.ts` has stubs for these tables.

**Why it happens:** The `database.ts` type file was generated from the OLD project schema and contains ~20 tables. The current project only has 7 tables from the Phase 1+2 migrations. TypeScript thinks these tables exist because the type stubs are present.

**How to avoid:** Phase 3 must start with a migration that creates `operations` and `operation_attendance`. Verify with `SELECT tablename FROM pg_tables WHERE schemaname = 'public'` after applying.

**Warning signs:** Query returns `null` data with no error, or Supabase returns `{ data: null, error: { code: '42P01', message: 'relation "..." does not exist' } }`.

### Pitfall 2: soldiers.status Enum Missing 'retired'

**What goes wrong:** Phase requirement PROF-05 mentions "Discharged/Retired" as a status. The DB check constraint is `check (status in ('active', 'inactive', 'loa', 'awol', 'discharged'))`. There is no `'retired'` value. Inserting `status = 'retired'` will fail with a constraint violation.

**Why it happens:** The requirements were written against a planned schema, but the actual migration uses `'discharged'` to cover both discharge and retirement.

**How to avoid:** Either add `'retired'` to the check constraint via migration (`ALTER TABLE soldiers DROP CONSTRAINT IF EXISTS soldiers_status_check; ALTER TABLE soldiers ADD CONSTRAINT soldiers_status_check CHECK (status IN ('active', 'inactive', 'loa', 'awol', 'discharged', 'retired'));`), or display `'discharged'` as "Discharged/Retired" in the UI.

**Recommendation:** Add `'retired'` to the constraint via a Phase 3 migration for semantic clarity.

### Pitfall 3: Duplicate SELECT Policy on service_records

**What goes wrong:** Adding a third SELECT policy to `service_records` creates confusion about which policy governs which query. The two existing policies overlap in a confusing way — the "NCO+" policy covers public records too, making the first policy redundant.

**Why it happens:** Phase 1 RLS policies were written before the self-profile use case was considered.

**How to avoid:** Add the self-profile policy as an additive permissive policy. PostgreSQL's OR logic for permissive policies means a row is visible if ANY matching SELECT policy allows it. No need to modify existing policies.

**Warning signs:** A member can see service records belonging to other soldiers, or cannot see their own `leadership_only` records.

### Pitfall 4: performed_by Name Resolution

**What goes wrong:** `service_records.performed_by` is `auth.users.id` (not `soldiers.id`). Code tries to join `service_records → auth.users → soldiers` to get `display_name`. PostgREST cannot traverse the `auth` schema via the client.

**Why it happens:** The schema uses `auth.users` as the FK target because that's the identity anchor, but `auth.users` is not directly accessible via the PostgREST API.

**How to avoid:** Read `performed_by_name` from `payload->>'performed_by_name'` (populated at insert time). Fall back to "Command" or "System" for records without this field. Document this convention so that when Phase 4+ introduces service record mutation, it always writes `performed_by_name` into the payload.

### Pitfall 5: Svelte 5 Snippet Scope

**What goes wrong:** Defining a `{#snippet}` block inside an `{#each}` loop or conditional, then trying to use it outside that scope.

**Why it happens:** Svelte 5 snippets are lexically scoped — a snippet defined inside a block is only usable within that block.

**How to avoid:** Define reusable snippets at the top of the `<script>` block or as separate `.svelte` component files. For the status badge, define the snippet at component top level.

### Pitfall 6: 404 vs Empty State Confusion

**What goes wrong:** A valid soldier `id` that the current user has no RLS permission to read returns `null` data from Supabase. The page throws a 404 error instead of showing an "access restricted" message.

**Why it happens:** Supabase RLS returns empty results (not errors) for unauthorized reads. The `.single()` call converts empty results to an error.

**How to avoid:** Use `.maybeSingle()` instead of `.single()` when querying a soldier profile. `maybeSingle()` returns `null` data without error if no rows match (whether because the soldier doesn't exist OR because RLS filtered it). Show a unified "profile not found" message for both cases.

```typescript
// Use maybeSingle() — handles both 404 and RLS-filtered empty
const { data: soldier } = await supabase
  .from('soldiers')
  .select(`...`)
  .eq('id', params.id)
  .maybeSingle()

if (!soldier) {
  error(404, 'Soldier not found')
}
```

---

## Code Examples

### Profile Page Load Function (Full Pattern)

```typescript
// Source: Official SvelteKit docs + established project patterns
// src/routes/(app)/soldiers/[id]/+page.server.ts
import { error } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params, locals: { supabase, getClaims } }) => {
  const claims = await getClaims()
  const viewerUserId = claims?.sub as string | undefined

  // Fetch the soldier profile with rank and unit joins
  const { data: soldier } = await supabase
    .from('soldiers')
    .select(`
      id,
      display_name,
      callsign,
      mos,
      status,
      joined_at,
      user_id,
      ranks ( id, name, abbreviation, sort_order, insignia_url ),
      units ( id, name, abbreviation )
    `)
    .eq('id', params.id)
    .maybeSingle()

  if (!soldier) {
    error(404, 'Soldier not found')
  }

  // Normalize FK join (Supabase returns arrays for FK joins, single object at runtime)
  type RankRow = { id: string; name: string; abbreviation: string; sort_order: number; insignia_url: string | null } | null
  type UnitRow = { id: string; name: string; abbreviation: string | null } | null
  const rank = (Array.isArray(soldier.ranks) ? soldier.ranks[0] : soldier.ranks) as RankRow
  const unit = (Array.isArray(soldier.units) ? soldier.units[0] : soldier.units) as UnitRow

  // Fetch service records (ordered chronological — oldest first)
  const { data: serviceRecords } = await supabase
    .from('service_records')
    .select('id, action_type, payload, performed_by, visibility, occurred_at')
    .eq('soldier_id', params.id)
    .order('occurred_at', { ascending: true })

  // Fetch attendance stats (only if operations/operation_attendance tables exist)
  const { count: presentCount } = await supabase
    .from('operation_attendance')
    .select('*', { count: 'exact', head: true })
    .eq('soldier_id', params.id)
    .eq('status', 'present')

  const { count: totalOpsCount } = await supabase
    .from('operations')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'completed')

  const { data: recentAttendance } = await supabase
    .from('operation_attendance')
    .select('operation_id, status, created_at')
    .eq('soldier_id', params.id)
    .order('created_at', { ascending: false })
    .limit(1)

  const attendanceStats = {
    operationCount: presentCount ?? 0,
    totalOperations: totalOpsCount ?? 0,
    attendancePercent: totalOpsCount ? Math.round(((presentCount ?? 0) / totalOpsCount) * 100) : null,
    lastActiveDate: recentAttendance?.[0]?.created_at ?? null,
  }

  return {
    soldier: { ...soldier, rank, unit },
    serviceRecords: serviceRecords ?? [],
    attendanceStats,
    isOwnProfile: soldier.user_id === viewerUserId,
  }
}
```

### Service Record Entry Component

```svelte
<!-- Source: Established codebase patterns for Svelte 5 runes -->
<!-- src/lib/components/ServiceRecordEntry.svelte -->
<script lang="ts">
  interface Props {
    record: {
      id: string
      action_type: string
      payload: Record<string, unknown>
      performed_by: string | null
      visibility: string
      occurred_at: string
    }
  }

  let { record }: Props = $props()

  const actionLabels: Record<string, string> = {
    rank_change:    'Rank Change',
    award:          'Award',
    qualification:  'Qualification',
    transfer:       'Transfer',
    status_change:  'Status Change',
    enlistment:     'Enlistment',
    note:           'Note',
  }

  const performedByName = $derived(
    (record.payload as { performed_by_name?: string }).performed_by_name ?? 'Command'
  )
  const label = $derived(actionLabels[record.action_type] ?? record.action_type)
  const date = $derived(new Date(record.occurred_at).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric'
  }))
</script>

<div class="flex gap-3 py-2 border-b dark:border-night-border last:border-0">
  <div class="text-xs text-steel w-24 shrink-0 pt-0.5">{date}</div>
  <div class="flex-1">
    <span class="text-ranger-tan text-sm font-bold font-tactical">{label}</span>
    {#if record.payload.title}
      <span class="text-steel text-sm ml-2">{record.payload.title}</span>
    {/if}
    {#if record.payload.description}
      <p class="text-steel/70 text-xs mt-0.5">{record.payload.description}</p>
    {/if}
    <p class="text-steel/50 text-xs mt-0.5">by {performedByName}</p>
  </div>
  {#if record.visibility === 'leadership_only'}
    <span class="text-xs text-ranger-tan-muted self-start">NCO+</span>
  {/if}
</div>
```

### "My Profile" Navigation Helper

Members need a way to navigate to their own profile. This requires finding their `soldiers.id` from the current session's `user_id`:

```typescript
// Pattern for "view my profile" link in (app) layout or dashboard
// In the (app) layout.server.ts — extend the existing load function:
const { data: mySoldier } = await supabase
  .from('soldiers')
  .select('id')
  .eq('user_id', claims.sub as string)
  .maybeSingle()

// Return mySoldierId — used in nav: href="/soldiers/{mySoldierId}"
return {
  claims,
  userRole: (claims['user_role'] as string) ?? null,
  mySoldierId: mySoldier?.id ?? null,
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Supabase `.single()` | `.maybeSingle()` for nullable results | @supabase/supabase-js v2.x | `.single()` throws on empty; `.maybeSingle()` returns null gracefully |
| Svelte 4 `$:` reactive statements | Svelte 5 `$derived()` | Svelte 5.0 (Oct 2024) | Runes replace reactive statements entirely |
| Svelte 4 `export let prop` | Svelte 5 `let { prop } = $props()` | Svelte 5.0 (Oct 2024) | All component props via `$props()` destructure |
| Svelte 4 `<slot>` | Svelte 5 `{@render children()}` | Svelte 5.0 (Oct 2024) | Slots replaced by snippets/render tags |

**Not needed for Phase 3:**
- sveltekit-superforms: Phase 3 is read-only display, no form mutations
- Any new npm package: All required functionality is in the existing stack

---

## Open Questions

1. **`'retired'` status value**
   - What we know: Migration constraint allows `'active', 'inactive', 'loa', 'awol', 'discharged'`. PROF-05 requires "Discharged/Retired."
   - What's unclear: Whether "retired" is a distinct status or should display as "Discharged (Retired)" from the `'discharged'` status.
   - Recommendation: Add `'retired'` to the check constraint in the Phase 3 migration for semantic clarity. Use a UI label mapping to show "Retired" for the retired status.

2. **Who can view another member's full profile (service record visibility)**
   - What we know: `service_records` has `visibility = 'leadership_only'` for sensitive entries. The existing RLS policy allows NCO+ to read all records.
   - What's unclear: Should a regular `member` be able to see ANOTHER member's `public` service records? The phase requirement says "a member can view another member's profile page with the same information" — but "same information" may mean layout, not data.
   - Recommendation: Members can read other soldiers' `visibility = 'public'` service records only. `leadership_only` records are NCO+ only. The existing RLS policy already enforces this — no change needed.

3. **operations vs events table relationship**
   - What we know: A `events` table already exists (Phase 2) for scheduled upcoming operations. A new `operations` table is needed for completed ops with attendance tracking.
   - What's unclear: Whether `events` and `operations` should be unified (convert `events` to `operations` with a status system) or stay separate.
   - Recommendation: Keep them separate. `events` serves the public site's upcoming schedule. `operations` is the internal attendance/combat record system. They have different audiences and RLS profiles.

---

## Migration Plan for Phase 3

Phase 3 requires one new migration file: `20260211000004_phase3_profiles.sql`

Contents:
1. Add `'retired'` to soldiers status check constraint
2. Create `operations` table with RLS + policies
3. Create `operation_attendance` table with RLS + policies
4. Add `"Members can read own service records"` policy to `service_records`

---

## Sources

### Primary (HIGH confidence)
- Codebase: `/supabase/migrations/20260211000000_initial_schema.sql` — authoritative soldiers/ranks/units/service_records schema
- Codebase: `/supabase/migrations/20260211000001_rls_policies.sql` — exact existing RLS policy text
- Codebase: `/supabase/migrations/20260211000003_phase2_public_site.sql` — events table, anon policies
- Codebase: `/src/routes/(site)/roster/+page.server.ts` — FK join normalization pattern
- Codebase: `/src/routes/(site)/leadership/+page.server.ts` — inline type assertion pattern
- Codebase: `/src/hooks.server.ts` — getClaims() pattern confirmed working
- Codebase: `/src/app.css` — exact custom Tailwind color tokens
- Official SvelteKit docs: https://svelte.dev/docs/kit/routing#Advanced-routing-Route-parameters — dynamic `[id]` routes
- Official Supabase docs: `.maybeSingle()` vs `.single()` behavior

### Secondary (MEDIUM confidence)
- `src/lib/types/database.ts` — used only to understand what tables are LEGACY (not current); cross-referenced against migrations to confirm which tables do not exist

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified in package.json; no new packages needed
- Schema findings: HIGH — verified directly against migration SQL files
- Architecture patterns: HIGH — direct extension of established patterns in codebase
- RLS policies: HIGH — based on existing policies + Supabase RLS behavior docs
- Pitfalls: HIGH — derived from actual code inspection, not speculation

**Research date:** 2026-02-11
**Valid until:** 2026-03-13 (30 days — stable foundation; Supabase SSR and SvelteKit APIs are post-beta)
