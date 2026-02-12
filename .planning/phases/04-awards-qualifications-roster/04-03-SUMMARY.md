---
phase: 04-awards-qualifications-roster
plan: 03
subsystem: ui
tags: [svelte5, runes, roster, sveltekit, supabase, tailwind]

# Dependency graph
requires:
  - phase: 03-soldier-profiles-and-service-records
    provides: "soldiers table with rank/unit joins, soldier profile pages at /soldiers/[id]"
provides:
  - "(app)/roster page with card grid, unit tree, and sortable/filterable table views"
  - "RosterCard.svelte: soldier card component with rank insignia and profile link"
  - "RosterTreeNode.svelte: recursive tree component for hierarchical unit/soldier view"
  - "Roster nav link in authenticated app shell"
affects: [05-promotion-workflow, any-phase-using-soldier-listing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Three-view toggle using Svelte 5 $state (no page reload)"
    - "$derived for filtered/sorted table data"
    - "buildTree/buildNode recursive functions for unit hierarchy"
    - "Normalize FK joins pattern (Array.isArray check) applied to roster load"

key-files:
  created:
    - src/routes/(app)/roster/+page.server.ts
    - src/routes/(app)/roster/+page.svelte
    - src/lib/components/RosterCard.svelte
    - src/lib/components/RosterTreeNode.svelte
  modified:
    - src/routes/(app)/+layout.svelte
    - src/routes/(site)/+layout.svelte

key-decisions:
  - "Internal roster at /roster replaces public (site)/roster — auth-required, richer feature set supersedes simple public table"
  - "Public site nav updated to remove /roster link (now auth-protected)"
  - "RosterTreeNode is a new component, not reusing OrbatNode — needs soldier IDs and profile links that OrbatNode lacks"

patterns-established:
  - "Route group conflict resolution: (app)/X takes precedence over (site)/X when feature requires auth"
  - "Three-view pattern: $state toggle + $derived for computed views, all client-side"

# Metrics
duration: 3min
completed: 2026-02-12
---

# Phase 4 Plan 03: Roster Page Summary

**Three-view authenticated roster at /roster with card grid, recursive unit tree, and sortable/filterable table using Svelte 5 $state and $derived**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-12T03:28:24Z
- **Completed:** 2026-02-12T03:31:15Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Roster page with three client-side views: card grid (rank insignia + callsign), hierarchical unit tree (Squadron > Troop > Soldier), and sortable/filterable table
- RosterCard and RosterTreeNode reusable components with profile links to /soldiers/[id]
- Server load function fetching active soldiers with rank/unit joins plus all units for tree construction
- Roster nav link added to authenticated app shell

## Task Commits

1. **Task 1: Create roster server load function and reusable components** - `59dd78d` (feat)
2. **Task 2: Build roster page with three-view toggle and add nav link** - `54cced8` (feat)

**Plan metadata:** (pending docs commit)

## Files Created/Modified

- `src/routes/(app)/roster/+page.server.ts` - Server load: active soldiers with rank/unit joins + all units
- `src/routes/(app)/roster/+page.svelte` - Three-view roster page with $state toggle, $derived filter/sort
- `src/lib/components/RosterCard.svelte` - Soldier card for grid view with rank insignia and profile link
- `src/lib/components/RosterTreeNode.svelte` - Recursive tree node for unit hierarchy view
- `src/routes/(app)/+layout.svelte` - Added Roster nav link
- `src/routes/(site)/+layout.svelte` - Removed /roster link (now auth-protected)

## Decisions Made

- Internal roster at `/roster` replaces the public `(site)/roster` — the auth-protected version with three views supersedes the simple public table. Route conflict required one to take the URL; the richer authenticated feature won.
- `RosterTreeNode.svelte` is a new component rather than reusing `OrbatNode.svelte` — OrbatNode uses raw `ranks` FK objects; the roster needs normalized soldier IDs and profile links.
- `(site)/+layout.svelte` nav updated to remove Roster link since it now redirects unauthenticated visitors to login.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Resolved route URL conflict between (app)/roster and (site)/roster**
- **Found during:** Task 1 (build verification)
- **Issue:** SvelteKit route groups don't change URL paths, so both `(app)/roster` and `(site)/roster` resolve to `/roster` — build failed with "routes conflict" error
- **Fix:** Removed `(site)/roster` pages (superseded by richer auth-protected roster) and removed the Roster nav link from the public site layout
- **Files modified:** `src/routes/(site)/roster/` (deleted), `src/routes/(site)/+layout.svelte` (nav updated)
- **Verification:** `npm run build` passes after fix
- **Committed in:** `59dd78d` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Route conflict was a build-blocking issue requiring removal of the simpler public roster. The new auth-protected roster at the same URL is strictly more capable. No scope creep.

## Issues Encountered

None beyond the route conflict documented above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Roster complete with all three views and profile links
- Ready for Phase 5 (Promotion Workflow) — roster is the primary soldiers-list UI surface
- Awards/qualifications display on soldier profiles (Phase 4 plans 01-02) integrates naturally with roster links

---
*Phase: 04-awards-qualifications-roster*
*Completed: 2026-02-12*

## Self-Check: PASSED

- src/routes/(app)/roster/+page.server.ts: FOUND
- src/routes/(app)/roster/+page.svelte: FOUND
- src/lib/components/RosterCard.svelte: FOUND
- src/lib/components/RosterTreeNode.svelte: FOUND
- Commit 59dd78d: FOUND
- Commit 54cced8: FOUND
