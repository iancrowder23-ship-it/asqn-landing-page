---
phase: 05-enlistment-pipeline-and-personnel-actions
plan: 02
subsystem: ui
tags: [sveltekit, supabase, superforms, zod4, state-machine, enlistment]

# Dependency graph
requires:
  - phase: 05-01
    provides: enlistments table migration, enlistment-transitions.ts state machine, advanceEnlistment/acceptEnlistment schemas

provides:
  - Enlistment review queue page at /(app)/enlistments with status filter tabs and count badges
  - Application detail page at /(app)/enlistments/[id] with advance/accept/reject actions
  - Auto-creates soldier profile on accept with service record entry and idempotency via soldier_id
  - Enlistments nav link in app layout visible to NCO+ only
affects:
  - 05-03
  - any future enlistment-related routes

# Tech tracking
tech-stack:
  added: []
  patterns:
    - superForm with dataType form for named actions in detail page
    - Idempotency check via soldier_id before creating duplicate soldier
    - Fetch DB state server-side before state transitions (never trust client data)
    - Non-fatal service_records dual-write (soldier creation is primary, SR failure is logged only)

key-files:
  created:
    - src/routes/(app)/enlistments/+page.server.ts
    - src/routes/(app)/enlistments/+page.svelte
    - src/routes/(app)/enlistments/[id]/+page.server.ts
    - src/routes/(app)/enlistments/[id]/+page.svelte
  modified:
    - src/routes/(app)/+layout.svelte

key-decisions:
  - "Idempotency via soldier_id: acceptApplication checks enlistment.soldier_id before creating soldier — safe to retry on transient failure"
  - "discord_username is display string not snowflake: do NOT set discord_id on new soldier from enlistment data"
  - "Reject action uses fail() not message() since it has no superform — plain POST form"

patterns-established:
  - "State machine checks: always fetch current status from DB in action, never use client-provided status"
  - "Terminal state display: accepted links to soldier profile if soldier_id is set"

# Metrics
duration: 2min
completed: 2026-02-12
---

# Phase 5 Plan 02: Enlistment Review Queue and Pipeline Summary

**Full enlistment pipeline UI — NCO+ queue with status tabs, Command+ advance/accept/deny actions, auto-creates soldier profile on accept with service record and idempotency guard**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-12T04:16:03Z
- **Completed:** 2026-02-12T04:18:03Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Enlistment review queue page (`/enlistments`) with status filter tabs (all/pending/reviewing/interview_scheduled) and count badges
- Application detail page (`/enlistments/[id]`) with full application data display and state-machine-driven action buttons for Command+
- Accept action auto-creates soldier profile (display_name, rank_id, unit_id), writes service_records enlistment entry, sets soldier_id on enlistment for idempotency
- Invalid state transitions return 400 with descriptive error via superforms message()
- NCO sees read-only queue; Command+ sees action buttons; terminal states show final decision with soldier profile link
- Enlistments nav link added to app layout, visible to NCO+ only

## Task Commits

Each task was committed atomically:

1. **Task 1: Create enlistment review queue page and application detail page with actions** - `e4f8fb0` (feat)
2. **Task 2: Add Enlistments nav link for NCO+ users** - `5a15c34` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/routes/(app)/enlistments/+page.server.ts` - Queue load function with NCO+ gate and non-terminal application fetch
- `src/routes/(app)/enlistments/+page.svelte` - Review queue page with status filter tabs, count badges, and application table
- `src/routes/(app)/enlistments/[id]/+page.server.ts` - Application detail load + advance/acceptApplication/reject named actions
- `src/routes/(app)/enlistments/[id]/+page.svelte` - Detail view with state transition buttons, accept panel with rank/unit select, terminal state display
- `src/routes/(app)/+layout.svelte` - Added Enlistments nav link for NCO+ users

## Decisions Made

- **Idempotency via soldier_id:** `acceptApplication` action checks `enlistment.soldier_id` before creating a soldier. If already set, updates status and redirects — safe to retry on transient failure without creating duplicate soldiers.
- **discord_username is display string not snowflake:** Plan note honored — `discord_id` is NOT set on new soldier. `discord_username` from the enlistment form is a human-readable string, not a Discord snowflake ID.
- **reject action uses fail() not message():** The reject form is a plain POST form (no superform), so it uses `fail()` to return error state rather than `message()` which requires a SuperValidated form object.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Full enlistment pipeline UI complete: queue, detail, advance, accept (with soldier creation), deny
- Plan 05-03 can now proceed (personnel actions: promotion, status change, transfer, notes)
- The `/enlistments` route is fully functional for NCO+, Command+, and Admin roles

---
*Phase: 05-enlistment-pipeline-and-personnel-actions*
*Completed: 2026-02-12*

## Self-Check: PASSED

- FOUND: src/routes/(app)/enlistments/+page.server.ts
- FOUND: src/routes/(app)/enlistments/+page.svelte
- FOUND: src/routes/(app)/enlistments/[id]/+page.server.ts
- FOUND: src/routes/(app)/enlistments/[id]/+page.svelte
- FOUND: .planning/phases/05-enlistment-pipeline-and-personnel-actions/05-02-SUMMARY.md
- FOUND commit: e4f8fb0 (Task 1)
- FOUND commit: 5a15c34 (Task 2)
