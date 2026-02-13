---
phase: 09-ci-cd-pipeline
plan: 02
subsystem: infra
tags: [github-actions, ghcr, docker, ci-cd, ssh, scp, appleboy]

# Dependency graph
requires:
  - phase: 09-ci-cd-pipeline
    provides: "09-01: All 7 GitHub Secrets configured (SSH_HOST, SSH_USER, SSH_PRIVATE_KEY, GHCR_PAT, GHCR_USERNAME, PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY)"
  - phase: 08-vps-provisioning-and-production-compose
    provides: "VPS at 163.245.216.173, deploy user, /opt/asqn deployment root, docker-compose.yml baseline"
provides:
  - "Production docker-compose.yml using image: ghcr.io/iancrowder23-ship-it/asqn-landing-page:latest (no build:)"
  - "GitHub Actions workflow .github/workflows/deploy.yml with build+deploy jobs"
  - "Full CI/CD pipeline: push to main -> GHCR image build -> VPS deploy"
affects: [09-03-pipeline-validation, any future deploy changes]

# Tech tracking
tech-stack:
  added:
    - docker/login-action@v3
    - docker/metadata-action@v5
    - docker/build-push-action@v6
    - appleboy/scp-action@v1
    - appleboy/ssh-action@v1
  patterns:
    - "Two-job GitHub Actions workflow: build job pushes to GHCR, deploy job SCPs files + SSHes to VPS"
    - "docker/metadata-action@v5 for SHA+latest tag generation (type=sha + type=raw,value=latest,enable={{is_default_branch}})"
    - "GHA cache backend (type=gha,mode=max) for Docker layer caching"
    - "PUBLIC_* vars as build-args from GitHub Secrets (baked at Vite compile time, not runtime)"
    - "GHCR secrets passed via envs: parameter to appleboy/ssh-action (not string interpolation in script)"
    - "deploy job uses --no-deps app to restart only app container; Caddy stays untouched"

key-files:
  created:
    - .github/workflows/deploy.yml
  modified:
    - docker-compose.yml

key-decisions:
  - "docker-compose.yml uses image: (not build:) — build happens in CI, VPS only pulls pre-built image"
  - "GHCR credentials passed via envs: to appleboy/ssh-action for security (environment variable, not script interpolation)"
  - "deploy job uses docker compose pull app then docker compose up -d --no-deps app — two-step ensures correct image before restart"

patterns-established:
  - "Production docker-compose.yml is image-only: no build: block, no PUBLIC_* args — those belong in CI"
  - "SCP sources use comma-separated list with no spaces: source: 'docker-compose.yml,Caddyfile'"
  - "appleboy/ssh-action envs: field for passing secrets into remote script environment"

# Metrics
duration: 2min
completed: 2026-02-13
---

# Phase 9 Plan 2: CI/CD Pipeline Workflow Summary

**Two-job GitHub Actions workflow (build+push to GHCR, SCP+SSH deploy to VPS) with docker-compose.yml converted from build: to image: for push-to-deploy automation**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-13T03:24:54Z
- **Completed:** 2026-02-13T03:26:12Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Replaced `build:` block in docker-compose.yml with `image: ghcr.io/iancrowder23-ship-it/asqn-landing-page:latest`
- Created .github/workflows/deploy.yml with complete two-job CI/CD pipeline
- Build job: GHCR login via GITHUB_TOKEN, SHA+latest metadata tags, docker/build-push-action@v6 with GHA layer cache, PUBLIC_* build-args from GitHub Secrets
- Deploy job: SCP docker-compose.yml+Caddyfile to /opt/asqn/, SSH to VPS with GHCR PAT login, docker compose pull+restart app only

## Task Commits

Each task was committed atomically:

1. **Task 1: Transform docker-compose.yml from build: to image:** - `b1ad7de` (chore)
2. **Task 2: Create GitHub Actions deploy.yml workflow** - `a8b3efa` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `docker-compose.yml` - Replaced build: context+args with image: ghcr.io/iancrowder23-ship-it/asqn-landing-page:latest
- `.github/workflows/deploy.yml` - Two-job CI/CD workflow: build (GHCR push) + deploy (VPS SCP+SSH)

## Decisions Made
- docker-compose.yml is now the production file with `image:` — it is SCPed to /opt/asqn/ on every deploy, overwriting the VPS copy
- GHCR credentials (GHCR_PAT, GHCR_USERNAME) passed to appleboy/ssh-action via `envs:` field, then referenced as `$GHCR_PAT`/`$GHCR_USERNAME` in the remote script — safer than direct `${{ secrets.* }}` interpolation in script strings
- SUPABASE_SERVICE_ROLE_KEY is NOT a build-arg; it stays in /opt/asqn/.env on the VPS as a runtime secret

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Security Improvement] Used envs: parameter for GHCR credentials in SSH script**
- **Found during:** Task 2 (workflow creation)
- **Issue:** Plan spec used `${{ secrets.GHCR_PAT }}` directly in the `script:` block. A security hook flagged direct secret interpolation in script strings as a potential injection risk pattern.
- **Fix:** Used `envs: GHCR_PAT,GHCR_USERNAME` + `env:` block to pass secrets as environment variables; script uses `$GHCR_PAT`/`$GHCR_USERNAME` (shell vars, not GitHub expression interpolation)
- **Files modified:** .github/workflows/deploy.yml
- **Verification:** GHCR_USERNAME appears in workflow; no ${{ secrets.* }} in script body
- **Committed in:** a8b3efa (Task 2 commit)

---

**Total deviations:** 1 auto-improved (security pattern)
**Impact on plan:** Minor security improvement — functionally equivalent, GHCR secrets accessed as env vars instead of interpolated strings. All success criteria still met.

## Issues Encountered

- Security hook blocked initial Write tool attempt for deploy.yml (correct behavior — flagged direct secrets in script strings). Resolved by restructuring to use appleboy/ssh-action's `envs:` parameter pattern, which is the recommended secure approach.

## User Setup Required

None — all GitHub Secrets were configured in Plan 09-01. The workflow is ready to trigger on next push to main.

## Next Phase Readiness

- CI/CD pipeline is fully configured and committed
- Pushing to main will now trigger the build+deploy workflow
- Plan 09-03 will validate the pipeline by pushing a test commit and verifying the full flow end-to-end
- No blockers

---
*Phase: 09-ci-cd-pipeline*
*Completed: 2026-02-13*
