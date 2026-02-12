---
phase: 06-events-attendance-and-admin-dashboard
plan: 01
subsystem: database
tags: [supabase, rls, zod, svelte, typescript, postgresql]

# Dependency graph
requires:
  - phase: 05-enlistment-pipeline-and-personnel-actions
    provides: enlistment pipeline complete, Zod v4 patterns established, RLS policies for enlistments
  - phase: 04-awards-qualifications-roster
    provides: events table exists with INSERT policy, operations/operation_attendance tables with RLS
  - phase: 01-foundation
    provides: app_role enum, hasRole() function, auth JWT patterns
provides:
  - NCO+ UPDATE RLS policy on public.events table
  - createEventSchema — Zod v4 schema for event creation with EVENT_TYPES const
  - editEventSchema — Zod v4 schema for event editing with status field and EVENT_STATUSES const
  - createOperationSchema — Zod v4 schema for operation records with OPERATION_TYPES and OPERATION_STATUSES consts
  - recordAttendanceSchema — Zod v4 per-row attendance schema with ATTENDANCE_STATUSES const
  - formatDate utility at $lib/utils/date — military Zulu time format
  - Updated app nav with Events (all authenticated) and Operations (NCO+ gated) links
affects:
  - 06-02-events-crud
  - 06-03-operations-attendance
  - 06-04-admin-dashboard

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Zod v4 enum with error message: z.enum(TYPES, { error: 'message' })"
    - "Const arrays exported alongside schemas for UI reuse (EVENT_TYPES, ATTENDANCE_STATUSES, etc.)"
    - "Shared utility at $lib/utils/ for cross-route helpers"
    - "Migration repair via supabase migration repair --status applied to fix history gaps"

key-files:
  created:
    - supabase/migrations/20260211000008_phase6_events_update_rls.sql
    - src/lib/schemas/createEvent.ts
    - src/lib/schemas/editEvent.ts
    - src/lib/schemas/createOperation.ts
    - src/lib/schemas/recordAttendance.ts
    - src/lib/utils/date.ts
  modified:
    - src/routes/(app)/+layout.svelte

key-decisions:
  - "formatDate uses em-dash (U+2014) separator matching the existing (site)/events implementation"
  - "Operations link is NCO+ gated (placed inside existing hasRole nco block with Enlistments)"
  - "Supabase migration repair used to mark 20260211000007 as applied before 20260211000008 could run"
  - "recordAttendanceSchema is per-row (not bulk array) as recommended in phase research for small rosters"

patterns-established:
  - "Schema files: import z from 'zod', export schema + const arrays together"
  - "Utils directory: src/lib/utils/ for shared non-component TypeScript helpers"

# Metrics
duration: 15min
completed: 2026-02-12
---

# Phase 6 Plan 01: Foundation Summary

**NCO+ UPDATE RLS policy on events, four Zod v4 schemas with exported const arrays, military Zulu formatDate utility, and Events/Operations nav links**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-02-12T04:44:00Z
- **Completed:** 2026-02-12T04:59:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Applied migration adding NCO+ UPDATE policy on public.events — unblocks event status changes from UI
- Created 4 Zod v4 validation schemas covering event creation, event editing, operation creation, and per-row attendance recording — all with exportable const arrays for UI dropdowns
- Extracted formatDate utility to $lib/utils/date using military Zulu time format matching existing public site implementation
- Updated app navigation with Events link (all users) and Operations link (NCO+ gated)

## Task Commits

Each task was committed atomically:

1. **Task 1: Database migration and Zod schemas** - `fb3741e` (feat)
2. **Task 2: Shared date utility and navigation links** - `392bcd6` (feat)

## Files Created/Modified

- `supabase/migrations/20260211000008_phase6_events_update_rls.sql` - NCO+ UPDATE policy on events table
- `src/lib/schemas/createEvent.ts` - createEventSchema + EVENT_TYPES const
- `src/lib/schemas/editEvent.ts` - editEventSchema + EVENT_TYPES + EVENT_STATUSES consts
- `src/lib/schemas/createOperation.ts` - createOperationSchema + OPERATION_TYPES + OPERATION_STATUSES consts
- `src/lib/schemas/recordAttendance.ts` - recordAttendanceSchema + ATTENDANCE_STATUSES const
- `src/lib/utils/date.ts` - formatDate utility (military Zulu time, em-dash separator)
- `src/routes/(app)/+layout.svelte` - Added Events and Operations nav links

## Decisions Made

- formatDate uses em-dash (U+2014) separator matching the original in (site)/events/+page.svelte for consistency
- Operations link placed inside the existing `{#if hasRole(data.userRole, 'nco')}` block alongside Enlistments
- recordAttendanceSchema is per-row (not bulk array) per phase research — simpler for small milsim rosters
- Supabase migration repair command used to sync history: 20260211000007 had been applied but not recorded, blocking 20260211000008

## Deviations from Plan

None - plan executed exactly as written.

**Note on migration repair:** Not a deviation — the `supabase migration repair` step was a necessary operational fix to sync migration history with actual DB state before applying the new migration. The migration SQL itself was applied exactly as specified.

## Issues Encountered

- Migration 20260211000007 was applied to the DB in Phase 5 but not recorded in the Supabase migration history table, causing `migration up` to fail on conflict. Fixed using `supabase migration repair 20260211000007 --status applied`, then `migration up` applied 20260211000008 cleanly.
- Supabase Management API returned 403 for direct SQL execution (token limitation), fell back to CLI with repair step.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All Wave 2 plans can now run in parallel:
  - 06-02: Events CRUD at /events (uses createEventSchema, editEventSchema, formatDate, NCO+ UPDATE policy)
  - 06-03: Operations + attendance at /operations (uses createOperationSchema, recordAttendanceSchema, formatDate)
  - 06-04: Admin dashboard (uses nav foundation, reads events/operations data)
- No blockers for Wave 2 execution

---
*Phase: 06-events-attendance-and-admin-dashboard*
*Completed: 2026-02-12*

## Self-Check: PASSED

All files verified:
- FOUND: supabase/migrations/20260211000008_phase6_events_update_rls.sql
- FOUND: src/lib/schemas/createEvent.ts (exports createEventSchema, EVENT_TYPES)
- FOUND: src/lib/schemas/editEvent.ts (exports editEventSchema, EVENT_STATUSES)
- FOUND: src/lib/schemas/createOperation.ts (exports createOperationSchema, OPERATION_TYPES, OPERATION_STATUSES)
- FOUND: src/lib/schemas/recordAttendance.ts (exports recordAttendanceSchema, ATTENDANCE_STATUSES)
- FOUND: src/lib/utils/date.ts (exports formatDate)
- FOUND: src/routes/(app)/+layout.svelte (contains /events and /operations links)

All commits verified:
- FOUND: fb3741e (Task 1: RLS migration and Zod schemas)
- FOUND: 392bcd6 (Task 2: formatDate utility and navigation)
