---
phase: 01-foundation
plan: "02"
subsystem: auth
tags: [supabase, discord-oauth, sveltekit, cookies, jwt, session-management]

# Dependency graph
requires:
  - phase: 01-01
    provides: SvelteKit 2 + Svelte 5 project with @supabase/supabase-js and @supabase/ssr installed
provides:
  - Discord OAuth login flow via Supabase (initiate, callback, session)
  - httpOnly session cookies with path '/' via hooks.server.ts setAll handler
  - getClaims() on event.locals — JWT validation using auth.getClaims() from supabase-js v2.95.3
  - Session guard on /(app) route group redirecting unauthenticated users to /auth/login
  - /auth/login page with Discord sign-in button
  - /auth/callback handler exchanging OAuth code for session
  - /dashboard stub page for authenticated users
affects:
  - 01-04 (Custom Access Token Hook adds user_role to getClaims() output)
  - All (app) routes in all future phases (session guard protects them)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "getClaims() pattern: auth.getClaims() from @supabase/supabase-js v2.95.3 for JWT validation (not getSession)"
    - "Cookie path '/': cookies.set(name, value, { ...options, path: '/' }) in setAll — required for cross-route persistence"
    - "Route group guard: +layout.server.ts in (app) group calls getClaims() and redirects on null"
    - "OAuth form action: signInWithOAuth in +page.server.ts actions, redirects client to Discord"

key-files:
  created:
    - src/hooks.server.ts
    - src/app.d.ts
    - src/lib/supabase/server.ts
    - src/lib/supabase/client.ts
    - src/routes/auth/login/+page.server.ts
    - src/routes/auth/login/+page.svelte
    - src/routes/auth/callback/+server.ts
    - src/routes/(app)/+layout.server.ts
    - src/routes/(app)/dashboard/+page.svelte
  modified:
    - src/app.d.ts

key-decisions:
  - "getClaims() uses auth.getClaims() directly — v2.95.3 exports it natively, no manual JWT decode needed"
  - "createSupabaseServerClient uses any generic — temporary until plan 01-03 generates database.ts types"
  - "Discord OAuth initiated via form POST action, not a load function — keeps OAuth redirect server-driven"

patterns-established:
  - "Session validation: always getClaims() not getSession() in server code — getSession() unvalidated"
  - "Cookie scoping: path '/' enforced in setAll handler — without this cookies disappear on navigation"
  - "Auth guard: /(app)/+layout.server.ts pattern protects entire route group with single guard file"

# Metrics
duration: 2min
completed: 2026-02-12
---

# Phase 1 Plan 02: Discord OAuth Auth Summary

**Discord OAuth login with Supabase, httpOnly session cookies scoped to path '/', and getClaims()-based JWT validation guarding the /(app) route group**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-12T01:20:08Z
- **Completed:** 2026-02-12T01:21:47Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Supabase client factories (server + browser) implemented with cookie path '/' enforcement
- hooks.server.ts wires supabase + getClaims() onto event.locals for every request
- Discord OAuth login page, callback handler, and session-gated dashboard stub all implemented
- getClaims() uses auth.getClaims() directly (available in @supabase/supabase-js v2.95.3 — no manual JWT decode)
- npm run check: 0 errors, npm run build: clean pass

## Task Commits

Each task was committed atomically:

1. **Task 1: hooks.server.ts, Supabase client factories, and app.d.ts locals** - `0e7f2c3` (feat)
2. **Task 2: Discord OAuth routes and session-gated route group** - `08e0e6f` (feat)

**Plan metadata:** (to be added below)

## Files Created/Modified
- `src/hooks.server.ts` - Attaches supabase + getClaims() to event.locals on every request
- `src/app.d.ts` - TypeScript locals declarations: SupabaseClient + getClaims types
- `src/lib/supabase/server.ts` - createSupabaseServerClient factory with path '/' cookie enforcement
- `src/lib/supabase/client.ts` - createBrowserClient factory for browser-side usage
- `src/routes/auth/login/+page.server.ts` - Discord OAuth form action via signInWithOAuth
- `src/routes/auth/login/+page.svelte` - Login page with Discord sign-in button
- `src/routes/auth/callback/+server.ts` - OAuth code exchange via exchangeCodeForSession
- `src/routes/(app)/+layout.server.ts` - Session guard redirecting unauthenticated users to /auth/login
- `src/routes/(app)/dashboard/+page.svelte` - Authenticated landing stub showing role when available

## Decisions Made
- **getClaims() uses auth.getClaims() directly**: @supabase/supabase-js v2.95.3 exports getClaims() on the auth client — no manual JWT decode needed. The plan's fallback implementation was not required.
- **Database generic is `any` temporarily**: createSupabaseServerClient uses `any` until plan 01-03 generates the typed database.ts file. No type errors result since `any` is explicitly annotated.
- **OAuth via POST form action**: Discord OAuth is initiated from a form action (not a load function), keeping the redirect server-controlled without client-side JavaScript.

## Deviations from Plan

None - plan executed exactly as written, with one favorable deviation: `auth.getClaims()` is available natively in the installed version so the manual JWT decode fallback was not needed. The plan anticipated this case and specified using the direct form — applied as instructed.

## Issues Encountered
None.

## User Setup Required

**External services require manual configuration before Discord OAuth will work:**

### Supabase
- Set `PUBLIC_SUPABASE_URL` in `.env` (Project Settings -> API -> Project URL)
- Set `PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env` (Project Settings -> API -> anon/public key)
- Enable Discord OAuth provider (Authentication -> Providers -> Discord -> Enable)
- Set Site URL to `http://localhost:5173` (Authentication -> URL Configuration -> Site URL)
- Add redirect URL `http://localhost:5173/auth/callback` (Authentication -> URL Configuration -> Redirect URLs)

### Discord
- Create Discord Application at https://discord.com/developers/applications
- Enable OAuth2, add redirect URI: `https://[your-supabase-project].supabase.co/auth/v1/callback`
- Copy Client ID and Client Secret into Supabase Dashboard -> Authentication -> Providers -> Discord

## Next Phase Readiness
- Auth flow fully wired — ready for plan 01-03 (database schema + typed database.ts generation)
- getClaims() returns basic JWT claims now; user_role will appear after plan 01-04 activates the Custom Access Token Hook
- createSupabaseServerClient uses `any` generic — plan 01-03 will replace with proper Database type

---
*Phase: 01-foundation*
*Completed: 2026-02-12*

## Self-Check: PASSED

All required files verified present:
- src/hooks.server.ts — FOUND
- src/app.d.ts — FOUND
- src/lib/supabase/server.ts — FOUND
- src/lib/supabase/client.ts — FOUND
- src/routes/auth/login/+page.server.ts — FOUND
- src/routes/auth/login/+page.svelte — FOUND
- src/routes/auth/callback/+server.ts — FOUND
- src/routes/(app)/+layout.server.ts — FOUND
- src/routes/(app)/dashboard/+page.svelte — FOUND

All commits verified:
- 0e7f2c3 — FOUND (Task 1: Supabase client factories + hooks.server.ts + app.d.ts)
- 08e0e6f — FOUND (Task 2: Discord OAuth routes + session guard)
