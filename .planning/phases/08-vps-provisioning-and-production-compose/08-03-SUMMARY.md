---
phase: 08-vps-provisioning-and-production-compose
plan: 03
subsystem: infra
tags: [docker, caddy, tls, reverse-proxy, health-endpoint, sveltekit, compose]

# Dependency graph
requires:
  - phase: 08-01
    provides: Docker CE + Compose v2, deploy user, /opt/asqn directory, UFW firewall
  - phase: 08-02
    provides: Private GitHub repo with full commit history at origin/main
provides:
  - GET /health SvelteKit endpoint returning HTTP 200 with body 'ok'
  - Production docker-compose.yml with app + Caddy on internal network
  - Caddyfile with staging ACME CA and reverse_proxy to app:3000
  - Dev compose preserved as docker-compose.dev.yml
  - VPS running production stack at https://asqnmilsim.us (staging cert)
affects: [09-cicd-pipeline, 10-production-cutover]

# Tech tracking
tech-stack:
  added: [caddy:2-alpine (reverse proxy, auto-HTTPS)]
  patterns:
    - App uses expose (not ports) — only accessible through Caddy on internal Docker network
    - staging ACME CA used throughout phases 8-9 to protect Let's Encrypt rate limits
    - caddy_data + caddy_config named volumes persist TLS state across restarts
    - restart: unless-stopped on all production services

key-files:
  created:
    - src/routes/health/+server.ts
    - docker-compose.dev.yml
    - Caddyfile
  modified:
    - docker-compose.yml
    - .dockerignore

key-decisions:
  - "staging ACME CA (acme-staging-v02.api.letsencrypt.org) used intentionally — production CA added in Phase 10"
  - "App uses expose not ports — only reachable through Caddy reverse proxy on internal Docker network"
  - "caddy_data + caddy_config named volumes ensure TLS certs survive container restarts"
  - "Caddyfile + docker-compose*.yml added to .dockerignore — not part of Docker image"

patterns-established:
  - "Health pattern: GET /health returns 200 'ok' — unauthenticated, no DB dependency"
  - "Reverse proxy pattern: Caddy -> app:3000 on shared internal Docker network"
  - "Compose split: docker-compose.yml = production, docker-compose.dev.yml = local dev"

# Metrics
duration: 10min
completed: 2026-02-13
---

# Phase 8 Plan 03: Production Compose + Caddy Summary

**SvelteKit /health endpoint, production Docker Compose stack with Caddy reverse proxy on internal network, staging ACME TLS, and VPS deployment at https://asqnmilsim.us**

## Performance

- **Duration:** ~10 min (Task 1 automation)
- **Started:** 2026-02-13T01:50:17Z
- **Completed:** 2026-02-13T02:00:00Z (Task 1 complete; Task 2 awaiting user VPS action)
- **Tasks:** 1 of 2 complete (Task 2 = checkpoint:human-action for VPS deployment)
- **Files modified:** 5

## Accomplishments

- Created `src/routes/health/+server.ts` — unauthenticated GET /health returning HTTP 200 "ok"
- Production `docker-compose.yml` with app (expose only) + Caddy (ports 80/443) on shared internal Docker network
- `Caddyfile` with staging ACME CA (`acme-staging-v02.api.letsencrypt.org`) and `reverse_proxy app:3000`
- Dev compose preserved as `docker-compose.dev.yml` (original config, ports 3000:3000)
- `.dockerignore` updated to exclude Caddyfile and docker-compose*.yml from Docker image
- All changes committed and pushed to `origin/main` (commit `2dec9dc`)

## Task Commits

1. **Task 1: Create /health endpoint and production Compose files** - `2dec9dc` (feat)

**Plan metadata:** (pending — after Task 2 completion)

## Files Created/Modified

- `src/routes/health/+server.ts` — SvelteKit GET handler returning HTTP 200 "ok"
- `docker-compose.yml` — Production stack: app + Caddy, internal network, restart policies, named volumes
- `docker-compose.dev.yml` — Dev stack preserved (original config, ports 3000:3000)
- `Caddyfile` — Caddy config with staging ACME CA, reverse_proxy to app:3000
- `.dockerignore` — Added Caddyfile and docker-compose*.yml exclusions

## Decisions Made

- Staging ACME CA used intentionally per project policy (rate limit protection; Phase 10 removes it)
- App container uses `expose` (not `ports`) — enforces that app is only reachable through Caddy
- `caddy_data` and `caddy_config` as separate named volumes (data = certs, config = runtime config)
- Both `Caddyfile` and `docker-compose*.yml` excluded from Docker image via `.dockerignore`

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. Build succeeded on first attempt. All verification checks passed.

## User Setup Required

**Task 2 (VPS Deployment) requires user action.** See checkpoint message for exact commands.

The user must SSH into the VPS and:
1. Clone the repository into `/opt/asqn`
2. Create `/opt/asqn/.env` with Supabase keys
3. Run `docker compose up --build -d`
4. Verify both containers are Up and `https://asqnmilsim.us` responds

## Next Phase Readiness

- After Task 2 completes: application running at `https://asqnmilsim.us` with staging TLS
- Phase 9 (CI/CD) requires the VPS to be running so GitHub Actions can deploy to it
- Phase 10 (production cutover) will remove the staging ACME line from Caddyfile

---
*Phase: 08-vps-provisioning-and-production-compose*
*Completed: 2026-02-13*

## Self-Check: PASSED

- FOUND: src/routes/health/+server.ts
- FOUND: docker-compose.yml (production stack with expose, caddy_data, unless-stopped)
- FOUND: docker-compose.dev.yml (dev stack with 3000:3000)
- FOUND: Caddyfile (staging ACME + reverse_proxy app:3000)
- FOUND: .dockerignore (Caddyfile + docker-compose*.yml excluded)
- FOUND: commit 2dec9dc in git log
- FOUND: 2dec9dc pushed to origin/main
