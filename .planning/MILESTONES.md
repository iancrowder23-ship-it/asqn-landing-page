# Milestones

## v1.0 MVP (Shipped: 2026-02-12)

**Phases completed:** 7 phases, 21 plans
**Timeline:** 2 days (2026-02-10 → 2026-02-11)
**Commits:** 81 (35 feat)
**Lines of code:** 7,247 (TypeScript + Svelte + CSS)
**Git range:** initial commit → 32169ba

**Delivered:** Complete Arma 3 milsim unit website with PERSCOM-style personnel management — from public recruiting site through full service record lifecycle.

**Key accomplishments:**
1. SvelteKit 2 + Svelte 5 foundation with Discord OAuth, 4-tier RBAC, and full RLS enforcement
2. Public website with tactical dark aesthetic — landing, about, ORBAT, rank chart, leadership, events, enlistment, contact
3. Complete soldier profiles with service record timeline, attendance stats, combat record, and assignment history
4. Awards and qualifications system with NCO+/Command+ granting and triple-view internal roster (card/tree/table)
5. Full enlistment pipeline (submit → review → accept = auto-soldier) and personnel actions (promote, transfer, status, notes)
6. Event management with per-soldier attendance recording and admin dashboard with live unit metrics

**Tech debt carried forward:**
- Awards reference table starts empty (seed via dashboard)
- Discord invite URL placeholder in footer
- Phase 2 missing per-plan SUMMARY.md files (executed as single commit)

---

## v1.1 Production Deployment (Shipped: 2026-02-12)

**Phases completed:** 4 phases, 8 plans
**Timeline:** 1 day (2026-02-12)
**Commits:** 37 (4 feat)
**Files changed:** 47 files, +7,059 / -1,397 lines
**Lines of code:** 7,321 (TypeScript + Svelte + CSS)
**Git range:** 32169ba → 77292b9

**Delivered:** Automated CI/CD pipeline — push to main builds, packages, and deploys the application to a production VPS with HTTPS, Discord auth gating, and observable deploy notifications.

**Key accomplishments:**
1. VPS provisioned with Docker CE, UFW firewall (22/80/443 only), SSH-hardened deploy user, and DNS at asqnmilsim.us
2. Production Docker Compose stack with Caddy reverse proxy, auto-HTTPS, /health endpoint, and internal-only app network
3. GitHub Actions CI/CD pipeline — push to main auto-builds GHCR image and deploys to VPS via SSH
4. Discord auth gate — only ASQN Discord server members can log in; non-members rejected with account cleanup
5. Production Let's Encrypt TLS, Discord deploy notifications, and 7-point production validation all passing

**Tech debt carried forward:**
- Awards reference table starts empty (seed via dashboard)
- Discord invite URL placeholder in footer
- Login button missing from public home page
- Dual-write to service_records is non-transactional (SR insert failure logged, not rolled back)

---

