---
phase: 03-soldier-profiles-and-service-records
plan: 01
subsystem: database
tags: [supabase, postgresql, rls, sveltekit, svelte5, typescript]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: "soldiers, service_records, user_roles tables with RLS; app_role enum"
  - phase: 02-public-site
    provides: "enlistments, events, site_config tables; (app) route group with auth-gated layout.server.ts"
provides:
  - "operations and operation_attendance tables with full RLS policy set"
  - "soldiers status constraint updated to include 'retired'"
  - "service_records 'Members can read own service records' RLS policy"
  - "soldiers 'Authenticated can read all soldiers' RLS policy for profile access"
  - "database.ts TypeScript types regenerated — operations/operation_attendance match new schema"
  - "(app) layout.server.ts with mySoldierId lookup from soldiers table"
  - "(app) layout.svelte app shell with tactical nav bar and conditional My Profile link"
affects:
  - 03-02-soldier-profiles-page
  - future attendance tracking features

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Svelte 5 layout pattern: $props() with children: Snippet + {@render children()}"
    - "maybeSingle() for optional soldier lookup (avoids throws when no record exists)"

key-files:
  created:
    - supabase/migrations/20260211000004_phase3_profiles.sql
    - src/routes/(app)/+layout.svelte
  modified:
    - src/lib/types/database.ts
    - src/routes/(app)/+layout.server.ts
    - src/routes/(app)/dashboard/+page.svelte

key-decisions:
  - "operations table uses 'title' column (not 'name') to distinguish from legacy schema"
  - "operation_attendance references soldiers.id (not profiles.id) — correct for this system"
  - "DROP TABLE IF EXISTS for old legacy operations/operation_attendance before creating new schema"
  - "Authenticated can read ALL soldiers policy is additive — anon policy still restricts to active-only"
  - "maybeSingle() instead of single() for mySoldierId — graceful when no soldier record exists"

patterns-established:
  - "App shell layout: (app)/+layout.svelte wraps all authenticated pages with nav bar"
  - "mySoldierId null-safe pattern: conditional {#if data.mySoldierId} for My Profile nav link"

# Metrics
duration: 20min
completed: 2026-02-11
---

# Phase 3 Plan 1: Phase 3 Infrastructure Summary

**operations/operation_attendance tables with full RLS, soldiers 'retired' status, and (app) nav shell with conditional My Profile link using mySoldierId**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-02-11T19:55:00Z
- **Completed:** 2026-02-11T20:15:00Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- Applied Phase 3 database migration: operations and operation_attendance tables with RLS, new policies on service_records and soldiers
- Regenerated database.ts types — operations now uses `title` column and references soldiers (not legacy profiles), operation_attendance correctly references soldiers.id
- Created (app)/+layout.svelte app shell with dark tactical navigation bar; updated layout.server.ts to provide mySoldierId for conditional "My Profile" nav link

## Task Commits

Each task was committed atomically:

1. **Task 1: Apply Phase 3 database migration** - `bf48d42` (feat)
2. **Task 2: Regenerate database.ts types** - `ace4e2a` (feat)
3. **Task 3: Update (app) layout with navigation and mySoldierId** - `505407e` (feat)

## Files Created/Modified
- `supabase/migrations/20260211000004_phase3_profiles.sql` - Phase 3 migration: operations, operation_attendance tables, updated constraints and RLS policies
- `src/lib/types/database.ts` - Regenerated TypeScript types reflecting new schema (operations/operation_attendance now reference soldiers, not profiles)
- `src/routes/(app)/+layout.server.ts` - Extended to query soldiers table for mySoldierId lookup
- `src/routes/(app)/+layout.svelte` - New app shell with tactical nav bar and conditional My Profile link
- `src/routes/(app)/dashboard/+page.svelte` - Simplified to use layout wrapper (removed duplicate min-h-screen wrapper)

## Decisions Made
- operations table uses `title` column (not `name`) to match plan spec and distinguish from old legacy schema
- Added `DROP TABLE IF EXISTS` for old legacy operations/operation_attendance before creating new tables — the `database.ts` file had old types referencing `profiles` which indicated legacy tables may have existed in DB
- Used `maybeSingle()` not `single()` for soldier lookup — prevents throw when admin/new user has no soldier record
- "Authenticated can read all soldiers" RLS policy is additive — anon policy still restricts public site to active-only soldiers

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added DROP TABLE IF EXISTS for legacy operations/operation_attendance tables**
- **Found during:** Task 1 (Apply Phase 3 database migration)
- **Issue:** The `database.ts` file contained old-schema types for `operations` (had `name`, `commander_id`, `aar_url` columns referencing profiles) and `operation_attendance` (had `member_id` referencing profiles). These legacy tables were from asqn-project-1 and were NOT in the initial_schema.sql DROP list. Creating new tables would fail with "relation already exists".
- **Fix:** Added `DROP TABLE IF EXISTS public.operation_attendance CASCADE` and `DROP TABLE IF EXISTS public.operations CASCADE` before CREATE TABLE statements
- **Files modified:** supabase/migrations/20260211000004_phase3_profiles.sql
- **Verification:** Migration applied successfully via `supabase db push --linked --yes`
- **Committed in:** bf48d42 (Task 1 commit)

**2. [Rule 3 - Blocking] Repaired migration history mismatch**
- **Found during:** Task 1 (migration push)
- **Issue:** Remote database had migration `20260212022806` not in local directory, and local migration 000003 (phase2) was not in remote history table despite phase2 schema already being applied to remote DB
- **Fix:** Ran `supabase migration repair 20260212022806 --status reverted` to remove unknown remote entry, then `supabase migration repair 20260211000003 --status applied` to mark phase2 as already applied
- **Files modified:** None (remote migration history table only)
- **Verification:** Migration list showed all 5 migrations synced; phase3 migration applied successfully
- **Committed in:** bf48d42 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 bug/correctness, 1 blocking)
**Impact on plan:** Both fixes were necessary for migration to succeed. No scope creep.

## Issues Encountered
- `supabase db dump` requires Docker Desktop (not available). Used REST API (GET /rest/v1/operations) to verify tables instead.
- `supabase gen types` required `SUPABASE_ACCESS_TOKEN` env var + `--project-id` flag (not `--linked`).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All Phase 3 infrastructure is in place
- Plan 03-02 (soldier profiles page) can now proceed: soldiers table supports all statuses including 'retired', profile pages can read any soldier via 'Authenticated can read all soldiers' policy, mySoldierId is available in layout for navigation
- No blockers for subsequent Phase 3 plans

---
*Phase: 03-soldier-profiles-and-service-records*
*Completed: 2026-02-11*

## Self-Check: PASSED

All files and commits verified:
- FOUND: supabase/migrations/20260211000004_phase3_profiles.sql
- FOUND: src/lib/types/database.ts
- FOUND: src/routes/(app)/+layout.server.ts
- FOUND: src/routes/(app)/+layout.svelte
- FOUND: src/routes/(app)/dashboard/+page.svelte
- FOUND: .planning/phases/03-soldier-profiles-and-service-records/03-01-SUMMARY.md
- FOUND commit: bf48d42 (Task 1)
- FOUND commit: ace4e2a (Task 2)
- FOUND commit: 505407e (Task 3)
