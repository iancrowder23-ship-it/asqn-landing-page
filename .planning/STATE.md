# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-12)

**Core value:** A soldier's complete service record — from enlistment to current status — is accurate, accessible, and drives unit management decisions.
**Current focus:** v1.1 Production Deployment — Phase 8: VPS Provisioning and Production Compose

## Current Position

Phase: 8 of 10 (VPS Provisioning and Production Compose)
Plan: 2 of 3 in current phase (08-02 complete, awaiting human-verify checkpoint)
Status: In progress — checkpoint awaiting human verification
Last activity: 2026-02-12 — 08-02 GitHub repo created and pushed (88 commits to main)

Progress: [███████░░░] 70% (v1.0 complete, v1.1 starting)

## Performance Metrics

**v1.0 MVP:**
- Phases: 7
- Plans completed: 21
- Commits: 81 (35 feat)
- Lines of code: 7,247
- Timeline: 2 days (2026-02-10 → 2026-02-11)

**v1.1 (in progress):**
- Plans completed: 0

## Accumulated Context

### Decisions

All v1.0 decisions logged in PROJECT.md Key Decisions table with outcomes.

v1.1 decisions resolved in 08-02:
- GitHub repo visibility: **private** (iancrowder23-ship-it/asqn-landing-page)
- HTTPS remote used (gh CLI default); SSH can be added if VPS deploy key needs it
- Main branch confirmed as default; master branch deleted

Pending v1.1 decisions:
- Deploy user strategy (new `deploy` user vs restrict existing)
- Confirm VPS IP address for DNS A record and SSH_HOST secret

### Pending Todos

None.

### Blockers/Concerns

- **Shell**: `NPM_CONFIG_PREFIX=/nonexistent` — all npm/npx commands need `env -u NPM_CONFIG_PREFIX` prefix
- VPS SSH access required before Phase 8 can execute
- DNS propagation is longest-lead item — initiate DNS A record change as first Phase 8 action
- Use staging ACME endpoint (`acme_ca https://acme-staging-v02.api.letsencrypt.org/directory`) throughout Phases 8-9; remove only in Phase 10 final validation to protect Let's Encrypt rate limit (5 certs/domain/week)

## Session Continuity

Last session: 2026-02-12
Stopped at: 08-02 checkpoint:human-verify — GitHub repo created, awaiting user verification
Resume file: None
Next action: User verifies GitHub repo, then continue 08-02 or proceed to 08-03
