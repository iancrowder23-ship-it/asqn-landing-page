---
phase: 08-vps-provisioning-and-production-compose
plan: 03
subsystem: infra
tags: [docker, caddy, tls, reverse-proxy, health-endpoint, sveltekit, compose, build-args]

# Dependency graph
requires:
  - phase: 08-01
    provides: Docker CE + Compose v2, deploy user, /opt/asqn directory, UFW firewall
  - phase: 08-02
    provides: Private GitHub repo with full commit history at origin/main
provides:
  - GET /health SvelteKit endpoint returning HTTP 200 with body 'ok'
  - Production docker-compose.yml with app + Caddy on internal network, build args for PUBLIC_* vars
  - Caddyfile with staging ACME CA and reverse_proxy to app:3000
  - Dev compose preserved as docker-compose.dev.yml
  - Dockerfile with ARG/ENV for PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_PUBLISHABLE_KEY
  - VPS running production stack at https://asqnmilsim.us (staging cert) — health endpoint confirmed
affects: [09-cicd-pipeline, 10-production-cutover]

# Tech tracking
tech-stack:
  added: [caddy:2-alpine (reverse proxy, auto-HTTPS)]
  patterns:
    - App uses expose (not ports) — only accessible through Caddy on internal Docker network
    - staging ACME CA used throughout phases 8-9 to protect Let's Encrypt rate limits
    - caddy_data + caddy_config named volumes persist TLS state across restarts
    - restart: unless-stopped on all production services
    - SvelteKit $env/static/public vars must be passed as Docker ARG/ENV at build time (inlined at compile)
    - docker-compose.yml build.args passes PUBLIC_* from .env file into the Docker build context

key-files:
  created:
    - src/routes/health/+server.ts
    - docker-compose.dev.yml
    - Caddyfile
  modified:
    - docker-compose.yml
    - Dockerfile
    - .dockerignore

key-decisions:
  - "staging ACME CA (acme-staging-v02.api.letsencrypt.org) used intentionally — production CA added in Phase 10"
  - "App uses expose not ports — only reachable through Caddy reverse proxy on internal Docker network"
  - "caddy_data + caddy_config named volumes ensure TLS certs survive container restarts"
  - "Caddyfile + docker-compose*.yml added to .dockerignore — not part of Docker image"
  - "SvelteKit PUBLIC_* vars must be ARG/ENV in Dockerfile — they are inlined at build time, not runtime"

patterns-established:
  - "Health pattern: GET /health returns 200 'ok' — unauthenticated, no DB dependency"
  - "Reverse proxy pattern: Caddy -> app:3000 on shared internal Docker network"
  - "Compose split: docker-compose.yml = production, docker-compose.dev.yml = local dev"
  - "Build-arg pattern: PUBLIC_* SvelteKit env vars wired through docker-compose build.args -> Dockerfile ARG/ENV"

# Metrics
duration: 25min
completed: 2026-02-13
---

# Phase 8 Plan 03: Production Compose + Caddy Summary

**SvelteKit /health endpoint and production Docker Compose stack with Caddy staging-ACME TLS deployed to VPS at https://asqnmilsim.us — health endpoint confirmed returning 200 "ok"**

## Performance

- **Duration:** ~25 min (Task 1 automation + build-arg fix + VPS deploy)
- **Started:** 2026-02-13T01:50:17Z
- **Completed:** 2026-02-13T02:15:00Z
- **Tasks:** 2 of 2 complete
- **Files modified:** 6

## Accomplishments

- Created `src/routes/health/+server.ts` — unauthenticated GET /health returning HTTP 200 "ok"
- Production `docker-compose.yml` with app (expose only) + Caddy (ports 80/443) on shared internal Docker network, build args for PUBLIC_* vars
- `Caddyfile` with staging ACME CA (`acme-staging-v02.api.letsencrypt.org`) and `reverse_proxy app:3000`
- Dev compose preserved as `docker-compose.dev.yml` (original config, ports 3000:3000)
- `.dockerignore` updated to exclude Caddyfile and docker-compose*.yml from Docker image
- `Dockerfile` updated with ARG/ENV for `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_PUBLISHABLE_KEY` (required for SvelteKit build-time inlining)
- VPS deployment complete: `https://asqnmilsim.us` live with staging TLS, `/health` returns "ok"

## Task Commits

1. **Task 1: Create /health endpoint and production Compose files** - `2dec9dc` (feat)
2. **Build-arg fix (deviation)** - `b9c0305` (fix) — Dockerfile ARG/ENV + docker-compose build.args for PUBLIC_* vars
3. **Task 2: VPS deployment** — human-action checkpoint, no code commit (VPS-side operations only)

**Plan metadata:** `6577900` (docs: Task 1 complete — checkpoint awaiting VPS deployment)

## Files Created/Modified

- `src/routes/health/+server.ts` — SvelteKit GET handler returning HTTP 200 "ok"
- `docker-compose.yml` — Production stack: app + Caddy, internal network, restart policies, named volumes, build args
- `docker-compose.dev.yml` — Dev stack preserved (original config, ports 3000:3000)
- `Caddyfile` — Caddy config with staging ACME CA, reverse_proxy to app:3000
- `Dockerfile` — Added ARG/ENV for PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_PUBLISHABLE_KEY before `npm run build`
- `.dockerignore` — Added Caddyfile and docker-compose*.yml exclusions

## Decisions Made

- Staging ACME CA used intentionally per project policy (rate limit protection; Phase 10 removes it)
- App container uses `expose` (not `ports`) — enforces that app is only reachable through Caddy
- `caddy_data` and `caddy_config` as separate named volumes (data = certs, config = runtime config)
- Both `Caddyfile` and `docker-compose*.yml` excluded from Docker image via `.dockerignore`
- `PUBLIC_*` SvelteKit env vars must be available at Docker build time — they are statically inlined by Vite at compile, not read at runtime

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Dockerfile missing ARG/ENV for SvelteKit public env vars**
- **Found during:** Task 2 (VPS deployment)
- **Issue:** SvelteKit's `$env/static/public` variables (`PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_PUBLISHABLE_KEY`) are inlined at build time by Vite. The Dockerfile ran `npm run build` without them available, so the built app had empty/undefined values for Supabase connection details — the app would fail to connect to Supabase at runtime.
- **Fix:** Added `ARG PUBLIC_SUPABASE_URL`, `ARG PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `ENV PUBLIC_SUPABASE_URL=$PUBLIC_SUPABASE_URL`, `ENV PUBLIC_SUPABASE_PUBLISHABLE_KEY=$PUBLIC_SUPABASE_PUBLISHABLE_KEY` to the builder stage of `Dockerfile` (before `RUN npm run build`). Added `build.args` to the `app` service in `docker-compose.yml` to pass these from the `.env` file into the build context.
- **Files modified:** `Dockerfile`, `docker-compose.yml`
- **Verification:** VPS rebuild succeeded; `curl -k https://asqnmilsim.us` returns application HTML; `/health` returns "ok"
- **Committed in:** `b9c0305` (fix(08-03): pass PUBLIC_* env vars as Docker build args)

---

**Total deviations:** 1 auto-fixed (Rule 1 bug — build-time env vars missing)
**Impact on plan:** Critical fix — without it the built app had no Supabase connection and would fail all authenticated routes. The pattern is now documented for all future Docker builds in this project.

## Issues Encountered

None beyond the build-arg deviation above. DNS had propagated by the time of deployment; Caddy obtained staging ACME certificate successfully on first attempt.

## User Setup Required

Production `.env` created on VPS at `/opt/asqn/.env` with:
- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ORIGIN=https://asqnmilsim.us`
- `NODE_ENV=production`

File permissions: `600` (deploy:deploy). Not in git, not in Docker image. Correct.

## Next Phase Readiness

- `https://asqnmilsim.us` is live with staging TLS — application is accessible
- `/health` returns HTTP 200 "ok" — confirmed from external curl
- Phase 9 (CI/CD) can target this VPS; `docker compose pull && docker compose up -d` is the deployment pattern
- Phase 10 (production cutover) will remove `acme_ca` line from `Caddyfile` to switch to production Let's Encrypt certs
- **Important for Phase 9:** The CI/CD pipeline must pass `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_PUBLISHABLE_KEY` as build args (GitHub Actions secrets → docker build args)

---
*Phase: 08-vps-provisioning-and-production-compose*
*Completed: 2026-02-13*

## Self-Check: PASSED

- FOUND: `src/routes/health/+server.ts`
- FOUND: `docker-compose.yml` (production stack — expose, caddy_data, unless-stopped, build.args)
- FOUND: `docker-compose.dev.yml` (dev stack — ports 3000:3000)
- FOUND: `Caddyfile` (staging ACME + reverse_proxy app:3000)
- FOUND: `Dockerfile` (ARG/ENV for PUBLIC_SUPABASE_URL + PUBLIC_SUPABASE_PUBLISHABLE_KEY)
- FOUND: `.dockerignore` (Caddyfile + docker-compose*.yml excluded)
- FOUND: commit `2dec9dc` in git log (feat: health endpoint + production compose)
- FOUND: commit `b9c0305` in git log (fix: Docker build args for PUBLIC_* vars)
- VERIFIED: `curl -k https://asqnmilsim.us/health` returns "ok" (user confirmed)
