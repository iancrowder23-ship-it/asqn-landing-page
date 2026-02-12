# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-10)

**Core value:** A soldier's complete service record — from enlistment to current status — is accurate, accessible, and drives unit management decisions.
**Current focus:** Phase 4 (Awards, Qualifications, and Roster) — Plan 03 (Roster) complete

## Current Position

Phase: 4 of 6 IN PROGRESS (Awards, Qualifications, and Roster)
Plan: 3 of 3 complete — Phase 4 fully done
Status: Phase 4 complete — all 3 plans executed (awards, qualifications, roster)
Last activity: 2026-02-12 — Phase 4 Plan 03 (roster page) executed

Progress: [███████░░░] 66%

## Performance Metrics

**Velocity:**
- Total plans completed: 13
- Average duration: ~12 min
- Total execution time: ~155 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 4/4 | 65 min | 16.3 min |
| 02-public-site | 4/4 | ~20 min | ~5 min |
| 03-soldier-profiles | 2/2 | ~35 min | ~17.5 min |

**Recent Trend:**
- Phase 2 Wave 1 (02-01) executed sequentially, Wave 2 (02-02, 02-03, 02-04) parallelized across 3 agents
- Parallel execution significantly reduced wall-clock time

*Updated after each plan completion*

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 04-awards-qualifications-roster | 3/3 | ~35 min | ~12 min |

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
- operations table uses 'title' column (not 'name') — distinguishes from legacy schema and matches plan spec
- operation_attendance references soldiers.id (not profiles.id) — correct for this system's data model
- Authenticated can read ALL soldiers RLS policy: additive policy so profile pages work for LOA/AWOL/Discharged/Retired; anon policy still restricts public site to active-only
- maybeSingle() for mySoldierId lookup: prevents throw when admin/new user has no soldier record
- performed_by_name in service_records: read from payload JSON field (not performed_by UUID) — auth.users is not queryable via Supabase client
- Assignment history derived from service_records transfer entries — no separate table needed
- isOwnProfile computed server-side (JWT sub vs soldier.user_id) — keeps auth logic on server, avoids client-side auth check
- [Phase 04-awards-qualifications-roster]: Internal roster at /roster replaces public (site)/roster: auth-protected three-view roster supersedes simple public table; route group conflict resolved by removing (site)/roster
- [Phase 04-awards-qualifications-roster]: RosterTreeNode is a new component (not reusing OrbatNode): needs soldier IDs and profile links that OrbatNode lacks
- [Phase 04-awards-qualifications-roster]: Drop legacy tables before CREATE: legacy stubs had wrong profiles FK — dropped and recreated with correct soldiers FK
- [Phase 04-awards-qualifications-roster]: Supabase OAuth token refresh pattern: POST api.supabase.com/v1/oauth/token with refresh_token grant revives expired sbp_oauth_ tokens
- [Phase 04-awards-qualifications-roster]: superValidate initial data for default date values — avoids Svelte5 duplicate attribute error from bind:value + value on same input; set defaults server-side via superValidate({ awarded_date: todayDate }, ...)
- [Phase 04-awards-qualifications-roster]: Dual-write service_records failure is non-fatal — member table insert is primary; SR insert failure logged but does not roll back the grant

### Pending Todos

None yet.

### Blockers/Concerns

- Phase 4 (Enlistment State Machine): DB-level transition enforcement approach (trigger vs. check constraint vs. RPC) needs a concrete decision during planning — research flag from SUMMARY.md
- Phase 5 (Promotion Workflow): Admin notification strategy (Supabase Realtime vs. polling vs. webhooks) needs a decision during planning
- **All subsequent plans**: `NPM_CONFIG_PREFIX=/nonexistent` is set in shell environment — all npm/npx commands must use `env -u NPM_CONFIG_PREFIX` prefix
- **plan 01-04**: Supabase access token may expire — if CLI auth fails, re-extract from ~/.claude/.credentials.json mcpOAuth entry

## Session Continuity

Last session: 2026-02-12
Stopped at: Completed 04-awards-qualifications-roster plan 02 (awards/qualifications granting UI + display components on soldier profile)
Resume file: None
Next action: Phase 4 fully complete (01, 02, 03 done) — ready for Phase 5 planning
