---
phase: 05-enlistment-pipeline-and-personnel-actions
plan: 01
subsystem: database
tags: [supabase, postgres, rls, migrations, typescript, zod, state-machine]

# Dependency graph
requires:
  - phase: 04-awards-qualifications-roster
    provides: soldiers table with id PK, Zod v4 schema patterns established

provides:
  - "enlistments table with interview_scheduled status (5 states: pending, reviewing, interview_scheduled, accepted, rejected)"
  - "soldier_id FK column on enlistments for accept idempotency"
  - "Command+ UPDATE RLS policy on enlistments"
  - "enlistment-transitions.ts state machine (VALID_TRANSITIONS, isValidTransition, STATUS_LABELS, NEXT_STATES)"
  - "6 Zod schemas: advanceEnlistment, acceptEnlistment, promoteAction, transferAction, statusChangeAction, addNoteAction"
  - "Regenerated TypeScript types including enlistments.soldier_id column"
affects:
  - 05-02-enlistment-pipeline
  - 05-03-personnel-actions

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Enlistment state machine: VALID_TRANSITIONS map with terminal state empty arrays, isValidTransition guard function"
    - "Personnel action schemas: Zod v4 z.object with uuid() validation, z.enum() for constrained status fields"
    - "Supabase Management API for migration: POST /v1/projects/{ref}/database/query executes SQL"

key-files:
  created:
    - "supabase/migrations/20260211000007_phase5_enlistment_pipeline.sql"
    - "src/lib/enlistment-transitions.ts"
    - "src/lib/schemas/advanceEnlistment.ts"
    - "src/lib/schemas/acceptEnlistment.ts"
    - "src/lib/schemas/promoteAction.ts"
    - "src/lib/schemas/transferAction.ts"
    - "src/lib/schemas/statusChangeAction.ts"
    - "src/lib/schemas/addNoteAction.ts"
  modified:
    - "src/lib/types/database.ts"

key-decisions:
  - "State machine uses empty arrays for terminal states (accepted/rejected) rather than undefined — safer for iteration"
  - "SOLDIER_STATUSES exported from statusChangeAction.ts as const array — reusable by UI components for status display"

patterns-established:
  - "Enlistment state transitions: always validate with isValidTransition() before attempting DB UPDATE"
  - "Personnel action schemas follow Zod v4 pattern: import from 'zod', named export matching filename"

# Metrics
duration: 15min
completed: 2026-02-12
---

# Phase 5 Plan 01: Phase 5 Foundation Summary

**Enlistment state machine with 5-status constraint + soldier_id FK + Command+ UPDATE RLS, plus 6 Zod schemas for all Phase 5 forms**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-02-12T04:10:08Z
- **Completed:** 2026-02-12T04:25:00Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Applied Phase 5 DB migration: added interview_scheduled status, soldier_id FK, Command+ UPDATE RLS policy
- Created enlistment state machine with VALID_TRANSITIONS, isValidTransition guard, STATUS_LABELS, NEXT_STATES
- Created 6 Zod v4 schemas covering all Phase 5 form actions (advance/accept enlistment + promote/transfer/status-change/note)
- Regenerated TypeScript types with soldier_id column in enlistments Row/Insert/Update types

## Task Commits

Each task was committed atomically:

1. **Task 1: Apply Phase 5 migration and regenerate types** - `e7e10b1` (feat)
2. **Task 2: Create enlistment state machine and all Zod schemas** - `d0a5f41` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified
- `supabase/migrations/20260211000007_phase5_enlistment_pipeline.sql` - Adds interview_scheduled to status constraint, soldier_id FK, Command+ UPDATE RLS
- `src/lib/enlistment-transitions.ts` - State machine with VALID_TRANSITIONS, isValidTransition, STATUS_LABELS, NEXT_STATES
- `src/lib/schemas/advanceEnlistment.ts` - Zod schema for enlistment status advance (target_status)
- `src/lib/schemas/acceptEnlistment.ts` - Zod schema for accept form (rank_id, unit_id)
- `src/lib/schemas/promoteAction.ts` - Zod schema for promote/demote (new/from rank, reason)
- `src/lib/schemas/transferAction.ts` - Zod schema for transfer order (new/from unit, effective_date, reason)
- `src/lib/schemas/statusChangeAction.ts` - Zod schema for status change (new/from status enum, reason)
- `src/lib/schemas/addNoteAction.ts` - Zod schema for leadership note (note_text)
- `src/lib/types/database.ts` - Regenerated with soldier_id column in enlistments types

## Decisions Made
- State machine uses empty arrays for terminal states (accepted/rejected) rather than undefined — safer for iteration in NEXT_STATES
- SOLDIER_STATUSES exported from statusChangeAction.ts as a const array — reusable by UI components

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Plans 05-02 and 05-03 can now proceed in parallel
- enlistment-transitions.ts importable from $lib/enlistment-transitions
- All 6 Zod schemas ready for superforms integration in plans 05-02 and 05-03
- database.ts types updated with soldier_id for TypeScript safety in accept flow

---
*Phase: 05-enlistment-pipeline-and-personnel-actions*
*Completed: 2026-02-12*

## Self-Check: PASSED

All 10 files exist. Both task commits (e7e10b1, d0a5f41) verified in git log.
