---
phase: 06-events-attendance-and-admin-dashboard
plan: 03
subsystem: ui
tags: [sveltekit, supabase, superforms, zod, tailwind, operations, attendance]

# Dependency graph
requires:
  - phase: 06-01
    provides: RLS policies on operations and operation_attendance tables, createOperationSchema, recordAttendanceSchema, formatDate utility, OPERATION_TYPES, ATTENDANCE_STATUSES
provides:
  - Operations list page at /operations (NCO+ gate, shows all operations with type/status badges)
  - Create operation form at /operations/new (superforms validation, inserts to operations table)
  - Operation detail page at /operations/{id} (shows all active/LOA soldiers with per-row attendance forms)
  - Per-row attendance upsert with onConflict soldier_id,operation_id (prevents duplicates)
affects:
  - soldier profile pages (operation_attendance rows are already queried by soldiers/[id] combat record)
  - phase 06-04 (admin dashboard may reference operation counts)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Per-row form pattern with plain use:enhance (not superforms) — each row is its own <form> element posting to named action
    - Attendance map pattern — existingAttendance built server-side as Record<soldier_id, attendance> for O(1) lookup in template
    - Form-as-div-row pattern — form wraps div row instead of <form> as <tr> child (invalid HTML), avoids Svelte node_invalid_placement error

key-files:
  created:
    - src/routes/(app)/operations/+page.server.ts
    - src/routes/(app)/operations/+page.svelte
    - src/routes/(app)/operations/new/+page.server.ts
    - src/routes/(app)/operations/new/+page.svelte
    - src/routes/(app)/operations/[id]/+page.server.ts
    - src/routes/(app)/operations/[id]/+page.svelte
  modified: []

key-decisions:
  - "Per-row forms use plain use:enhance from $app/forms (not superforms) — each soldier row has its own <form> element; server still uses superValidate for validation"
  - "form-wraps-row layout uses CSS grid inside a div rather than a table — avoids form-as-tr-child HTML constraint that Svelte enforces"
  - "existingAttendance map built server-side as Record<soldier_id, {status, role_held, notes}> — O(1) lookup avoids nested loops in template"
  - "Attendance status select has no empty default — first status (present) is auto-selected to match the enum's first value"

patterns-established:
  - "Per-row form pattern: one <form method=POST use:enhance> per data row, each posting to same named action, with hidden inputs for row identity"
  - "CSS grid roster row: div.grid instead of table/tr to avoid HTML validity constraints when form wraps a row"

# Metrics
duration: 20min
completed: 2026-02-12
---

# Phase 6 Plan 3: Operations Management Summary

**NCO+-only operations CRUD with per-soldier attendance recording via per-row forms and upsert, linking to soldier service records**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-02-12T04:51:19Z
- **Completed:** 2026-02-12T05:11:00Z
- **Tasks:** 2
- **Files modified:** 6 created

## Accomplishments
- Operations list at /operations with operation/training/ftx type badges and scheduled/completed/cancelled status badges, ordered by date descending
- Create operation form at /operations/new with superforms validation, status defaulting to 'completed' (per plan spec — most operations recorded after the fact)
- Operation detail page at /operations/{id} showing all active/LOA soldiers (excludes discharged/retired/inactive) with per-row attendance forms
- Attendance recording upserts into operation_attendance with onConflict 'soldier_id,operation_id' — re-recording same soldier updates rather than duplicates
- Existing attendance pre-filled in forms (status select, role_held, notes) and shown as color-coded current-status badge per row

## Task Commits

Each task was committed atomically:

1. **Task 1: Operations list and create operation pages** - `6581320` (feat)
2. **Task 2: Operation detail page with per-row attendance recording** - `4bfadc1` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/routes/(app)/operations/+page.server.ts` - Operations list load with NCO+ gate, queries operations ordered by date desc
- `src/routes/(app)/operations/+page.svelte` - Operations list with type/status badges and attendance links
- `src/routes/(app)/operations/new/+page.server.ts` - Create operation load + default action with NCO+ gate, inserts into operations table
- `src/routes/(app)/operations/new/+page.svelte` - Create operation form using superforms with all fields
- `src/routes/(app)/operations/[id]/+page.server.ts` - Operation detail load + recordAttendance named action with upsert
- `src/routes/(app)/operations/[id]/+page.svelte` - Operation detail header + per-soldier attendance roster with per-row forms

## Decisions Made
- Per-row forms use plain `use:enhance` from `$app/forms` (not superforms) — each soldier row is its own `<form>` element; server still uses `superValidate` for validation. This avoids complexity of multiple superForm instances (plan spec confirmed this approach).
- Form-as-div-row layout: used CSS grid div rows instead of a table with form-as-tr to avoid Svelte's `node_invalid_placement` error (form cannot be child of tr). This was discovered during svelte-check and fixed as deviation Rule 1.
- `existingAttendance` map built server-side as `Record<soldier_id, {id, status, role_held, notes}>` for O(1) lookup in the template.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Restructured attendance roster from table to CSS grid rows**
- **Found during:** Task 2 (Operation detail page)
- **Issue:** Initial implementation used `<form>` as direct child of `<tr>` which is invalid HTML. Svelte enforces this with a node_invalid_placement error: `<form>` cannot be a child of `<tr>`.
- **Fix:** Replaced `<table>/<tr>/<td>` roster layout with CSS grid `<div>` rows where each `<form>` wraps the entire row div. Added a `hidden md:grid` column header row for visual alignment.
- **Files modified:** `src/routes/(app)/operations/[id]/+page.svelte`
- **Verification:** svelte-check shows no errors in operations files after fix
- **Committed in:** `4bfadc1` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - invalid HTML structure)
**Impact on plan:** Fix maintains identical functionality with valid HTML. Visual output and UX behavior unchanged.

## Issues Encountered
- `svelte-kit sync` initially failed with route conflict message about `/(app)/events` vs `/(site)/events` — this was a stale state from plan 06-02 running in parallel which had deleted `(site)/events` files but not yet committed. Running `svelte-kit sync` a second time succeeded once the filesystem state was consistent.
- Pre-existing svelte-check errors (42 errors before, 9 after) were in files from earlier phases — none introduced by this plan. The reduction is due to svelte-kit sync regenerating types properly after the events route changes from plan 06-02.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Operations management is complete — NCO+ can create operations and record per-soldier attendance
- Soldier profile pages at /soldiers/{id} already query operation_attendance for combat record and attendance stats (those queries were written in Phase 3 anticipating this table)
- Phase 06-04 (admin dashboard) can reference operations counts and attendance data without changes to these routes

## Self-Check

### Files exist:
- FOUND: src/routes/(app)/operations/+page.server.ts
- FOUND: src/routes/(app)/operations/+page.svelte
- FOUND: src/routes/(app)/operations/new/+page.server.ts
- FOUND: src/routes/(app)/operations/new/+page.svelte
- FOUND: src/routes/(app)/operations/[id]/+page.server.ts
- FOUND: src/routes/(app)/operations/[id]/+page.svelte

### Commits exist:
- FOUND: 6581320 — feat(06-03): operations list and create operation pages
- FOUND: 4bfadc1 — feat(06-03): operation detail page with per-row attendance recording

## Self-Check: PASSED

---
*Phase: 06-events-attendance-and-admin-dashboard*
*Completed: 2026-02-12*
