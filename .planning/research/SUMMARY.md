# Project Research Summary

**Project:** ASQN 1st SFOD — Arma 3 Delta Force Unit Website
**Domain:** Milsim unit website with integrated PERSCOM-style personnel management system
**Researched:** 2026-02-10
**Confidence:** HIGH

## Executive Summary

This project is a dual-purpose web application: a public-facing recruitment site with strong tactical branding, and a private personnel management portal replicating the capabilities of PERSCOM — the de facto standard for serious Arma 3 milsim units. Research across live milsim unit sites (PERSCOM.io, UNITAF, 16 Air Assault, SEAL Team 3 Milsim) confirms that units differentiate on authenticity and self-sufficiency. A custom Supabase-backed system built on SvelteKit gives ASQN 1st SFOD complete control over schema, data sovereignty, and cost — none of which a SaaS alternative like PERSCOM.io provides. The tactical aesthetic must be hand-crafted with Tailwind v4 custom utilities; no component library matches the visual language required.

The recommended stack is SvelteKit 2 + Svelte 5 (with runes), Supabase for all backend primitives (Postgres + Auth + Storage), Tailwind CSS v4, sveltekit-superforms + Zod v4 for form handling, and adapter-node for Docker/VPS deployment. This stack is cohesive: SSR handles SEO-critical public pages, SPA-style transitions serve the member portal, Discord OAuth is a first-class Supabase auth provider, and RLS policies enforce the four-tier role hierarchy (Admin / Command / NCO / Member) at the database level without any application-layer trust. All versions have been verified against current npm releases as of February 2026.

The primary risk in this project is not feature complexity — it is security and data integrity. Three failure modes recur across milsim system implementations: RLS left disabled on tables (silent data exposure), personnel records modeled as mutable fields rather than append-only event logs (destroyed audit trails), and application-layer-only role checks (bypassable from the browser). All three are irreversible if data exists before the schema is corrected. The mitigation is strict build order: auth foundation and data model — with RLS enabled and the event-log schema committed — must be complete before any feature UI is written.

## Key Findings

### Recommended Stack

SvelteKit 2 with Svelte 5 runes is the correct choice for this workload. Compile-time reactivity produces 50% smaller bundles than React, which matters for a media-rich tactical site. SSR via `+page.server.ts` load functions handles SEO for recruitment pages; SvelteKit form actions with Superforms handle all authenticated mutations with progressive enhancement and field-level Zod validation. Supabase's single JS SDK covers all backend needs — PostgreSQL queries, Discord OAuth, file storage for award images, and realtime subscriptions for live roster updates. The `@supabase/ssr` package (not the deprecated `auth-helpers`) manages cookie-based session hydration in `hooks.server.ts` so RLS fires correctly on server-rendered pages.

**Note:** ARCHITECTURE.md was partially researched using Next.js App Router conventions (route groups, middleware, server components). The architectural patterns — Custom JWT Claims Hook, append-only service records via triggers, enlistment state machine, shared roster query — are fully portable to SvelteKit. Translate: App Router `layout.tsx` → SvelteKit `+layout.server.ts`; Next.js Middleware → SvelteKit `hooks.server.ts`; Server Actions → SvelteKit form actions. The data model, RLS patterns, and build order apply without modification.

**Core technologies:**
- **SvelteKit 2 / Svelte 5**: Full-stack framework — SSR for public pages, form actions for all mutations, zero virtual DOM overhead
- **Supabase (supabase-js v2 + @supabase/ssr v0.8)**: PostgreSQL + Discord OAuth + file storage + realtime — single SDK, cookie-based SSR sessions
- **Tailwind CSS v4**: Utility-first custom dark tactical aesthetic — zero runtime JS, CSS-native variables, Vite plugin (no config file)
- **sveltekit-superforms v2 + Zod v4**: Server-validated forms with progressive enhancement — enlistment, promotion requests, award submissions
- **adapter-node v5**: Docker/VPS deployment — multi-stage Dockerfile, port 3000, Nginx reverse proxy for SSL

### Expected Features

Research against PERSCOM.io, UNITAF, and five live PERSCOM installations confirms a clear MVP and prioritization hierarchy. See `FEATURES.md` for the full prioritization matrix.

**Must have (table stakes — v1 launch):**
- Landing page with Delta Force / 1st SFOD identity and branding
- Unit structure / ORBAT (recruits check this before applying)
- Enlistment application form (primary recruit funnel — without it the site is read-only)
- Discord OAuth login (no password friction; unit is Discord-centric)
- Soldier profile: rank, callsign, MOS, status, unit assignment
- Service record with promotion and award entries (core PERSCOM functionality)
- Awards display on profile
- Internal member roster
- Role-based access control — Admin / Command / NCO / Member (required before any admin actions exist)
- Enlistment workflow: Submitted → Under Review → Interview Scheduled → Accept/Deny

**Should have (v1.x — add after first cohort is onboarded):**
- Qualifications / certifications tracking
- Event / operation management with attendance records
- Transfer orders system
- Command-driven promotion workflow (formalized approval chain)
- Public unit statistics counters

**Defer (v2+):**
- Discord role sync (bidirectional) — requires Discord bot, significant complexity, wait until roles are settled
- After Action Report submission system — editorial overhead; build after event system is mature
- Visual timeline for service record — polish feature; tabular list is sufficient at small scale
- Qualification expiry tracking — only relevant once qualifications have been running long enough to expire

**Hard anti-features (do not build):**
- In-game K/D or performance stat tracking — breeds toxicity; meaningless in milsim
- Forum / discussion board — Discord already handles this and a forum will die within weeks
- Public leaderboards — use awards and decorations for recognition instead

### Architecture Approach

The system separates into two clear route groups sharing a single Supabase project: a public site (no auth, SSR-rendered for SEO) and an authenticated member portal (session-gated, RLS-enforced). All route protection runs in `hooks.server.ts`, which reads the `user_role` JWT claim without a DB round-trip. Four architectural patterns underpin the entire system: (1) Custom Access Token Hook injects role into JWT so RLS policies can evaluate `auth.jwt() ->> 'user_role'` without a second DB query; (2) service records as an append-only PostgreSQL audit log maintained by triggers, not application code; (3) enlistment flow as an explicit state machine with DB-level transition validation; (4) a single shared roster query driving three presentation layers (card, tree, table) to avoid N+1 fetches.

**Major components:**
1. **Public Site** (`/(site)/` route group) — Landing, ORBAT, rank chart, enlistment form, leadership; SSR; anon Supabase key, insert-only for enlistment
2. **Member Portal** (`/(app)/dashboard/`) — Soldier profile, service record, awards, attendance; authenticated RLS-filtered queries
3. **Admin Panel** (`/(app)/admin/`) — Roster management, personnel actions, enlistment review, event management; authenticated client for reads, service_role scoped to specific server actions for privileged writes
4. **Supabase Auth + Custom JWT Hook** — Discord OAuth, session cookies, role injection into JWT on token issuance via `custom_access_token_hook`
5. **PostgreSQL Triggers** — Auto-append to `service_records` on every personnel action; database enforces audit integrity, not application code
6. **Supabase Storage** — `avatars` bucket (public), `documents` bucket (private, signed URLs)

### Critical Pitfalls

1. **RLS disabled on tables** — New tables created via SQL migrations default to RLS off; all rows are publicly readable via the anon key with no error. Prevention: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` at the end of every `CREATE TABLE` — no exceptions. Run Supabase Database Advisor after every migration batch. This is the #1 data exposure pattern in Supabase deployments (CVE-2025-48757).

2. **Service record as mutable fields** — Implementing rank and awards as `UPDATE`-able columns on the `soldiers` table destroys the audit trail that is the core value of a PERSCOM system. Prevention: model `rank_records`, `soldier_awards`, and `service_records` as append-only tables from day one; derive current rank from the most recent record. This schema decision is irreversible once data exists.

3. **JWT staleness after role changes** — Custom JWT claims (role) are immutable until the token expires (default 1 hour). A demoted or banned member retains access during that window — a security issue, not just UX. Prevention: keep token TTL at 1 hour; for security-critical revocations (bans, demotions), implement a `force_reauth_at` check in a `profiles` policy that bypasses JWT claims.

4. **Application-layer-only role checks** — Checking `if user.role === 'Admin'` in a SvelteKit load function without a corresponding RLS policy means anyone can call Supabase directly from the browser with the anon key and bypass all guards. Prevention: RLS is the enforcement layer; UI role checks are cosmetic only. Every table needs RLS policies for every operation.

5. **Testing RLS as superuser** — The Supabase SQL Editor runs as `postgres`, which bypasses all RLS silently. "It works in the SQL Editor" is not evidence that RLS is correct. Prevention: all role tests must run through the Supabase JS client with a real authenticated session for each role; never the SQL Editor for RLS verification.

## Implications for Roadmap

Based on combined research, the build order is dictated by hard dependencies. Auth must exist before protected routes. The data model with RLS must be locked before application code that queries it. Public-facing pages are largely independent but share the Supabase client setup. Personnel actions must exist before the roster has data to display. The enlistment pipeline requires the soldier creation flow to work end-to-end.

### Phase 1: Foundation — Auth, Data Model, and RLS

**Rationale:** Auth is the prerequisite for every authenticated feature. The data model and RLS policies are the prerequisite for every query. These two concerns are so tightly coupled that building one without the other causes rebuilds. This is the phase where irreversible schema decisions are made.
**Delivers:** Discord OAuth login, working sessions in SvelteKit hooks, `soldiers` / `ranks` / `units` / `service_records` schema, `user_roles` table, Custom Access Token Hook injecting role into JWT, RLS policies for all tables, role constants and middleware helpers.
**Addresses features:** Discord OAuth login, RBAC (four roles)
**Avoids pitfalls:** RLS disabled on tables, JWT staleness design, app-layer-only role checks, service record mutability (schema committed here), Discord as sole auth (internal UUID vs. `discord_id` separation)

### Phase 2: Public Site

**Rationale:** Public pages are largely independent of auth and can be developed in parallel after Phase 1 establishes the Supabase client pattern. SEO-critical pages (recruitment, about, ORBAT) need SSR from day one. The enlistment form is the only public page with a Supabase write.
**Delivers:** Landing page with Delta Force branding, About / unit history, ORBAT, rank chart, leadership roster (public), enlistment application form (anon insert to `enlistments`), Discord link / contact
**Addresses features:** All P1 public-facing table stakes
**Uses:** SvelteKit `+page.server.ts` load functions, Tailwind v4 custom tactical theme, Superforms + Zod for enlistment form, anon Supabase client
**Research flag:** None — well-documented SSR patterns; Tailwind v4 SvelteKit guide is official

### Phase 3: Soldier Profile and Service Record

**Rationale:** The soldier profile is the "military ID card" — the anchor object that all other personnel features attach to. Service records are append-only from day one (schema committed in Phase 1); this phase builds the display and the mutation flows. Awards are included here because they are visually prominent on profiles and motivate member engagement from day one.
**Delivers:** Soldier profile page (rank, callsign, MOS, status, unit assignment), service record display (chronological, append-only), awards display with insignia images, rank insignia display, member status badge
**Addresses features:** Soldier profile, service record, awards display, rank display — all P1
**Avoids pitfalls:** Service record mutability (display confirms append-only model), N+1 roster queries (profile page joins awards and rank in one query)

### Phase 4: Core Admin — Roster, Personnel Actions, Enlistment Pipeline

**Rationale:** This phase builds all admin-facing workflows. The roster is the command's operational view; it comes after profiles exist and have data. Personnel actions (promote, award, qualify) write to the append-only log established in Phase 1. The enlistment review queue closes the loop from the public form. RBAC gates all admin routes.
**Delivers:** Internal member roster (card / tree / table views from shared query), admin personnel actions (promotion, award, qualification, status change), enlistment review queue with state machine transitions (Submitted → Under Review → Interview → Accept/Deny), soldier record auto-creation on acceptance
**Addresses features:** Member roster, enlistment workflow, RBAC enforcement across admin routes — all P1
**Avoids pitfalls:** Anti-Pattern 5 (roster built after auth), enlistment state machine without transition validation, testing RLS as superuser (write role-based tests in this phase)
**Research flag:** Enlistment state machine transition validation in PostgreSQL needs careful implementation — confirm DB-level check constraint vs. trigger approach

### Phase 5: Events, Attendance, and Extended Personnel

**Rationale:** Event management and attendance tracking are the natural next layer once the core personnel system is working. These features require the event → attendance → service_record linkage to be meaningful. Transfer orders and the formal promotion workflow are also built here as the unit grows beyond a small founding group.
**Delivers:** Event / operation creation with type and attendance flags, attendance tracking per soldier per event (RSVP + actual attendance), attendance record on soldier profile, transfer orders system, command-driven promotion workflow (request → approve → service record auto-updated)
**Addresses features:** All P2 features from the prioritization matrix
**Research flag:** May need deeper research on the formal promotion approval workflow — specifically whether to use Supabase Realtime for admin notifications or a polling approach

### Phase 6: Polish and Hardening

**Rationale:** Before the site is presented publicly as the unit's primary face, UX gaps and performance baselines need to be addressed. This phase is not about features — it is about making the existing features production-quality.
**Delivers:** Loading skeletons on async roster / service record queries, confirmation modals for destructive actions, toast notifications for role changes, mobile-responsive audit, contrast and WCAG compliance check, index optimization on all RLS policy columns, soft-delete verification (no hard deletes of soldier records), full "Looks Done But Isn't" checklist from PITFALLS.md
**Avoids pitfalls:** All UX pitfalls, RLS performance traps, storage bucket audit

### Phase 7: Discord Integration (v2+)

**Rationale:** Discord role sync requires a bot with `Manage Roles` permission — a separate infrastructure concern from the web app. This is deferred until the unit is stable, roles are settled, and the core system has been validated by real usage. Building this prematurely means rebuilding it as roles evolve.
**Delivers:** Discord bot, bidirectional role sync (rank/status changes update Discord roles), Discord notifications for personnel actions
**Addresses features:** Discord role sync (P3), notifications (P3)
**Research flag:** Needs dedicated research phase — Discord bot + SvelteKit webhook integration is not a standard pattern; rate limits and Manage Roles permission scoping need verification

### Phase Ordering Rationale

- **Auth before everything**: Every authenticated feature depends on working sessions and JWT claims. The Custom Access Token Hook that injects `user_role` is the keystone — without it, RLS policies have no role to evaluate.
- **Schema before queries**: RLS policies that reference columns that don't exist fail silently in some configurations. Lock the schema before building any feature that queries it.
- **Append-only service records from day one**: This is the schema decision that cannot be undone once real data exists. Phase 1 commits it.
- **Public site is parallelizable**: Phases 2 and 3 can overlap once Phase 1 is complete — public routes don't depend on personnel data, and soldier profile display doesn't depend on the public site.
- **Admin workflows after data**: The roster and admin panel need real soldier data to be meaningful. Phase 3 (profiles) feeds Phase 4 (admin).
- **Events after personnel**: Attendance records are foreign-keyed to both events and soldiers. Both must exist before attendance is meaningful.

### Research Flags

Phases likely needing `/gsd:research-phase` during planning:

- **Phase 4 (Enlistment State Machine):** DB-level state transition enforcement in PostgreSQL (trigger vs. check constraint vs. RPC function) has implementation tradeoffs that need validation before committing to an approach.
- **Phase 5 (Promotion Workflow):** Admin notification strategy (Supabase Realtime vs. polling vs. database webhooks to SvelteKit) needs a decision with concrete implementation research.
- **Phase 7 (Discord Integration):** Discord bot + SvelteKit webhook architecture, role sync rate limits, and `guilds.members.read` scope behavior with large servers need dedicated research before any code is written.

Phases with standard, well-documented patterns (skip research-phase):

- **Phase 1 (Auth + RLS):** Supabase Custom Claims RBAC pattern is fully documented in official Supabase docs with working SQL examples.
- **Phase 2 (Public Site):** SvelteKit SSR + Tailwind v4 is documented in official guides with verified patterns.
- **Phase 3 (Soldier Profile / Service Record):** Append-only audit log via PostgreSQL triggers is a standard pattern with working examples in ARCHITECTURE.md.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All versions verified against npm registries and official changelogs as of Feb 2026. Version compatibility table in STACK.md is authoritative. |
| Features | MEDIUM | Based on live site analysis of 6 milsim unit implementations and PERSCOM.io official docs. The MVP definition is well-supported; v2+ feature prioritization is inference from community patterns. |
| Architecture | HIGH | Supabase Custom Claims, RLS patterns, and PostgreSQL trigger approach sourced from official Supabase docs. Note: ARCHITECTURE.md uses Next.js conventions in code examples; all patterns apply to SvelteKit with direct translation (see Key Findings note above). |
| Pitfalls | MEDIUM-HIGH | RLS pitfalls are HIGH confidence via official docs and CVE-2025-48757. Milsim-specific UX and workflow pitfalls are MEDIUM confidence via community observation and analogous systems. |

**Overall confidence:** HIGH

### Gaps to Address

- **Framework terminology mismatch in ARCHITECTURE.md:** Code examples reference Next.js App Router (`app/`, `layout.tsx`, `middleware.ts`). These are the same patterns expressed in SvelteKit as `src/routes/`, `+layout.server.ts`, and `hooks.server.ts`. No rework needed — but the roadmapper and any developer reading ARCHITECTURE.md should translate actively.

- **Enlistment state machine enforcement approach:** ARCHITECTURE.md and PITFALLS.md both prescribe DB-level transition validation but stop short of a concrete implementation choice (check constraint vs. trigger vs. RPC). This needs a concrete decision during Phase 4 planning.

- **Notification strategy for admin workflows:** Promotion approval and enlistment review both benefit from push notifications to reviewers. The research does not prescribe a specific approach (Supabase Realtime, email via Resend, Discord DM via bot). This needs a decision during Phase 5 planning.

- **Discord bot hosting:** Phase 7 requires a persistent Discord bot. Where this runs (same VPS, separate container, hosted service) is undecided. Flag for research before Phase 7 planning.

- **Unit scale assumptions:** All architecture and performance recommendations assume fewer than 200 active members. This is appropriate for a new unit. If ASQN 1st SFOD grows beyond 200 members before launch, the connection pooling and indexing recommendations in ARCHITECTURE.md (Scaling Considerations section) become immediately relevant.

## Sources

### Primary (HIGH confidence)
- Supabase Custom Claims & RBAC — https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac
- Supabase Row Level Security — https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase SSR for SvelteKit — https://supabase.com/docs/guides/auth/server-side/sveltekit
- Supabase Discord OAuth — https://supabase.com/docs/guides/auth/social-login/auth-discord
- Tailwind CSS v4 SvelteKit guide — https://tailwindcss.com/docs/guides/sveltekit
- SvelteKit GitHub releases — https://github.com/sveltejs/kit/releases
- Svelte February 2026 blog — https://svelte.dev/blog/whats-new-in-svelte-february-2026
- Superforms npm — https://www.npmjs.com/package/sveltekit-superforms
- Zod v4 release — https://zod.dev/v4
- PERSCOM.io documentation — https://docs.perscom.io/docs/introduction
- Discord OAuth2 official docs — https://discord.com/developers/docs/topics/oauth2

### Secondary (MEDIUM confidence)
- PERSCOM.io product site — https://perscom.io/
- UNITAF United Task Force — https://unitedtaskforce.net/ (live production milsim system, largest Arma 3 unit)
- 16 Air Assault Milsim — https://16aa.net/ (long-running unit since 2004)
- SEAL Team 3 Milsim PERSCOM installation — https://sealteam3milsim.team/perscom/
- USSOCOM Arma III PERSCOM roster — https://www.arma-socom.com/perscom/personnel/
- CVE-2025-48757 (170+ Lovable apps with exposed Supabase DBs, January 2025)
- RLS performance best practices — https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv

### Tertiary (LOW confidence)
- MilSim Units directory — https://milsimunits.com/ (aggregator, not authoritative; used for competitive landscape only)
- Bohemia Interactive Forums PERSCOM thread — https://forums.bohemia.net/forums/topic/224442-web-app-unreleased-personnel-management-system-perscom-sort-of/ (community forum, older; context only)

---
*Research completed: 2026-02-10*
*Ready for roadmap: yes*
