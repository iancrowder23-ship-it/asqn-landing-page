# ASQN 1st SFOD — Unit Website & Personnel System

## What This Is

A website and personnel management system for ASQN 1st SFOD (Army Squadron, 1st Special Forces Operational Detachment — Delta Force), an Arma 3 milsim unit. The public-facing site serves as the unit's front door — recruiting, info, and identity. Behind login, the personnel system tracks every soldier's career: rank, assignments, qualifications, attendance, promotions, and service history. Discord is the unit's hub; the site extends that with structured record-keeping and a professional web presence.

## Core Value

A soldier's complete service record — from enlistment to current status — is accurate, accessible, and drives unit management decisions.

## Requirements

### Validated

- ✓ Public website with unit overview, about, leadership, events, enlistment, contact — v1.0
- ✓ Discord OAuth authentication — v1.0
- ✓ Soldier profiles with rank, callsign, MOS, status, unit assignment — v1.0
- ✓ Service record tracking (promotions, awards, qualifications, assignments) — v1.0
- ✓ Attendance tracking per event — v1.0
- ✓ Event creation and management (operations, training, FTX) — v1.0
- ✓ Promotion tracking (command decision, logged with date/reason) — v1.0
- ✓ Awards and qualifications tracking (certs + courses) — v1.0
- ✓ Notes/disciplinary records (leadership-only visibility) — v1.0
- ✓ Role-based permissions (Admin, Command, NCO, Member) — v1.0
- ✓ Enlistment application with review + interview workflow — v1.0
- ✓ Roster views: card grid, hierarchical tree, sortable table — v1.0
- ✓ Transfer orders with effective date and reason — v1.0
- ✓ Member status tracking (Active, LOA, AWOL, Discharged/Retired) — v1.0
- ✓ Admin dashboard with key metrics — v1.0

### Active

(None — define for next milestone via `/gsd:new-milestone`)

### Out of Scope

- Real-time chat/messaging — Discord handles this
- Mobile app — web-first, responsive design covers mobile
- Points-based promotion system — command makes promotion decisions manually
- Video/media hosting — link to external platforms
- Multi-squadron support — building for Squadron A only
- Public full roster — public sees names/ranks only, full details behind login
- In-game stat tracking (K/D, hours) — breeds toxicity; attendance is the metric that matters
- Forum / discussion board — Discord already handles all unit communication
- Public leaderboards — conflicts with military culture model; awards system handles recognition

## Context

**Shipped:** v1.0 MVP (2026-02-12)
**Codebase:** 7,247 LOC (TypeScript + Svelte + CSS), 81 commits
**Stack:** SvelteKit 2 + Svelte 5 (runes), Supabase, Tailwind v4, sveltekit-superforms + Zod v4, adapter-node
**Deployment:** Docker on VPS (two-stage builder/runner, node:22-alpine)

**Unit:** ASQN 1st SFOD, Squadron A (Delta Force milsim)
**Game:** Arma 3
**Size:** Small (10-30 members)
**Communication:** Discord-centric; Discord OAuth is the login mechanism

**Database:** 11 tables with full RLS, append-only service records, Custom Access Token Hook injecting roles into JWT
**Auth:** Discord OAuth → Supabase Auth → JWT with user_role claim → RLS enforcement

**Known Issues / Tech Debt:**
- Awards reference table starts empty — admin must seed via Supabase dashboard
- Discord invite URL placeholder in footer
- `$derived()` vs `$derived.by()` in StatusBadge (cosmetic)
- Discord OAuth provider + Custom Access Token Hook require manual Dashboard configuration

## Constraints

- **Auth**: Discord OAuth via Supabase Auth — members already live in Discord
- **Database**: Supabase PostgreSQL with row-level security on every table
- **Hosting**: Docker on VPS — self-hosted, containerized deployment
- **Frontend**: SvelteKit 2 + Svelte 5 (runes), custom components (no component library)
- **Styling**: Tactical/SOF dark aesthetic — black, dark gray, muted accents, covert ops feel
- **Data**: Fresh start for v1.0 — no migration from prior systems
- **Storage**: Supabase Storage for rank insignia, soldier photos, unit assets

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Discord OAuth only | Unit lives on Discord, simplifies auth, one identity | ✓ Good — works well, single sign-on feel |
| Custom components (no UI library) | Full control over tactical/SOF aesthetic | ✓ Good — consistent dark theme throughout |
| Docker deployment | Reproducible, portable, standard for VPS hosting | ✓ Good — two-stage build keeps image small |
| Supabase for backend | Auth + DB + storage in one platform, RLS for permissions | ✓ Good — RLS enforcement on all tables |
| SvelteKit 2 + Svelte 5 (runes) | Modern, performant, good DX with SSR | ✓ Good — runes pattern clean and consistent |
| Tailwind v4 CSS-first | No config file, no PostCSS, @import only | ✓ Good — zero-config styling |
| Append-only service records | Immutable audit trail from day one | ✓ Good — complete history, no data loss risk |
| Custom Access Token Hook for RBAC | Role in JWT, no extra DB query per request | ✓ Good — fast RLS evaluation |
| Formal transfer orders | Maintains proper service record history | ✓ Good — assignment history works |
| Command-driven promotions | Matches unit culture, no automated point systems | ✓ Good — aligns with milsim structure |
| Partial public roster | Recruiting visibility without exposing full personnel data | ✓ Good — names + ranks only for visitors |
| getClaims() direct usage | Available in @supabase/supabase-js v2.95.3 | ✓ Good — no manual JWT decode needed |
| Dual-write to service_records | Personnel actions write to both entity table and SR log | ⚠️ Revisit — SR insert failure is non-fatal (logged, not rolled back) |

---
*Last updated: 2026-02-12 after v1.0 milestone*
