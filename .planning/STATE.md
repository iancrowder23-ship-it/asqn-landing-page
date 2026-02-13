# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-12)

**Core value:** A soldier's complete service record — from enlistment to current status — is accurate, accessible, and drives unit management decisions.
**Current focus:** v1.1 Production Deployment — Phase 8 COMPLETE, ready for Phase 9: CI/CD Pipeline

## Current Position

Phase: 9 of 10 (CI/CD Pipeline) — IN PROGRESS
Plan: 1 of 3 in phase 09 — 09-01 COMPLETE
Status: Phase 9.1 in progress — 7 GitHub Secrets configured, ready for deploy workflow (09-02)
Last activity: 2026-02-13 — 09-01 complete: all 7 GitHub Secrets set (SSH, GHCR, Supabase)

Progress: [████████░░] 83% (Phase 9 Plan 1 complete, Plan 2 deploy workflow next)

## Performance Metrics

**v1.0 MVP:**
- Phases: 7
- Plans completed: 21
- Commits: 81 (35 feat)
- Lines of code: 7,247
- Timeline: 2 days (2026-02-10 → 2026-02-11)

**v1.1 (in progress):**
- Plans completed: 4 (08-01, 08-02, 08-03 — all Phase 8; 09-01 — GitHub Secrets)

## Accumulated Context

### Decisions

All v1.0 decisions logged in PROJECT.md Key Decisions table with outcomes.

v1.1 decisions resolved in 08-03:
- Staging ACME CA (`acme-staging-v02.api.letsencrypt.org`) used intentionally — production CA added in Phase 10
- App container uses `expose` (not `ports`) — only reachable through Caddy on internal Docker network
- `caddy_data` and `caddy_config` as separate named volumes (data = certs, config = runtime)
- Caddyfile + docker-compose*.yml excluded from Docker image via .dockerignore
- **SvelteKit `$env/static/public` vars are inlined at build time** — must be passed as Docker ARG/ENV (not just runtime env_file); wired via `docker-compose.yml build.args`

v1.1 decisions resolved in 09-01:
- GHCR_USERNAME = iancrowder23-ship-it (GitHub org/account that owns the GHCR packages)
- GHCR_PAT is a classic PAT with read:packages only — fine-grained tokens don't support packages scope
- SSH credentials reuse the Phase 8 asqn_deploy key pair (no new key generated)

v1.1 decisions resolved in 08-02:
- GitHub repo visibility: **private** (iancrowder23-ship-it/asqn-landing-page)
- HTTPS remote used (gh CLI default); SSH can be added if VPS deploy key needs it
- Main branch confirmed as default; master branch deleted

v1.1 decisions resolved in 08-01 (VPS provisioning):
- VPS IP: **163.245.216.173** (DNS A record asqnmilsim.us set to this IP)
- Deploy user strategy: **new `deploy` user** with docker group, SSH key-only via ~/.ssh/asqn_deploy (ed25519)
- Root login disabled, password auth disabled on VPS
- /opt/asqn owned by deploy:deploy — deployment root for all plans

### Pending Todos

- Add a login button to the public home page (Phase 9 or gap closure)

### Roadmap Evolution

- Phase 9.1 inserted after Phase 9: Discord Auth Gate — restrict login to ASQN Discord server members only (URGENT)

### Blockers/Concerns

- **Shell**: `NPM_CONFIG_PREFIX=/nonexistent` — all npm/npx commands need `env -u NPM_CONFIG_PREFIX` prefix
- Use staging ACME endpoint (`acme_ca https://acme-staging-v02.api.letsencrypt.org/directory`) throughout Phases 8-9; remove only in Phase 10 final validation to protect Let's Encrypt rate limit (5 certs/domain/week)
- **VPS SSH**: `ssh -i ~/.ssh/asqn_deploy deploy@163.245.216.173` (key-only, root login disabled)
- **Phase 9 CI/CD must pass** `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_PUBLISHABLE_KEY` as GitHub Actions secrets → docker build args (not just runtime env)

## Session Continuity

Last session: 2026-02-13
Stopped at: Phase 9 Plan 1 COMPLETE — all 7 GitHub Secrets set on iancrowder23-ship-it/asqn-landing-page
Resume file: None
Next action: Execute Phase 9 Plan 2 (deploy workflow — GitHub Actions CI/CD to VPS)
