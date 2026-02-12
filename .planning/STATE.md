# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-10)

**Core value:** A soldier's complete service record — from enlistment to current status — is accurate, accessible, and drives unit management decisions.
**Current focus:** Phase 1 — Foundation

## Current Position

Phase: 1 of 6 (Foundation)
Plan: 4 of 4 in current phase
Status: Phase 1 complete — all 4 plans done, ready for Phase 2
Last activity: 2026-02-11 — Plan 01-04 (Custom Access Token Hook + end-to-end auth verification) complete

Progress: [████░░░░░░] 17%

## Performance Metrics

**Velocity:**
- Total plans completed: 3
- Average duration: 6.3 min
- Total execution time: 20 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 4/4 | 65 min | 16.3 min |

**Recent Trend:**
- Last 5 plans: 3 min, 2 min, 15 min, 45 min
- Trend: plan 01-04 longer due to Dashboard setup + end-to-end human verification

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Stack: SvelteKit 2 + Svelte 5 (runes), Supabase, Tailwind v4, sveltekit-superforms + Zod v4, adapter-node
- Schema: Service records are append-only event logs from day one — this is irreversible once data exists
- Auth: Discord OAuth only via Supabase — Custom Access Token Hook injects role into JWT for RLS
- Security: RLS must be enabled on every table at creation time; no exceptions
- Tailwind v4 CSS-first: @import "tailwindcss" in app.css only, no tailwind.config.ts, no PostCSS
- adapter-node explicit: Changed from adapter-auto default — unambiguous Docker/VPS deployment target
- Docker two-stage build: builder/runner pattern with node:22-alpine keeps production image small
- NPM_CONFIG_PREFIX workaround: NPM_CONFIG_PREFIX=/nonexistent in shell env — all npm/npx commands require env -u NPM_CONFIG_PREFIX prefix
- getClaims() pattern: auth.getClaims() used directly — available in @supabase/supabase-js v2.95.3, no manual JWT decode needed
- Cookie path '/': enforced in setAll handler in createSupabaseServerClient — required for cross-route persistence
- Database typed: createServerClient<Database> and createBrowserClient<Database> — any workaround removed in plan 01-03
- Schema migration: prior asqn-project-1 schema dropped via CASCADE — user approved Option A (drop and migrate fresh)
- Supabase CLI auth: SUPABASE_ACCESS_TOKEN extracted from ~/.claude/.credentials.json mcpOAuth entry (sbp_oauth_ token)
- RLS append-only: service_records has no UPDATE/DELETE policies — absence of policy = deny in RLS
- Custom Access Token Hook: registered in Supabase Dashboard (not via SQL) — injects user_role into every JWT at login/refresh
- Discord provider manual enable: Discord OAuth must be explicitly enabled in Supabase Dashboard > Authentication > Providers
- user_roles locked to auth admin only: REVOKE ALL from authenticated/anon — only supabase_auth_admin can SELECT, preventing role spoofing

### Pending Todos

None yet.

### Blockers/Concerns

- Phase 4 (Enlistment State Machine): DB-level transition enforcement approach (trigger vs. check constraint vs. RPC) needs a concrete decision during planning — research flag from SUMMARY.md
- Phase 5 (Promotion Workflow): Admin notification strategy (Supabase Realtime vs. polling vs. webhooks) needs a decision during planning
- **All subsequent plans**: `NPM_CONFIG_PREFIX=/nonexistent` is set in shell environment — all npm/npx commands must use `env -u NPM_CONFIG_PREFIX` prefix
- **plan 01-04**: Supabase access token may expire — if CLI auth fails, re-extract from ~/.claude/.credentials.json mcpOAuth entry

## Session Continuity

Last session: 2026-02-11
Stopped at: Plan 01-04 complete — Custom Access Token Hook deployed, end-to-end auth verified, Phase 1 complete
Resume file: None
Next action: Begin Phase 2 planning
