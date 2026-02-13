---
phase: 09-ci-cd-pipeline
plan: 03
subsystem: infra
tags: [github-actions, ghcr, docker, ssh, ci-cd, pipeline-validation]

# Dependency graph
requires:
  - phase: 09-02
    provides: deploy.yml workflow + docker-compose.yml image: pull pattern
  - phase: 09-01
    provides: GitHub Secrets (SSH_PRIVATE_KEY, GHCR_PAT, GHCR_USERNAME, SSH_HOST, SSH_USER, PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY)
provides:
  - Verified end-to-end CI/CD pipeline: push to main -> GitHub Actions build -> GHCR image push -> VPS deploy
  - GHCR image at ghcr.io/iancrowder23-ship-it/asqn-landing-page with sha-97e8c47 + latest tags
  - Live VPS serving GHCR-pulled image at https://asqnmilsim.us
affects: [phase-10-production-tls, all-future-deployments]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Passphrase-free ed25519 SSH key (asqn_deploy_ci) dedicated to GitHub Actions CI use"
    - "GHA cache-from/cache-to type=gha for Docker layer caching — second build will be faster"
    - "GHCR image tags: both sha-<shortSHA> and latest on every main push"

key-files:
  created: []
  modified:
    - .github/workflows/deploy.yml

key-decisions:
  - "New passphrase-free CI key (asqn_deploy_ci) created separately from the Phase 8 asqn_deploy key — CI key has no passphrase so appleboy actions can use it without interactive prompt"
  - "SSH_PRIVATE_KEY secret updated in GitHub to use asqn_deploy_ci public key added to VPS authorized_keys"

patterns-established:
  - "CI key pattern: use a separate ed25519 key with no passphrase for CI/CD; human-use keys may retain passphrases"

# Metrics
duration: 15min
completed: 2026-02-13
---

# Phase 9 Plan 03: Pipeline Validation Summary

**End-to-end CI/CD pipeline verified: push to main builds Docker image, pushes sha-97e8c47 + latest to GHCR, deploys to VPS via SSH, and /health returns ok — zero secrets in image layers**

## Performance

- **Duration:** ~15 min (including SSH fix verification)
- **Started:** 2026-02-13T03:35:00Z
- **Completed:** 2026-02-13T03:42:30Z
- **Tasks:** 2 (Task 1: retrigger pipeline; Task 2: verify end-to-end)
- **Files modified:** 1 (.github/workflows/deploy.yml comment)

## Accomplishments
- SSH connectivity confirmed with new passphrase-free asqn_deploy_ci key
- GitHub Actions run 21973748681 completed: build job (1m6s) + deploy job (14s) both succeeded
- GHCR image pushed with tags: `sha-97e8c47` and `latest`
- VPS running `ghcr.io/iancrowder23-ship-it/asqn-landing-page:latest` (pulled from GHCR, not locally built)
- `https://asqnmilsim.us/health` returns `ok`
- No `SUPABASE_SERVICE_ROLE_KEY` or other secrets found in Docker image history

## Task Commits

1. **Retrigger: add comment to deploy.yml** - `97e8c47` (chore)

**Plan metadata:** pending docs commit

## Files Created/Modified
- `.github/workflows/deploy.yml` - Added comment to retrigger pipeline after SSH key fix

## Decisions Made
- Separate passphrase-free key (`asqn_deploy_ci`) for CI use — the Phase 8 `asqn_deploy` key was passphrase-protected which caused the first pipeline run's deploy job to fail. A new ed25519 key without a passphrase was generated, the GitHub `SSH_PRIVATE_KEY` secret was updated, and the public key was added to the VPS `authorized_keys`.

## Deviations from Plan

None - plan executed as specified. The SSH key fix was a pre-condition handled before this continuation run began.

## Issues Encountered

**First pipeline run (run 21973517490):** Deploy job failed because the `SSH_PRIVATE_KEY` secret contained a passphrase-protected key (`asqn_deploy`). The `appleboy/scp-action` and `appleboy/ssh-action` cannot handle interactive passphrase prompts.

**Resolution:** User generated a new passphrase-free ed25519 key (`asqn_deploy_ci`), updated the `SSH_PRIVATE_KEY` GitHub Secret, and added the new public key to the VPS `authorized_keys` for the `deploy` user. This was completed before this continuation run.

**Second pipeline run (run 21973748681):** Both jobs succeeded on first attempt.

## Verification Results

All 5 success criteria verified:

| Check | Result |
| ----- | ------ |
| SSH connectivity (`asqn_deploy_ci`) | `SSH_OK` |
| GHA workflow status | `completed / success` |
| GHCR image tags | `sha-97e8c47` + `latest` pushed |
| VPS running GHCR image | `ghcr.io/iancrowder23-ship-it/asqn-landing-page:latest` |
| `/health` endpoint | `ok` |
| No secrets in image layers | `CLEAN: no service_role in image history` |

## User Setup Required

None - no additional manual configuration required for this plan.

## Next Phase Readiness
- Phase 9 CI/CD pipeline is fully operational
- Any future push to main will automatically build, push to GHCR, and deploy to VPS
- Phase 10 (production TLS) ready to proceed — remove staging ACME CA from Caddyfile

---
*Phase: 09-ci-cd-pipeline*
*Completed: 2026-02-13*
