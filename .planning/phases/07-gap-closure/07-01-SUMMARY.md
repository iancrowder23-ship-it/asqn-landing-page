---
phase: 07-gap-closure
plan: 01
subsystem: auth, ui, routing
tags: [sveltekit, svelte5, supabase, tailwind, routing]

# Dependency graph
requires:
  - phase: 06-events-attendance-and-admin-dashboard
    provides: (app)/events pages that needed to be migrated/deleted, soldier profile with transfer action

provides:
  - Logout route at /auth/logout (POST form action calling signOut + redirect to /)
  - Public events listing at /events under (site) route group (no auth required)
  - Assignment history template using correct payload keys (from_unit_name, to_unit_name)

affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created:
    - src/routes/auth/logout/+page.server.ts
    - src/routes/(site)/events/+page.server.ts
    - src/routes/(site)/events/+page.svelte
  modified:
    - src/routes/(app)/soldiers/[id]/+page.svelte

key-decisions:
  - "(07-gap-closure P01): Public events under (site) route group — (app)/events listing deleted to prevent /events URL conflict; auth-gated create/edit routes remain at (app)/events/new and (app)/events/[id]"
  - "(07-gap-closure P01): Logout route has no +page.svelte — POST action redirects to / before any page render"
  - "(07-gap-closure P01): Public events filter to status=scheduled with ascending date order; no admin controls visible"

patterns-established:
  - "Public route migration pattern: delete (app) listing page when creating (site) equivalent to resolve SvelteKit route group URL conflicts"

# Metrics
duration: 8min
completed: 2026-02-12
---

# Phase 7 Plan 1: Gap Closure Summary

**Logout route, public /events page for unauthenticated visitors, and assignment history payload key fix closing three v1.0 audit gaps**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-02-12T05:21:08Z
- **Completed:** 2026-02-12T05:29:00Z
- **Tasks:** 2
- **Files modified:** 4 modified/created, 2 deleted

## Accomplishments
- Created `src/routes/auth/logout/+page.server.ts` — POST form action calls `supabase.auth.signOut()` and redirects 303 to `/`; matches existing `<form method="POST" action="/auth/logout">` in the (app) layout nav
- Created public events page under `(site)/events` — filters to `status=scheduled`, ascending date order, no auth required, no admin actions; deleted conflicting `(app)/events` listing files
- Fixed `(app)/soldiers/[id]/+page.svelte` assignment history template — changed `entry.payload.from_unit` to `entry.payload.from_unit_name` and `entry.payload.to_unit` to `entry.payload.to_unit_name` to match transfer action payload keys

## Task Commits

Each task was committed atomically:

1. **Task 1: Logout route and assignment history fix** - `5e384e7` (feat)
2. **Task 2: Public events under (site), delete (app) listing** - `8829afe` (feat)

**Plan metadata:** (see final commit)

## Files Created/Modified
- `src/routes/auth/logout/+page.server.ts` - New logout route with signOut() POST action
- `src/routes/(site)/events/+page.server.ts` - Public events load: scheduled only, ascending
- `src/routes/(site)/events/+page.svelte` - Public upcoming events listing, (site) theme
- `src/routes/(app)/soldiers/[id]/+page.svelte` - Assignment history: from_unit_name / to_unit_name
- `src/routes/(app)/events/+page.server.ts` - DELETED (route conflict prevention)
- `src/routes/(app)/events/+page.svelte` - DELETED (route conflict prevention)

## Decisions Made
- Public events placed under `(site)` not `(app)` — unauthenticated visitors need to browse /events without login redirect
- `(app)/events` listing files deleted (not just emptied) — SvelteKit route groups are URL-transparent, both would resolve to `/events` causing build error
- Auth-gated create/edit routes `(app)/events/new` and `(app)/events/[id]` preserved — they are at distinct URL paths and must remain auth-protected
- No `+page.svelte` created for logout route — the action redirects before any page render, so no UI needed

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None — build completed cleanly. Pre-existing Svelte 5 `state_referenced_locally` warnings in superforms usage (not introduced by this plan) are non-blocking warnings.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All three v1.0 audit gaps are closed
- Logout works for authenticated users via the (app) nav bar
- Public /events page accessible without login
- Transfer assignment history displays correct unit names
- No known remaining gaps; project is at v1.0 feature complete state

---
*Phase: 07-gap-closure*
*Completed: 2026-02-12*
