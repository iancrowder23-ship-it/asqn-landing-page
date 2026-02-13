# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-12)

**Core value:** A soldier's complete service record — from enlistment to current status — is accurate, accessible, and drives unit management decisions.
**Current focus:** v1.1 Production Deployment — Phase 9 CI/CD Pipeline IN PROGRESS (09-02 complete)

## Current Position

Phase: 9 of 10 (CI/CD Pipeline) — IN PROGRESS
Plan: 2 of 3 in phase 09 — 09-02 COMPLETE
Status: CI/CD workflow committed, ready for pipeline validation (09-03)
Last activity: 2026-02-13 — 09-02 complete: deploy.yml workflow + docker-compose.yml image: conversion

Progress: [████████░░] 87% (Phase 9 Plan 2 complete, Plan 3 pipeline validation next)

## Performance Metrics

**v1.0 MVP:**
- Phases: 7
- Plans completed: 21
- Commits: 81 (35 feat)
- Lines of code: 7,247
- Timeline: 2 days (2026-02-10 → 2026-02-11)

**v1.1 (in progress):**
- Plans completed: 5 (08-01, 08-02, 08-03 — all Phase 8; 09-01 — GitHub Secrets; 09-02 — CI/CD workflow)

## Accumulated Context

### Decisions

All v1.0 decisions logged in PROJECT.md Key Decisions table with outcomes.

v1.1 decisions resolved in 08-03:
- Staging ACME CA (`acme-staging-v02.api.letsencrypt.org`) used intentionally — production CA added in Phase 10
- App container uses `expose` (not `ports`) — only reachable through Caddy on internal Docker network
- `caddy_data` and `caddy_config` as separate named volumes (data = certs, config = runtime)
- Caddyfile + docker-compose*.yml excluded from Docker image via .dockerignore
- **SvelteKit `$env/static/public` vars are inlined at build time** — must be passed as Docker ARG/ENV (not just runtime env_file); wired via `docker-compose.yml build.args`

v1.1 decisions resolved in 09-02:
- docker-compose.yml uses image: (not build:) — build happens in CI, VPS only pulls pre-built image from GHCR
- GHCR credentials passed via appleboy/ssh-action `envs:` field (not string interpolation) for security
- deploy job uses `docker compose pull app` then `docker compose up -d --no-deps app` — two-step ensures correct image before restart; Caddy untouched
- SUPABASE_SERVICE_ROLE_KEY is NOT a build-arg — stays in /opt/asqn/.env as runtime secret only

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
- **Phase 9 CI/CD must pass** `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_PUBLISHABLE_KEY` as GitHub Actions secrets → docker build args (not just runtime env) — DONE in 09-02

## Session Continuity

Last session: 2026-02-13
Stopped at: Phase 9 Plan 2 COMPLETE — deploy.yml + docker-compose.yml committed (b1ad7de, a8b3efa)
Resume file: None
Next action: Execute Phase 9 Plan 3 (pipeline validation — push to main, verify full build+deploy flow)
