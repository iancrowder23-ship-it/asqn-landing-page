# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-12)

**Core value:** A soldier's complete service record — from enlistment to current status — is accurate, accessible, and drives unit management decisions.
**Current focus:** v1.1 Production Deployment — Phase 8: VPS Provisioning and Production Compose

## Current Position

Phase: 8 of 10 (VPS Provisioning and Production Compose)
Plan: 3 of 3 in current phase (08-03 Task 1 COMPLETE — awaiting human-action checkpoint Task 2)
Status: CHECKPOINT — user must SSH to VPS and deploy production stack
Last activity: 2026-02-13 — 08-03 Task 1 complete: /health endpoint, production docker-compose.yml, Caddyfile created and pushed (2dec9dc)

Progress: [████████░░] 80% (v1.1 in progress — production stack files ready, VPS deploy pending)

## Performance Metrics

**v1.0 MVP:**
- Phases: 7
- Plans completed: 21
- Commits: 81 (35 feat)
- Lines of code: 7,247
- Timeline: 2 days (2026-02-10 → 2026-02-11)

**v1.1 (in progress):**
- Plans completed: 2 (08-01 phase plan, 08-02 GitHub repo)
- 08-03 Task 1 complete (pending Task 2 human-action)

## Accumulated Context

### Decisions

All v1.0 decisions logged in PROJECT.md Key Decisions table with outcomes.

v1.1 decisions resolved in 08-03:
- Staging ACME CA (`acme-staging-v02.api.letsencrypt.org`) used intentionally — production CA added in Phase 10
- App container uses `expose` (not `ports`) — only reachable through Caddy on internal Docker network
- `caddy_data` and `caddy_config` as separate named volumes (data = certs, config = runtime)
- Caddyfile + docker-compose*.yml excluded from Docker image via .dockerignore

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

None.

### Blockers/Concerns

- **Shell**: `NPM_CONFIG_PREFIX=/nonexistent` — all npm/npx commands need `env -u NPM_CONFIG_PREFIX` prefix
- Use staging ACME endpoint (`acme_ca https://acme-staging-v02.api.letsencrypt.org/directory`) throughout Phases 8-9; remove only in Phase 10 final validation to protect Let's Encrypt rate limit (5 certs/domain/week)
- **VPS SSH**: `ssh -i ~/.ssh/asqn_deploy deploy@163.245.216.173` (key-only, root login disabled)
- DNS propagation for asqnmilsim.us -> 163.245.216.173 (initiated 2026-02-13 — verify before ACME challenge)

## Session Continuity

Last session: 2026-02-13
Stopped at: 08-03 Task 1 COMPLETE — awaiting user VPS deployment (Task 2 checkpoint:human-action)
Resume file: None
Next action: User SSHs to VPS, clones repo, creates .env, runs docker compose up --build -d
