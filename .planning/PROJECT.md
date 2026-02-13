# ASQN 1st SFOD — Unit Website & Personnel System

## What This Is

A website and personnel management system for ASQN 1st SFOD (Army Squadron, 1st Special Forces Operational Detachment — Delta Force), an Arma 3 milsim unit. The public-facing site serves as the unit's front door — recruiting, info, and identity. Behind login, the personnel system tracks every soldier's career: rank, assignments, qualifications, attendance, promotions, and service history. Discord is the unit's hub; the site extends that with structured record-keeping and a professional web presence. The site is live at https://asqnmilsim.us with automated CI/CD and Discord-gated authentication.

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
- ✓ VPS provisioned with Docker, hardened SSH, UFW firewall — v1.1
- ✓ Production Docker Compose with Caddy reverse proxy and auto-HTTPS — v1.1
- ✓ GitHub Actions CI/CD pipeline (push to main → GHCR → VPS deploy) — v1.1
- ✓ Discord guild membership gate (only ASQN members can log in) — v1.1
- ✓ Discord deploy notifications (success/failure to ops channel) — v1.1
- ✓ Production Let's Encrypt TLS certificate — v1.1
- ✓ /health endpoint for monitoring — v1.1
- ✓ Secrets management (no secrets in git or Docker image layers) — v1.1

### Active

(No active requirements — next milestone not yet defined)

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
- Kubernetes — massive overhead for single-VPS deployment
- Terraform / IaC — overkill for one Interserver VPS
- Self-hosted GitHub Actions runner — free tier is sufficient
- Automated database migrations in CI — Supabase manages migration state separately
- Zero-downtime deployment — deferred to v2 (DEPLOY-01)
- Rollback workflow — deferred to v2 (DEPLOY-02)

## Context

**Shipped:** v1.0 MVP (2026-02-11) + v1.1 Production Deployment (2026-02-12)
**Codebase:** 7,321 LOC (TypeScript + Svelte + CSS), 122 commits across 11 phases
**Stack:** SvelteKit 2 + Svelte 5 (runes), Supabase, Tailwind v4, sveltekit-superforms + Zod v4, adapter-node
**Deployment:** Docker on VPS (163.245.216.173) — Caddy reverse proxy + auto-HTTPS, GitHub Actions CI/CD → GHCR → SSH deploy
**Live at:** https://asqnmilsim.us

**Unit:** ASQN 1st SFOD, Squadron A (Delta Force milsim)
**Game:** Arma 3
**Size:** Small (10-30 members)
**Communication:** Discord-centric; Discord OAuth is the login mechanism; only guild members can log in

**Database:** 11 tables with full RLS, append-only service records, Custom Access Token Hook injecting roles into JWT
**Auth:** Discord OAuth → guild membership check → Supabase Auth → JWT with user_role claim → RLS enforcement
**CI/CD:** GitHub Actions (3-job: build → deploy → notify) → GHCR → SSH to VPS → docker compose pull + up

**Known Issues / Tech Debt:**
- Awards reference table starts empty — admin must seed via Supabase dashboard
- Discord invite URL placeholder in footer
- Login button missing from public home page
- Dual-write to service_records is non-transactional (SR insert failure logged, not rolled back)
- Discord OAuth provider + Custom Access Token Hook require manual Dashboard configuration
- `$derived()` vs `$derived.by()` in StatusBadge (cosmetic)

## Constraints

- **Auth**: Discord OAuth via Supabase Auth — members already live in Discord; guild membership required
- **Database**: Supabase PostgreSQL with row-level security on every table
- **Hosting**: Interserver VPS (Ubuntu), Docker, Caddy reverse proxy — self-hosted
- **Frontend**: SvelteKit 2 + Svelte 5 (runes), custom components (no component library)
- **Styling**: Tactical/SOF dark aesthetic — black, dark gray, muted accents, covert ops feel
- **Data**: Fresh start for v1.0 — no migration from prior systems
- **Storage**: Supabase Storage for rank insignia, soldier photos, unit assets
- **CI/CD**: GitHub Actions free tier, GHCR for container images

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
| Caddy reverse proxy | Auto-HTTPS, simple config, production-grade | ✓ Good — Let's Encrypt cert auto-provisions, zero maintenance |
| GitHub Actions CI/CD | Free tier, native to GitHub, standard for private repos | ✓ Good — 3-job pipeline (build/deploy/notify) works reliably |
| GHCR for images | Co-located with code, free for private repos, no Docker Hub limits | ✓ Good — SHA + latest tags, layer caching via GHA backend |
| Discord guild membership gate | Only unit members should access personnel system | ✓ Good — non-members rejected at callback, account cleaned up |
| $env/dynamic/private for secrets | Runtime secrets must not be inlined at build time | ✓ Good — SERVICE_ROLE_KEY stays out of Docker image |
| Staging ACME → production ACME | Protect Let's Encrypt rate limits during dev | ✓ Good — switched to production in Phase 10 |
| Passphrase-free CI SSH key | GitHub Actions can't enter passphrases | ✓ Good — asqn_deploy_ci for CI, asqn_deploy for human use |
| sarisia/actions-status-discord | JS action, fast, ecosystem standard for Discord notifications | ✓ Good — success + failure embeds in ops channel |
| --force-recreate on deploy | Caddy picks up Caddyfile changes on every deploy | ✓ Good — no stale config risk |

---
*Last updated: 2026-02-12 after v1.1 milestone complete*
