---
phase: 01-foundation
verified: 2026-02-11T00:00:00Z
status: passed
score: 8/8 must-haves verified
re_verification: false
human_verification:
  - test: "Attempt to query a soldiers row using the anon key with no JWT"
    expected: "Zero rows returned (RLS denies unauthenticated reads)"
    why_human: "Cannot call live Supabase endpoint from static analysis"
  - test: "Attempt to INSERT into service_records with an authenticated member JWT"
    expected: "403 / policy violation — member role is not in (nco, command, admin)"
    why_human: "Requires live Supabase call to confirm RLS blocks the write"
---

# Phase 01: Foundation Verification Report

**Phase Goal:** The project infrastructure is deployed and any authenticated member can log in via Discord with their role enforced at the database layer
**Verified:** 2026-02-11
**Status:** PASSED
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #   | Truth                                                                              | Status     | Evidence                                                                                           |
| --- | ---------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------- |
| 1   | Discord OAuth login flow is wired end-to-end                                       | VERIFIED   | `signInWithOAuth({provider:'discord'})` in login action; `exchangeCodeForSession` in callback      |
| 2   | Auth cookie is set with `path: '/'` so session survives navigation and refresh     | VERIFIED   | `cookies.set(name, value, { ...options, path: '/' })` in `src/lib/supabase/server.ts`              |
| 3   | Unauthenticated requests to /(app) routes redirect to /auth/login                  | VERIFIED   | `+layout.server.ts` calls `getClaims()`; redirects 303 to `/auth/login` when null                |
| 4   | JWT contains `user_role` claim injected by Custom Access Token Hook                | VERIFIED   | Hook SQL migration applied; hook registered in Dashboard (user confirmed); JWT verified at jwt.io  |
| 5   | RLS policies evaluate `auth.jwt() ->> 'user_role'` — no extra DB query per request | VERIFIED   | All write policies in `20260211000001_rls_policies.sql` use `(select (auth.jwt() ->> 'user_role')::public.app_role)` |
| 6   | `user_roles` table is inaccessible to authenticated/anon roles                     | VERIFIED   | Restrictive policy `using (false)` + `REVOKE ALL from authenticated, anon` in hook migration       |
| 7   | TypeScript role constants and `hasRole()` helper exist and export correctly        | VERIFIED   | `src/lib/auth/roles.ts` exports APP_ROLES, AppRole, hasRole(), roleLabel() with full 4-tier logic  |
| 8   | Dashboard page shows the authenticated user's role label                           | VERIFIED   | `+page.svelte` calls `roleLabel(data.userRole)`; user confirmed "Role: Member" displayed           |

**Score:** 8/8 truths verified

### Required Artifacts

| Artifact                                                           | Expected                                     | Status     | Details                                                                            |
| ------------------------------------------------------------------ | -------------------------------------------- | ---------- | ---------------------------------------------------------------------------------- |
| `src/hooks.server.ts`                                              | getClaims() attached to locals on every request | VERIFIED | Uses `getClaims()` via `supabase.auth.getClaims()` — validated, not raw getSession |
| `src/app.d.ts`                                                     | Locals typed with supabase and getClaims     | VERIFIED   | Declares both `supabase: SupabaseClient` and `getClaims: () => Promise<...>`       |
| `src/routes/auth/callback/+server.ts`                              | OAuth code exchange handler                  | VERIFIED   | Calls `exchangeCodeForSession(code)`, redirects to /dashboard on success           |
| `src/routes/(app)/+layout.server.ts`                               | Session guard redirecting unauthenticated    | VERIFIED   | Calls `getClaims()`, redirects 303 if null, returns userRole from claims           |
| `src/lib/supabase/client.ts`                                       | Browser-side Supabase client factory         | VERIFIED   | `createBrowserClient<Database>` with correct env vars                              |
| `src/lib/supabase/server.ts`                                       | Server-side client with path:'/' cookies     | VERIFIED   | `createServerClient<Database>` with `setAll` enforcing `path: '/'`                 |
| `supabase/migrations/20260211000000_initial_schema.sql`            | 5 tables with RLS enabled                    | VERIFIED   | All 5 tables present with `enable row level security`; app_role enum defined        |
| `supabase/migrations/20260211000001_rls_policies.sql`              | Baseline RLS policies; no UPDATE/DELETE on service_records | VERIFIED | 11 policies covering all tables; service_records has only SELECT and INSERT policies |
| `supabase/migrations/20260211000002_custom_access_token_hook.sql`  | Hook function + supabase_auth_admin grants   | VERIFIED   | Function body queries `user_roles`, injects `user_role` claim; permissions correct  |
| `src/lib/auth/roles.ts`                                            | APP_ROLES, AppRole, hasRole(), roleLabel()   | VERIFIED   | All 4 exports present; ROLE_HIERARCHY correctly weighted admin=4 through member=1   |
| `src/lib/types/database.ts`                                        | Generated TypeScript types from schema       | VERIFIED   | File exists, exports `Database` type; server.ts and client.ts import it             |
| `vite.config.ts`                                                   | tailwindcss() before sveltekit() in plugins  | VERIFIED   | tailwindcss() is first in plugins array                                             |
| `src/app.css`                                                      | Tailwind v4 entry point                      | VERIFIED   | Contains exactly `@import "tailwindcss";`                                           |

### Key Link Verification

| From                                  | To                             | Via                                        | Status     | Details                                                                      |
| ------------------------------------- | ------------------------------ | ------------------------------------------ | ---------- | ---------------------------------------------------------------------------- |
| `src/routes/auth/login/+page.server.ts` | Discord OAuth URL             | `signInWithOAuth({ provider: 'discord' })` | WIRED      | Present and wired correctly                                                  |
| `src/routes/auth/callback/+server.ts` | Supabase session               | `exchangeCodeForSession(code)`             | WIRED      | Present and wired correctly                                                  |
| `src/hooks.server.ts`                 | `event.locals`                 | `setAll` with `path: '/'`                  | WIRED      | Cookie path enforcement confirmed in server.ts                               |
| `src/routes/(app)/+layout.server.ts`  | `event.locals.getClaims`       | `await getClaims()`                        | WIRED      | Called directly; redirects on null                                           |
| `public.custom_access_token_hook`     | `public.user_roles`            | SELECT role WHERE user_id = event user_id  | WIRED      | Query present in hook SQL; supabase_auth_admin granted SELECT on user_roles  |
| JWT                                   | RLS policies                   | `auth.jwt() ->> 'user_role'`               | WIRED      | Pattern present in 6 of 11 RLS policies in the migrations                    |
| `src/routes/(app)/+layout.server.ts`  | `src/lib/auth/roles.ts`        | `import { hasRole }`                       | NOT WIRED  | hasRole() is not imported in layout.server.ts — role passed raw from claims. This is acceptable in Phase 1: the layout extracts `claims['user_role']` directly. hasRole() is defined and ready for Phase 2 consumption. |

### Requirements Coverage

| Requirement | Status    | Notes                                                                                                    |
| ----------- | --------- | -------------------------------------------------------------------------------------------------------- |
| AUTH-01: Discord OAuth login | SATISFIED | Full OAuth flow: login form → signInWithOAuth → callback → exchangeCodeForSession → /dashboard |
| AUTH-02: Session persists across refresh | SATISFIED | Cookie set with `path: '/'`; getClaims() validates JWT on every request; user confirmed |
| AUTH-03: 4-tier role hierarchy enforced | SATISFIED | app_role enum (admin/command/nco/member); RLS policies enforce tier gates; user_roles inaccessible to anon |
| AUTH-04: Roles embedded in JWT via hook | SATISFIED | Hook SQL deployed, registered in Dashboard, confirmed active — JWT contains user_role at jwt.io |

### Anti-Patterns Found

| File                                           | Line | Pattern        | Severity | Impact                                                                  |
| ---------------------------------------------- | ---- | -------------- | -------- | ----------------------------------------------------------------------- |
| `src/routes/(app)/+layout.server.ts`           | 13   | TODO comment   | Info     | "user_role will be populated after plan 01-04..." — now obsolete since hook is active. Cosmetic only, no functional impact. |

No blocker or warning-level anti-patterns found.

### Human Verification Required

#### 1. RLS blocks Member from Admin-only data

**Test:** Using the browser devtools, copy the `access_token` from the `sb-*-auth-token` cookie. Call `fetch('https://YOUR-PROJECT.supabase.co/rest/v1/soldiers?select=*', { headers: { apikey: ANON_KEY, Authorization: 'Bearer MEMBER_ACCESS_TOKEN' } })`. Then try an INSERT on a table restricted to NCO+.
**Expected:** SELECT returns only `active` soldiers (as per the policy). INSERT is rejected with a 403 or empty result from the write policy gate.
**Why human:** Cannot call live Supabase REST from static analysis.

#### 2. RLS blocks anon key entirely from user_roles

**Test:** Call `fetch('https://YOUR-PROJECT.supabase.co/rest/v1/user_roles?select=*', { headers: { apikey: ANON_KEY } })`.
**Expected:** Zero rows or 401 — the restrictive `using (false)` policy blocks all reads.
**Why human:** Requires live HTTP call to the deployed Supabase project.

### Gaps Summary

No gaps found. All 8 observable truths are verified by static analysis of the codebase combined with the user's manual end-to-end confirmation (Discord OAuth, JWT contents, session persistence, hook registration). The one key link from the 01-04 PLAN that is technically absent — `hasRole()` imported in `+layout.server.ts` — is intentional: the layout passes `userRole` via raw claims extraction, and `hasRole()` is documented as a Phase 2+ utility. This does not block the phase goal.

The phase goal is achieved: the project infrastructure is deployed, Discord OAuth login works, sessions persist, and the Custom Access Token Hook enforces roles at the JWT/database layer.

---

_Verified: 2026-02-11_
_Verifier: Claude (gsd-verifier)_
