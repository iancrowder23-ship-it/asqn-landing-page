---
phase: 01-foundation
plan: "04"
subsystem: auth
tags: [jwt, supabase, rls, postgresql, sveltekit, discord-oauth, rbac]

# Dependency graph
requires:
  - phase: 01-foundation/01-02
    provides: Discord OAuth login, Supabase session cookies, /(app) route guard
  - phase: 01-foundation/01-03
    provides: app_role enum, user_roles table, RLS-enabled schema

provides:
  - Custom Access Token Hook SQL function (public.custom_access_token_hook) injecting user_role into every JWT
  - TypeScript role constants (APP_ROLES, AppRole), hierarchy helper (hasRole()), display helper (roleLabel())
  - End-to-end verified auth flow: Discord OAuth login → JWT with user_role → /dashboard showing role label
  - RLS policies that can evaluate auth.jwt() ->> 'user_role' without an additional DB round-trip per request

affects:
  - All subsequent phases that use RLS with role checks
  - Phase 2 onward: any feature page that shows role-gated UI
  - Any server load function that calls hasRole() for route protection

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Custom Access Token Hook pattern — Supabase Auth hook calling a plpgsql security definer function
    - Role hierarchy with numeric weights (admin=4, command=3, nco=2, member=1) — hasRole() uses >= comparison
    - supabase_auth_admin-only table access — user_roles is revoked from authenticated/anon, granted to auth admin
    - JWT-embedded roles — user_role in JWT payload, readable via auth.jwt() ->> 'user_role' in RLS

key-files:
  created:
    - supabase/migrations/20260211000002_custom_access_token_hook.sql
    - src/lib/auth/roles.ts
  modified:
    - src/routes/(app)/dashboard/+page.svelte

key-decisions:
  - "Hook registered in Supabase Dashboard (not via SQL migration) — the Dashboard UI step is unavoidable"
  - "Discord OAuth required explicit enabling in Supabase Dashboard before OAuth flow worked — not enabled by default"
  - "user_roles table access revoked from authenticated/anon entirely — only supabase_auth_admin can read it, preventing role spoofing via direct query"

patterns-established:
  - "Role check pattern: hasRole(data.userRole, 'nco') for UI gates — never as security enforcement"
  - "JWT role claim: user_role string value matching app_role enum ('admin'|'command'|'nco'|'member')"
  - "Hook null path: user with no role in user_roles gets user_role: null in JWT — RLS denies cleanly"

# Metrics
duration: 45min
completed: 2026-02-11
---

# Phase 1 Plan 04: Custom Access Token Hook Summary

**PostgreSQL hook function injects user_role into Supabase JWTs at login/refresh, enabling zero-extra-query RLS role enforcement across all protected tables**

## Performance

- **Duration:** ~45 min (including Dashboard setup and end-to-end verification)
- **Started:** 2026-02-11T18:47:10Z
- **Completed:** 2026-02-11
- **Tasks:** 2 (1 auto + 1 human-verify)
- **Files modified:** 3

## Accomplishments

- Custom Access Token Hook deployed and registered — every JWT issued by Supabase now carries user_role claim
- TypeScript role system with 4-tier hierarchy (admin/command/nco/member) and hasRole()/roleLabel() helpers
- Full end-to-end auth verified: Discord OAuth → JWT with user_role at jwt.io → Dashboard showing "Role: Member" → session persists on refresh → unauthenticated access redirects to login

## Task Commits

Each task was committed atomically:

1. **Task 1: Custom Access Token Hook SQL migration and TypeScript role helpers** - `91de06f` (feat)
2. **Task 2: Register hook in Supabase Dashboard and verify end-to-end auth flow** - HUMAN VERIFIED (no files)

## Files Created/Modified

- `supabase/migrations/20260211000002_custom_access_token_hook.sql` - Hook function, supabase_auth_admin grants, and permissive RLS policy for auth admin on user_roles
- `src/lib/auth/roles.ts` - APP_ROLES constant, AppRole type, ROLE_HIERARCHY weights, hasRole() and roleLabel() exports
- `src/routes/(app)/dashboard/+page.svelte` - Added roleLabel(data.userRole) display to confirm hook is active

## Decisions Made

- **Hook Dashboard registration is unavoidable** — there is no SQL/CLI mechanism to register an Auth Hook; it must be done in the Supabase Dashboard UI under Authentication > Hooks.
- **Discord provider needed explicit enabling** — Discord OAuth was not enabled by default in the Supabase project; the user had to enable it in Authentication > Providers before OAuth flow would work. This was caught during end-to-end verification.
- **user_roles fully locked down** — REVOKE ALL from authenticated/anon ensures no user can query their own or others' roles directly. Only supabase_auth_admin (the hook caller) has SELECT access. This prevents role escalation via direct table read.

## Deviations from Plan

None — plan executed exactly as written. The Discord provider not being enabled was a user setup step discovered during the human-verify checkpoint (not a code issue), and was resolved by the user before approval.

## Issues Encountered

- **Discord OAuth provider not enabled** — During end-to-end verification (Task 2), the user found Discord was not enabled in Supabase Authentication > Providers. The user enabled it before completing verification. This is a one-time setup step, not a recurring concern.

## User Setup Required

The following Dashboard steps were required and completed:

1. **Registered Custom Access Token Hook** — Supabase Dashboard > Authentication > Hooks > Custom Access Token Hook > Add hook > selected `public.custom_access_token_hook`
2. **Enabled Discord OAuth provider** — Supabase Dashboard > Authentication > Providers > Discord > Enabled
3. **Assigned member role** — SQL Editor: `INSERT INTO public.user_roles (user_id, role) VALUES ('<uuid>', 'member')`

## Next Phase Readiness

Phase 1 is complete. The full foundation is in place:

1. SvelteKit 2 + Svelte 5 with Docker (plan 01-01)
2. Discord OAuth login with Supabase session cookies and /(app) route guard (plan 01-02)
3. 5-table schema with RLS and typed Database.ts (plan 01-03)
4. JWT user_role injection via Custom Access Token Hook (plan 01-04)

Phase 2 can build features knowing that:
- Every authenticated request carries a user_role JWT claim
- RLS policies evaluate `(auth.jwt() ->> 'user_role')::public.app_role` without a DB round-trip
- TypeScript `hasRole()` is available for UI-layer gates in server load functions and components

No blockers for Phase 2.

---
*Phase: 01-foundation*
*Completed: 2026-02-11*
