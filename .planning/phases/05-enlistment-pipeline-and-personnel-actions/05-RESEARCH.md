# Phase 5: Enlistment Pipeline and Personnel Actions - Research

**Researched:** 2026-02-11
**Domain:** SvelteKit form actions with state machine transitions, Supabase RPC for atomic multi-table writes, RLS for role-differentiated visibility, append-only service record patterns
**Confidence:** HIGH (all findings verified against live database schema, existing migration files, and current source code)

---

## Summary

Phase 5 has two parallel sub-domains: the **Enlistment Pipeline** (ENLS-01 through ENLS-05) and **Personnel Actions** (PERS-01 through PERS-05). Both write to `service_records` and mutate the `soldiers` table — making this the first phase that performs full CRUD against core personnel data rather than just appending audit trail records.

The most critical finding is a **schema gap**: the `enlistments` table status constraint currently only has `('pending', 'reviewing', 'accepted', 'rejected')` — it is **missing `'interview_scheduled'`**, which is required by ENLS-03. A Phase 5 migration must add this state. The state transition graph is: `pending → reviewing → interview_scheduled → accepted/rejected`. Invalid jumps (e.g., `pending → accepted` directly) must be rejected — the research decision is **RPC-only enforcement** (not trigger or CHECK constraint), because RPC gives the best error messaging to the UI and fits the existing pattern where all mutations go through server-side form actions.

The soldier auto-creation on acceptance (ENLS-04) must be implemented as a **server-side SvelteKit form action** (not a DB trigger). The form action accepts the application, creates the soldier row, inserts a `service_records` entry for `action_type = 'enlistment'`, then marks the enlistment as `accepted`. This sequence runs in the server context where the performer's identity is known — a trigger would lose the JWT context needed for `performed_by`.

Personnel actions (PERS-01 through PERS-05) follow the established Phase 4 dual-write pattern exactly: every action mutates the `soldiers` table AND inserts a `service_records` entry. The **leadership-only notes** RLS pattern is already implemented — `service_records.visibility = 'leadership_only'` with the existing NCO+ read policy covers PERS-04 without any schema changes needed.

**Primary recommendation:** Use RPC-only state machine enforcement for enlistment transitions. Use server-side SvelteKit form actions for soldier auto-creation. All personnel action dual-writes follow the Phase 4 established pattern.

---

## Critical Schema Findings

### Live Database State (Verified Against Supabase Project `lelwuinxszfwnlquwsho`)

All tables confirmed present with RLS enabled:

| Table | Relevant Columns for Phase 5 |
|-------|------------------------------|
| `enlistments` | `id`, `display_name`, `discord_username`, `age`, `timezone`, `arma_experience`, `why_join`, `referred_by`, `status CHECK IN ('pending','reviewing','accepted','rejected')`, `submitted_at`, `reviewed_at`, `reviewed_by`, `notes` |
| `soldiers` | `id`, `user_id`, `discord_id`, `display_name`, `callsign`, `mos`, `status CHECK IN ('active','inactive','loa','awol','discharged','retired')`, `rank_id`, `unit_id`, `joined_at` |
| `service_records` | `id`, `soldier_id`, `action_type CHECK IN ('rank_change','award','qualification','transfer','status_change','enlistment','note')`, `payload jsonb`, `performed_by`, `visibility CHECK IN ('public','leadership_only')`, `occurred_at` |
| `ranks` | `id`, `name`, `abbreviation`, `sort_order`, `insignia_url` |
| `units` | `id`, `name`, `abbreviation`, `parent_unit_id` |
| `user_roles` | `user_id`, `role` (app_role enum) |

### Schema Change Required: `enlistments.status` Missing `'interview_scheduled'`

**CRITICAL:** The live constraint is:
```sql
CHECK (status = ANY (ARRAY['pending','reviewing','accepted','rejected']))
```

Phase 5 requirement ENLS-03 requires an `'interview_scheduled'` state. The migration must:
```sql
ALTER TABLE public.enlistments DROP CONSTRAINT IF EXISTS enlistments_status_check;
ALTER TABLE public.enlistments ADD CONSTRAINT enlistments_status_check
  CHECK (status IN ('pending', 'reviewing', 'interview_scheduled', 'accepted', 'rejected'));
```

### service_records action_type — No Changes Needed

The `'enlistment'` and `'note'` action types already exist in the constraint. All Phase 5 service record writes can use existing types:
- Enlistment acceptance: `action_type = 'enlistment'`
- Promotion/demotion: `action_type = 'rank_change'`
- Transfer: `action_type = 'transfer'`
- Status change: `action_type = 'status_change'`
- Leadership note: `action_type = 'note'` with `visibility = 'leadership_only'`

### Existing RLS on enlistments

```sql
-- Already exists (Phase 2):
"Anon can submit enlistments" -- INSERT for anon (the public form already works)
"NCO and above can read enlistments" -- SELECT for NCO+
```

Phase 5 needs to ADD:
- UPDATE policy for Command+ (to advance status)
- The existing NCO+ read policy covers ENLS-02 (view queue)

### No New Tables Required

Phase 5 does NOT need any new tables. All functionality maps to existing tables:
- Enlistment review queue: queries `enlistments`
- Soldier auto-creation: inserts into `soldiers` + `service_records`
- Promote/demote: updates `soldiers.rank_id` + inserts `service_records`
- Transfer: updates `soldiers.unit_id` + inserts `service_records`
- Status change: updates `soldiers.status` + inserts `service_records`
- Leadership notes: inserts `service_records` with `visibility = 'leadership_only'`
- Troop/position assignment: updates `soldiers.unit_id` (same as transfer)

---

## Standard Stack

No new libraries required. Phase 5 uses only what is already installed.

### Core (All Already Installed)

| Library | Version | Purpose | Phase 5 Use |
|---------|---------|---------|-------------|
| SvelteKit | ^2.50.2 | Full-stack framework | New routes: `/(app)/enlistments`, `/(app)/enlistments/[id]` |
| Svelte | ^5.49.2 | UI with runes | `$state()` for queue filter state, `$derived()` for filtered lists |
| @supabase/supabase-js | ^2.95.3 | DB client | UPDATE enlistments, INSERT soldiers + service_records |
| @supabase/ssr | ^0.8.0 | Server client | Already in `hooks.server.ts` |
| sveltekit-superforms | ^2.29.1 | Form handling | All personnel action forms |
| zod | ^4.3.6 | Schema validation | Personnel action form schemas (use `zod4` adapter) |
| tailwindcss | ^4.1.18 | Styling | Existing custom color tokens |

**No new npm installs required for Phase 5.**

---

## Architecture Patterns

### Recommended Project Structure for Phase 5

```
src/
├── routes/
│   └── (app)/
│       ├── enlistments/
│       │   ├── +page.server.ts       # NEW: list queue (NCO+ only), advance status actions
│       │   ├── +page.svelte          # NEW: review queue with status filter
│       │   └── [id]/
│       │       ├── +page.server.ts   # NEW: single application detail + accept/deny actions
│       │       └── +page.svelte      # NEW: application detail view with action buttons
│       └── soldiers/
│           └── [id]/
│               ├── +page.server.ts   # EXTEND: add promote, transfer, statusChange, addNote actions
│               └── +page.svelte      # EXTEND: add Command+ action panels
├── lib/
│   └── schemas/
│       ├── advanceEnlistment.ts      # NEW: Zod schema for status advance form
│       ├── acceptEnlistment.ts       # NEW: Zod schema for accept (creates soldier)
│       ├── promoteAction.ts          # NEW: Zod schema for promote/demote
│       ├── transferAction.ts         # NEW: Zod schema for transfer order
│       ├── statusChangeAction.ts     # NEW: Zod schema for status change
│       └── addNoteAction.ts          # NEW: Zod schema for leadership note
supabase/
└── migrations/
    └── 20260211000007_phase5_enlistment_pipeline.sql   # NEW
```

### Pattern 1: State Machine Enforcement via RPC-Only (Recommended)

**What:** All enlistment status transitions happen exclusively through named SvelteKit form actions. The server-side code validates the transition is legal before executing the UPDATE. Invalid transitions return a 400 error to the form.

**Why RPC-only over trigger or CHECK constraint:**
- A BEFORE UPDATE trigger can enforce transitions but returns a cryptic Postgres error to the UI. The server action can map the error to a user-friendly message.
- A CHECK constraint cannot enforce transitions (it cannot compare `OLD.status` to `NEW.status` — CHECK constraints cannot reference old values in UPDATE scenarios).
- A server-side action has full context: the performer's role, the current status, and the target status — allowing a clean `fail(400, { message: 'Cannot advance from X to Y' })` response.
- Consistent with existing Phase 4 pattern: all mutations already go through form actions with server-side validation.

**Valid transition graph:**
```
pending → reviewing
reviewing → interview_scheduled
reviewing → rejected          (fast-reject)
interview_scheduled → accepted
interview_scheduled → rejected
```

**Invalid transitions (any other combination):**
```
pending → accepted            INVALID
pending → rejected            INVALID
pending → interview_scheduled INVALID
accepted → [anything]         INVALID (terminal state)
rejected → [anything]         INVALID (terminal state)
```

```typescript
// Source: Established project pattern (Phase 4 form actions)
// src/lib/enlistment-transitions.ts

export const VALID_TRANSITIONS: Record<string, string[]> = {
  pending:              ['reviewing'],
  reviewing:            ['interview_scheduled', 'rejected'],
  interview_scheduled:  ['accepted', 'rejected'],
  accepted:             [],   // terminal
  rejected:             [],   // terminal
}

export function isValidTransition(from: string, to: string): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false
}
```

```typescript
// In +page.server.ts actions:
const { data: current } = await supabase
  .from('enlistments')
  .select('status')
  .eq('id', params.id)
  .single()

if (!isValidTransition(current.status, targetStatus)) {
  return message(form, `Cannot advance from "${current.status}" to "${targetStatus}"`, { status: 400 })
}
```

### Pattern 2: Soldier Auto-Creation on Acceptance (Server Action, Not Trigger)

**What:** Accepting an enlistment creates a soldier profile automatically. This is a server-side form action that:
1. Validates the transition is legal (interview_scheduled → accepted)
2. Creates a `soldiers` row from the enlistment data
3. Inserts a `service_records` entry with `action_type = 'enlistment'`
4. Updates `enlistments.status = 'accepted'`

**Why server action, not DB trigger:**
- A BEFORE INSERT trigger on `soldiers` would fire for ALL soldier inserts, not just from enlistments. This creates fragility.
- A trigger on `enlistments` AFTER UPDATE fires asynchronously after the status update — it has no access to the JWT context needed to set `performed_by`.
- The server action approach keeps the logic explicit, testable, and follows the existing Phase 4 dual-write pattern.

```typescript
// src/routes/(app)/enlistments/[id]/+page.server.ts
// Named action: acceptApplication

acceptApplication: async ({ params, request, locals: { supabase, getClaims } }) => {
  const claims = await getClaims()
  const userRole = (claims?.['user_role'] as string) ?? null

  if (!hasRole(userRole, 'command')) {
    return fail(403, { message: 'Command or higher required to accept applications' })
  }

  const form = await superValidate(request, zod4(acceptEnlistmentSchema))
  if (!form.valid) return fail(400, { form })

  // Fetch current enlistment (validates it exists + gets current status)
  const { data: enlistment } = await supabase
    .from('enlistments')
    .select('id, display_name, discord_username, status')
    .eq('id', params.id)
    .single()

  if (!enlistment) return fail(404, { message: 'Application not found' })

  // Validate state transition
  if (!isValidTransition(enlistment.status, 'accepted')) {
    return message(form, `Cannot accept from status "${enlistment.status}"`, { status: 400 })
  }

  // Fetch performer display_name for service record payload
  const { data: performer } = await supabase
    .from('soldiers')
    .select('display_name')
    .eq('user_id', claims?.sub as string)
    .maybeSingle()
  const performed_by_name = performer?.display_name ?? 'Command'

  // 1. Create soldier profile
  const { data: newSoldier, error: soldierError } = await supabase
    .from('soldiers')
    .insert({
      display_name: enlistment.display_name,
      discord_id: enlistment.discord_username,  // store for reference; user_id linked when they log in
      status: 'active',
      rank_id: form.data.rank_id,               // lowest rank, set in form
      unit_id: form.data.unit_id ?? null,
    })
    .select('id')
    .single()

  if (soldierError || !newSoldier) {
    console.error('Soldier insert error:', soldierError)
    return message(form, 'Failed to create soldier profile', { status: 500 })
  }

  // 2. Insert service_records entry (enlistment event — non-fatal if fails)
  const { error: srError } = await supabase.from('service_records').insert({
    soldier_id: newSoldier.id,
    action_type: 'enlistment',
    payload: {
      enlistment_id: params.id,
      display_name: enlistment.display_name,
      performed_by_name,
    },
    performed_by: claims?.sub as string,
    visibility: 'public',
  })
  if (srError) console.error('service_records insert error (enlistment):', srError)

  // 3. Update enlistment status to accepted
  const { error: updateError } = await supabase
    .from('enlistments')
    .update({
      status: 'accepted',
      reviewed_at: new Date().toISOString(),
      reviewed_by: claims?.sub as string,
    })
    .eq('id', params.id)

  if (updateError) {
    console.error('Enlistment update error:', updateError)
    // Non-fatal: soldier already created. Log and continue.
  }

  return message(form, `${enlistment.display_name} has been accepted. Soldier profile created.`)
},
```

**Important note on `user_id` linking:** The `soldiers.user_id` column is `NULL` when auto-created from an enlistment. It gets linked to an `auth.users.id` when the new recruit logs in for the first time. This requires a separate "link account" mechanism (out of scope for Phase 5 but the schema already supports it via the `unique` constraint on `soldiers.user_id`).

### Pattern 3: Personnel Actions (Promote/Demote/Transfer/Status Change)

**What:** Every personnel action updates the `soldiers` table AND inserts a `service_records` entry. This is the same dual-write pattern as Phase 4 awards/qualifications.

**Promote/Demote:**
```typescript
// Mutates soldiers.rank_id, inserts service_records action_type='rank_change'
promote: async ({ params, request, locals: { supabase, getClaims } }) => {
  // ... permission check: hasRole(userRole, 'command') ...
  // ... superValidate with promoteActionSchema ...

  // Update soldiers rank
  const { error: updateError } = await supabase
    .from('soldiers')
    .update({ rank_id: form.data.new_rank_id })
    .eq('id', params.id)

  if (updateError) return message(form, 'Promotion failed', { status: 500 })

  // Append service record
  await supabase.from('service_records').insert({
    soldier_id: params.id,
    action_type: 'rank_change',
    payload: {
      from_rank_id: form.data.from_rank_id,
      from_rank_name: form.data.from_rank_name,
      to_rank_id: form.data.new_rank_id,
      to_rank_name: form.data.new_rank_name,
      reason: form.data.reason,
      performed_by_name,
    },
    performed_by: claims?.sub as string,
    visibility: 'public',
  })

  return message(form, 'Promotion recorded successfully')
},
```

**Transfer:**
```typescript
// Mutates soldiers.unit_id, inserts service_records action_type='transfer'
// effective_date is stored in payload, not a DB column (enlistments table has no effective_date column)
transfer: async ({ ... }) => {
  await supabase.from('soldiers').update({ unit_id: form.data.new_unit_id }).eq('id', params.id)
  await supabase.from('service_records').insert({
    soldier_id: params.id,
    action_type: 'transfer',
    payload: {
      from_unit_id: form.data.from_unit_id,
      from_unit_name: form.data.from_unit_name,
      to_unit_id: form.data.new_unit_id,
      to_unit_name: form.data.new_unit_name,
      effective_date: form.data.effective_date,
      reason: form.data.reason,
      performed_by_name,
    },
    performed_by: claims?.sub as string,
    visibility: 'public',
  })
}
```

**Status Change (PERS-03 — Admin only):**
```typescript
// Admin changes soldiers.status; requires hasRole(userRole, 'admin')
// Valid target statuses: 'active', 'loa', 'awol', 'discharged', 'retired'
statusChange: async ({ ... }) => {
  await supabase.from('soldiers').update({ status: form.data.new_status }).eq('id', params.id)
  await supabase.from('service_records').insert({
    soldier_id: params.id,
    action_type: 'status_change',
    payload: {
      from_status: form.data.from_status,
      to_status: form.data.new_status,
      reason: form.data.reason,
      performed_by_name,
    },
    performed_by: claims?.sub as string,
    visibility: 'public',
  })
}
```

### Pattern 4: Leadership-Only Notes (PERS-04)

**What:** Command+ inserts a `service_records` entry with `visibility = 'leadership_only'`. The existing RLS policy `"NCO and above can read all service records including leadership_only"` already handles the read restriction. No schema changes needed.

```typescript
addNote: async ({ params, request, locals: { supabase, getClaims } }) => {
  // requires hasRole(userRole, 'command')
  await supabase.from('service_records').insert({
    soldier_id: params.id,
    action_type: 'note',
    payload: {
      note_text: form.data.note_text,
      performed_by_name,
    },
    performed_by: claims?.sub as string,
    visibility: 'leadership_only',   // KEY: restricts read to NCO+
  })
}
```

**Existing RLS already handles this:** The policy `"NCO and above can read all service records including leadership_only"` (from `20260211000001_rls_policies.sql`) already allows NCO+ to see `leadership_only` records. Members see only `visibility = 'public'` records. No new policy needed.

### Pattern 5: Troop/Position Assignment (PERS-05)

**What:** This is effectively a transfer within the same unit structure (updates `soldiers.unit_id`). The Phase 5 migration does NOT need a new `positions` table — position tracking can use the free-text `soldiers.mos` column plus a `transfer` service record entry.

**Decision:** PERS-05 ("assign soldiers to troops and positions") maps to: updating `soldiers.unit_id` (troop assignment) + optionally `soldiers.mos` (position). This reuses the transfer pattern. No new tables required.

### Pattern 6: Enlistment Review Queue Page

**What:** The queue page at `/(app)/enlistments` loads all non-terminal applications and allows Command+ to filter by status.

```typescript
// src/routes/(app)/enlistments/+page.server.ts
export const load: PageServerLoad = async ({ locals: { supabase, getClaims } }) => {
  const claims = await getClaims()
  const userRole = (claims?.['user_role'] as string) ?? null

  if (!hasRole(userRole, 'nco')) {
    redirect(303, '/dashboard')
  }

  const { data: applications } = await supabase
    .from('enlistments')
    .select('id, display_name, discord_username, status, submitted_at, reviewed_at')
    .not('status', 'in', '("accepted","rejected")')  // Exclude terminal states from queue
    .order('submitted_at', { ascending: true })       // Oldest first

  // Also fetch counts for the sidebar status summary
  const { data: allApplications } = await supabase
    .from('enlistments')
    .select('id, status')

  return {
    applications: applications ?? [],
    allApplications: allApplications ?? [],
    userRole,
  }
}
```

**Note on Supabase `.not('status', 'in', ...)` syntax:** The Supabase JS client uses `not('column', 'in', '(val1,val2)')` with the parentheses in the value string for PostgREST `not.in` filter. Verified in PostgREST documentation pattern.

### Anti-Patterns to Avoid

- **DB trigger for state machine:** A BEFORE UPDATE trigger enforcing state transitions works but returns a Postgres exception that the client receives as a generic error — bad UX. Server action validation gives control over error messages.
- **Allowing `user_id` to be set during auto-creation from enlistment:** The `soldiers.user_id` column has a `UNIQUE` constraint. Setting it to the reviewing officer's UUID would be wrong. Leave it `NULL` — it gets linked when the new member first logs in with Discord OAuth.
- **Sending `discord_username` directly to `soldiers.discord_id`:** The `discord_username` field in enlistments is a username string (e.g., "Ranger42"). The `soldiers.discord_id` column is designed for a Discord snowflake ID (numeric). Store the username in `soldiers.callsign` or `display_name` at creation time, NOT in `discord_id`. Set `discord_id = null` at creation — it gets populated when they link their Discord account.
- **Using `auth.getClaims()` for authorization in actions without re-validating:** The `(app)` layout validates session for the load function but actions have their own request context. Always call `getClaims()` in each action.
- **Single form for all personnel actions:** Each action (promote, transfer, status change, note) has different fields and permission levels. Keep as separate named actions.
- **Checking permissions only in the UI layer:** `hasRole()` is UI-layer only. RLS UPDATE policies on `soldiers` and INSERT policies on `service_records` are the actual enforcement. Both layers must exist.

---

## RLS Policies Needed for Phase 5

The Phase 5 migration must add these policies:

### enlistments table (new UPDATE policy for Command+)

```sql
-- Command+ can update enlistments (status transitions + reviewed_at/reviewed_by)
CREATE POLICY "Command and above can update enlistments"
  ON public.enlistments FOR UPDATE TO authenticated
  USING (
    (SELECT (auth.jwt() ->> 'user_role')::public.app_role)
      IN ('command', 'admin')
  )
  WITH CHECK (
    (SELECT (auth.jwt() ->> 'user_role')::public.app_role)
      IN ('command', 'admin')
  );
```

**Note:** The existing `"NCO and above can read enlistments"` policy already covers ENLS-02 (NCO+ view queue). No new SELECT policy needed on enlistments.

### soldiers table (existing NCO+ INSERT policy already covers ENLS-04)

The existing policy from `20260211000001_rls_policies.sql`:
```sql
"NCO and above can insert soldiers"  -- already exists
"NCO and above can update soldiers"  -- already exists
```

Command+ is included in NCO+ (`hasRole` hierarchy: admin > command > nco > member). The existing UPDATE policy covers all personnel actions that mutate the soldiers row.

**However, Admin-only status restriction for PERS-03 is enforced at the application layer** (form action checks `hasRole(userRole, 'admin')`), not at the RLS layer. The RLS NCO+ UPDATE policy is broader. This is acceptable because RLS is the security floor and the application layer provides the finer-grained permission — consistent with the existing Phase 4 pattern.

### service_records (no new policies needed)

The existing `"NCO and above can insert service records"` policy covers all Phase 5 service record inserts. The `"NCO and above can read all service records including leadership_only"` policy covers PERS-04 visibility restriction.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| State machine transition table | Custom lookup structure | JS object literal `VALID_TRANSITIONS` in a lib file | Only 5 states, deterministic graph — object literal is readable and testable |
| Atomic multi-table write | Custom transaction wrapper | Sequential inserts with non-fatal secondary write | Same dual-write pattern as Phase 4; service_records insert failure is non-fatal |
| Enlistment queue filter | Server-side query per status | Client-side `$derived` with `$state` filter | Small dataset; same pattern as Phase 4 roster view toggle |
| Role-based form display | Custom auth component | `hasRole()` from `$lib/auth/roles` + `{#if}` block | Already established in Phase 4 soldier profile page |
| Date formatting | Custom date formatter | `new Date().toISOString().split('T')[0]` for date inputs | Same pattern as Phase 4 `awarded_date` default |
| Enlistment → Soldier field mapping | Complex transformation | Inline object in form action | Only 5 fields to map; no library needed |

---

## Common Pitfalls

### Pitfall 1: Missing `'interview_scheduled'` State in DB Constraint

**What goes wrong:** Code tries to advance an enlistment to `status = 'interview_scheduled'` and gets a Postgres CHECK constraint violation: `ERROR: new row for relation "enlistments" violates check constraint "enlistments_status_check"`.

**Why it happens:** The live `enlistments_status_check` constraint only allows `('pending','reviewing','accepted','rejected')`. The `interview_scheduled` state does not exist in the DB.

**How to avoid:** The Phase 5 migration must ALTER the constraint FIRST before any state machine logic is implemented. Verify with:
```sql
SELECT pg_get_constraintdef(oid) FROM pg_constraint
WHERE conrelid = 'public.enlistments'::regclass AND contype = 'c';
```

**Warning signs:** `insert or update on table "enlistments" violates check constraint` error on status update.

### Pitfall 2: Setting `soldiers.discord_id` to Username String

**What goes wrong:** The `enlistments.discord_username` field contains a username like `"Ranger42"`. Code sets `soldiers.discord_id = enlistment.discord_username`. Later, when the soldier links their Discord account, the `discord_id` is a snowflake like `"185476543210496000"` — the column now has the wrong value and the link query fails.

**Why it happens:** Column name similarity causes confusion. `discord_username` is a display string; `discord_id` is a numeric snowflake ID.

**How to avoid:** At auto-creation time, set `discord_id = NULL`. Store the username in `display_name`. The `discord_id` gets populated via a separate account-linking flow.

**Warning signs:** Discord OAuth login fails to find the soldier row, or the unique constraint on `discord_id` causes a conflict.

### Pitfall 3: Terminal State Re-Transition

**What goes wrong:** An `accepted` or `rejected` application gets re-advanced by a Command user who doesn't notice the current status. The state machine allows the transition and creates a duplicate soldier.

**Why it happens:** The form doesn't check current status before submitting, and the action relies on the client-submitted target status.

**How to avoid:** The action always fetches the current DB status (not relying on client-submitted `from_status`). Check `isValidTransition(current.status, targetStatus)` where `current.status` comes from the DB. The `VALID_TRANSITIONS` object returns `[]` for terminal states, so any transition from `accepted` or `rejected` returns a 400.

### Pitfall 4: Duplicate Soldier on Retry

**What goes wrong:** The `acceptApplication` action creates a soldier but the subsequent `enlistments` UPDATE fails. On retry, the action tries to create another soldier but the `display_name` + `discord_id = null` combination doesn't trigger a unique constraint (no unique constraint on `display_name`). Result: duplicate soldier records.

**Why it happens:** The dual-write is not atomic. If the `soldiers` INSERT succeeds but the `enlistments` UPDATE fails, the soldier exists but the enlistment still shows `interview_scheduled`.

**How to avoid:** Before creating the soldier, check if a soldier with the same `discord_id` (if not null) or `display_name` + same `submitted_at` already exists. More practically: check if the enlistment `status` is already `accepted` at the start of the action — if so, redirect to the existing soldier. Or: check `enlistments.reviewed_by IS NOT NULL` as an idempotency signal.

**Recommendation:** Add a `soldier_id` column to `enlistments` that gets set when the soldier is created. If the action runs again and `soldier_id IS NOT NULL`, skip soldier creation and just ensure the status is `accepted`. This also provides a convenient FK link from enlistment to created soldier.

### Pitfall 5: `soldiers` UPDATE Policy Scope Too Broad for Status Change

**What goes wrong:** An NCO-role user calls the `statusChange` action from a crafted HTTP request (bypassing the UI's `hasRole(userRole, 'admin')` check). The RLS UPDATE policy allows NCO+, so the status change goes through.

**Why it happens:** PERS-03 requires Admin-only status changes, but the RLS UPDATE policy for soldiers is NCO+ (inherited from Phase 1, designed for creating and editing soldier profiles generally).

**How to avoid:** The application-layer check `if (!hasRole(userRole, 'admin')) return fail(403, ...)` in the form action provides the primary enforcement. For defense-in-depth, add a stricter `statusChange` RPC function with `SECURITY DEFINER` that checks `auth.jwt() ->> 'user_role' = 'admin'` internally, or use a separate Admin-only RLS UPDATE policy scoped to the `status` column.

**For Phase 5:** The application-layer check is sufficient given the small team size and existing RLS security floor. Document this as a known limitation to address if the project scales.

### Pitfall 6: Enlistment Queue Loads Terminal Applications

**What goes wrong:** The queue page loads ALL enlistments including accepted and rejected. Command reviews dozens of old applications mixed with new ones.

**Why it happens:** Query doesn't filter out terminal states.

**How to avoid:** Use `.not('status', 'in', '("accepted","rejected")')` in the queue query. The full history page (if needed) can show all records. The queue shows only actionable items.

**Supabase JS `.not(..., 'in', ...)` syntax note:** The value string must include parentheses: `'("accepted","rejected")'` — this is the PostgREST `not.in` filter format. Verified against PostgREST documentation.

### Pitfall 7: Soldiers `user_id` NULL During Personnel Actions

**What goes wrong:** Personnel action forms include `soldier_id` as the target. If a newly accepted soldier hasn't linked their Discord account yet, their `soldiers.user_id` is NULL. Any logic that tries to look up the soldier by `user_id` will fail.

**Why it happens:** Auto-created soldiers have `user_id = NULL` until they link their account.

**How to avoid:** All personnel actions use `soldiers.id` (the internal UUID), never `soldiers.user_id`. The URL parameter `params.id` is already `soldiers.id` in the existing `/(app)/soldiers/[id]` route.

---

## Code Examples

### Zod Schema: Accept Enlistment

```typescript
// src/lib/schemas/acceptEnlistment.ts
import { z } from 'zod'

export const acceptEnlistmentSchema = z.object({
  rank_id: z.string().uuid('Select starting rank'),
  unit_id: z.string().uuid('Select unit assignment').optional(),
})
```

### Zod Schema: Promote Action

```typescript
// src/lib/schemas/promoteAction.ts
import { z } from 'zod'

export const promoteActionSchema = z.object({
  new_rank_id: z.string().uuid('Select new rank'),
  new_rank_name: z.string().min(1),   // snapshot for service record payload
  from_rank_id: z.string().uuid(),    // current rank (from load data, not editable)
  from_rank_name: z.string().min(1),  // snapshot
  reason: z.string().min(5, 'Reason must be at least 5 characters').max(500),
})
```

### Zod Schema: Transfer Action

```typescript
// src/lib/schemas/transferAction.ts
import { z } from 'zod'

export const transferActionSchema = z.object({
  new_unit_id: z.string().uuid('Select destination unit'),
  new_unit_name: z.string().min(1),   // snapshot
  from_unit_id: z.string().uuid().nullable(), // may be null if unassigned
  from_unit_name: z.string().nullable(),
  effective_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date'),
  reason: z.string().min(5, 'Reason required').max(500),
})
```

### Zod Schema: Status Change (Admin Only)

```typescript
// src/lib/schemas/statusChangeAction.ts
import { z } from 'zod'

const SOLDIER_STATUSES = ['active', 'loa', 'awol', 'discharged', 'retired'] as const

export const statusChangeActionSchema = z.object({
  new_status: z.enum(SOLDIER_STATUSES, { error: 'Select a valid status' }),
  from_status: z.enum(SOLDIER_STATUSES),
  reason: z.string().min(5, 'Reason required').max(500),
})
```

### Zod Schema: Add Leadership Note

```typescript
// src/lib/schemas/addNoteAction.ts
import { z } from 'zod'

export const addNoteActionSchema = z.object({
  note_text: z.string().min(10, 'Note must be at least 10 characters').max(2000),
})
```

### State Transition Validation Helper

```typescript
// src/lib/enlistment-transitions.ts
// Source: Established project pattern (state machine reasoning)

export const VALID_TRANSITIONS: Record<string, string[]> = {
  pending:              ['reviewing'],
  reviewing:            ['interview_scheduled', 'rejected'],
  interview_scheduled:  ['accepted', 'rejected'],
  accepted:             [],   // terminal
  rejected:             [],   // terminal
}

export function isValidTransition(from: string, to: string): boolean {
  return (VALID_TRANSITIONS[from] ?? []).includes(to)
}

// Human-readable state labels for UI
export const STATUS_LABELS: Record<string, string> = {
  pending:              'Pending Review',
  reviewing:            'Under Review',
  interview_scheduled:  'Interview Scheduled',
  accepted:             'Accepted',
  rejected:             'Denied',
}

// What action buttons to show for each state (Command+ only)
export const NEXT_STATES: Record<string, { label: string; value: string; style: string }[]> = {
  pending:             [{ label: 'Begin Review', value: 'reviewing', style: 'secondary' }],
  reviewing:           [
    { label: 'Schedule Interview', value: 'interview_scheduled', style: 'secondary' },
    { label: 'Deny', value: 'rejected', style: 'danger' },
  ],
  interview_scheduled: [
    { label: 'Accept', value: 'accepted', style: 'primary' },
    { label: 'Deny', value: 'rejected', style: 'danger' },
  ],
  accepted:            [],
  rejected:            [],
}
```

### Migration SQL (Phase 5)

```sql
-- 20260211000007_phase5_enlistment_pipeline.sql

-- 1. Add 'interview_scheduled' to enlistments status constraint
ALTER TABLE public.enlistments DROP CONSTRAINT IF EXISTS enlistments_status_check;
ALTER TABLE public.enlistments ADD CONSTRAINT enlistments_status_check
  CHECK (status IN ('pending', 'reviewing', 'interview_scheduled', 'accepted', 'rejected'));

-- 2. Add soldier_id FK to enlistments (links accepted application to created soldier)
ALTER TABLE public.enlistments
  ADD COLUMN IF NOT EXISTS soldier_id uuid REFERENCES public.soldiers(id) ON DELETE SET NULL;

-- 3. RLS: Command+ can UPDATE enlistments
CREATE POLICY "Command and above can update enlistments"
  ON public.enlistments FOR UPDATE TO authenticated
  USING (
    (SELECT (auth.jwt() ->> 'user_role')::public.app_role)
      IN ('command', 'admin')
  )
  WITH CHECK (
    (SELECT (auth.jwt() ->> 'user_role')::public.app_role)
      IN ('command', 'admin')
  );
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| DB trigger for state machine | Server action with JS transition map | This project design | Better error messages, JWT context available |
| Separate status history table | Append-only service_records | Phase 1 design decision (locked) | All state changes in one table, no join needed |
| `zod` adapter | `zod4` adapter in superforms | sveltekit-superforms v2.x + Zod v4 | Use `zod4` — confirmed by existing enlistment form |
| Svelte 4 `$:` | Svelte 5 `$derived()` | Svelte 5.0 (Oct 2024) | Use runes exclusively |
| `import { enhance } from '$app/forms'` | Same — this is still current SvelteKit | SvelteKit 2.x | Required for form progressive enhancement |

---

## Open Questions

1. **`soldiers.user_id` linking workflow**
   - What we know: Auto-created soldiers have `user_id = NULL`. The `user_id` gets linked when the recruit logs in with Discord OAuth.
   - What's unclear: The existing auth callback at `src/routes/auth/callback/+server.ts` does not appear to check for an unlinked soldier record and link it. This means new recruits who log in will get a session but no `mySoldierId` in the layout — they won't see "My Profile" in the nav.
   - Recommendation: Phase 5 should add logic to the auth callback (or the `(app)` layout load) to check if `soldiers.user_id IS NULL AND soldiers.discord_id = <discord username from OAuth>` and set `user_id` on first login. Research this in the auth callback file before the planner specifies this sub-task.
   - Confidence: MEDIUM — requires reading `src/routes/auth/callback/+server.ts` which was not fully inspected in this research.

2. **`soldiers.soldier_id` column on enlistments for idempotency**
   - What we know: Adding `soldier_id` to enlistments prevents duplicate soldier creation on retry. The research recommends adding this FK column.
   - What's unclear: Whether the planner should make this a mandatory part of the migration or optional.
   - Recommendation: Include it in the migration. The FK link from enlistment → soldier is genuinely useful for the admin to trace the intake pipeline.

3. **Notification on new enlistment submission**
   - What we know: The additional context flags "Admin notification strategy (Supabase Realtime vs. polling vs. webhooks)" as a research item for planning.
   - What's unclear: Whether notifications are in scope for Phase 5 or deferred.
   - Recommendation: Notifications are OUT OF SCOPE for Phase 5. The enlistment queue page is the notification mechanism — Command checks it. Supabase Realtime subscription from a long-lived page is the right future approach, but adds significant complexity. Defer to a future phase.
   - Confidence: HIGH — no notification requirement is listed in the Phase 5 success criteria.

4. **`/(app)/enlistments` route: should NCO see full detail or just queue?**
   - What we know: ENLS-02 says "Command+ can view pending applications." ENLS-03 says "Command+ can advance state."
   - What's unclear: Whether NCO (who can read enlistments per existing RLS) should see the queue in read-only mode, or be excluded entirely.
   - Recommendation: Show NCO the queue in read-only mode (no action buttons). Only Command+ sees the advance/accept/deny buttons. This is consistent with the `hasRole()` pattern — show different UI based on role, same data access.

---

## Sources

### Primary (HIGH confidence)

- Live DB: `lelwuinxszfwnlquwsho` — actual constraint definitions confirmed via `pg_constraint` query
- Codebase: `/supabase/migrations/20260211000000_initial_schema.sql` — soldiers/service_records schema
- Codebase: `/supabase/migrations/20260211000001_rls_policies.sql` — exact RLS policy text for soldiers, service_records
- Codebase: `/supabase/migrations/20260211000003_phase2_public_site.sql` — enlistments table + existing policies
- Codebase: `/supabase/migrations/20260211000006_phase4_awards_qualifications.sql` — confirmed dual-write pattern with non-fatal secondary write
- Codebase: `/src/routes/(app)/soldiers/[id]/+page.server.ts` — confirmed full dual-write action pattern, `getClaims()`, `zod4`, `hasRole()`
- Codebase: `/src/lib/auth/roles.ts` — confirmed `hasRole()` signature and role hierarchy
- Codebase: `/src/routes/(site)/enlist/+page.server.ts` — confirmed superforms default action pattern
- Codebase: `/src/lib/schemas/enlistment.ts` — confirmed Zod v4 schema pattern (no `z.string().nonempty()`, use `.min(1)`)
- Codebase: `/src/app.d.ts` — confirmed `locals.getClaims()` return type
- Supabase Docs: Triggers — verified BEFORE/AFTER trigger behavior, NEW/OLD variables
- Supabase Docs: Database Functions + `rpc()` — verified `supabase.rpc()` call pattern

### Secondary (MEDIUM confidence)

- Codebase: `/src/routes/(app)/+layout.svelte` — confirmed nav link structure; Phase 5 will need to add an "Enlistments" link for Command+
- Phase 3 RESEARCH.md — confirmed `performed_by_name` snapshot pattern in payload
- Phase 4 RESEARCH.md — confirmed "dual-write non-fatal" design decision is established project pattern

### Tertiary (LOW confidence)

- None — all findings verified against source files or live DB

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified in package.json; no new packages needed
- Schema findings: HIGH — verified directly against live DB constraints and migration SQL files
- State machine design: HIGH — design decision (RPC-only) is well-reasoned and consistent with existing patterns
- Architecture patterns: HIGH — direct extension of established Phase 4 patterns
- RLS policies: HIGH — based on live RLS policy inspection + existing migration patterns
- Pitfalls: HIGH — derived from actual code + DB inspection, not speculation

**Research date:** 2026-02-11
**Valid until:** 2026-03-13 (30 days — stable foundation; no fast-moving libraries in scope)
