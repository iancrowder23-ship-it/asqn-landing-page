---
phase: 09-ci-cd-pipeline
plan: 01
subsystem: infra
tags: [github-actions, ghcr, ssh, secrets, cicd]

# Dependency graph
requires:
  - phase: 08-vps-provisioning-and-production-compose
    provides: VPS deploy user, SSH key pair (asqn_deploy), VPS IP (163.245.216.173)
provides:
  - All 7 GitHub Secrets configured on iancrowder23-ship-it/asqn-landing-page
  - SSH_HOST, SSH_USER, SSH_PRIVATE_KEY for VPS deployment via Actions
  - GHCR_PAT, GHCR_USERNAME for private image pull on VPS
  - PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY for Docker build args
affects: [09-02-deploy-workflow, any phase that triggers GitHub Actions]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "GitHub Secrets for CI/CD — store sensitive values as repo secrets, reference with ${{ secrets.NAME }} in workflows"
    - "GHCR_PAT (classic, read:packages only) used on VPS for docker login — GITHUB_TOKEN only valid inside runners"

key-files:
  created: []
  modified: []

key-decisions:
  - "GHCR_USERNAME = iancrowder23-ship-it (GitHub org/account that owns the packages, used for docker login on VPS)"
  - "GHCR_PAT is a classic PAT with read:packages scope only — minimal privilege for VPS to pull images"
  - "SSH_PRIVATE_KEY is the same ed25519 key pair established in Phase 8 (asqn_deploy) — no new key generated"

patterns-established:
  - "Classic PAT (not fine-grained) required for GHCR read:packages — fine-grained tokens do not support packages scope as of 2026-02"

# Metrics
duration: 10min
completed: 2026-02-13
---

# Phase 9 Plan 1: GitHub Secrets Configuration Summary

**7 GitHub Actions secrets configured on iancrowder23-ship-it/asqn-landing-page, enabling SSH deployment and GHCR private image pulls for the CI/CD pipeline**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-02-13T03:19:36Z
- **Completed:** 2026-02-13T03:23:13Z
- **Tasks:** 3 (1 auto, 1 checkpoint:human-action, 1 auto)
- **Files modified:** 0 (GitHub API operations only)

## Accomplishments
- Set 5 GitHub Secrets via gh CLI: SSH_HOST, SSH_USER, SSH_PRIVATE_KEY, PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY
- User created GHCR PAT (classic, read:packages scope) for VPS private image pulls
- Set final 2 secrets: GHCR_PAT and GHCR_USERNAME
- All 7 secrets verified present on repository via `gh secret list`

## Task Commits

No local file changes — all tasks were GitHub API operations only. No commits generated.

## Files Created/Modified

None — this plan configures external GitHub repository secrets only.

## Decisions Made
- GHCR_USERNAME set to `iancrowder23-ship-it` (the GitHub account that owns the private GHCR registry)
- GHCR_PAT is a classic PAT (fine-grained tokens do not support `packages:read` scope)
- SSH credentials reuse the Phase 8 deploy key pair — no new key needed

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

Task 2 required manual browser-based PAT creation (checkpoint:human-action). User created the PAT at https://github.com/settings/tokens with `read:packages` scope and provided:
- PAT: `[REDACTED - PAT stored as GitHub Secret GHCR_PAT]`
- Username: `iancrowder23-ship-it`

## Next Phase Readiness

- All 7 GitHub Secrets are in place
- Repository is ready for Plan 09-02: GitHub Actions deploy workflow creation
- No blockers

---
*Phase: 09-ci-cd-pipeline*
*Completed: 2026-02-13*
