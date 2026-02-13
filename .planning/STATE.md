# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-12)

**Core value:** A soldier's complete service record — from enlistment to current status — is accurate, accessible, and drives unit management decisions.
**Current focus:** v1.1 Production Deployment — Phase 8: VPS Provisioning and Production Compose

## Current Position

Phase: 8 of 10 (VPS Provisioning and Production Compose)
Plan: 2 of 3 in current phase (08-02 COMPLETE — human-verify approved)
Status: In progress — ready for 08-03
Last activity: 2026-02-12 — 08-02 complete: private GitHub repo verified (88 commits, .env absent, main branch)

Progress: [███████░░░] 70% (v1.0 complete, v1.1 starting)

## Performance Metrics

**v1.0 MVP:**
- Phases: 7
- Plans completed: 21
- Commits: 81 (35 feat)
- Lines of code: 7,247
- Timeline: 2 days (2026-02-10 → 2026-02-11)

**v1.1 (in progress):**
- Plans completed: 2 (08-01 phase plan, 08-02 GitHub repo)

## Accumulated Context

### Decisions

All v1.0 decisions logged in PROJECT.md Key Decisions table with outcomes.

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
- DNS propagation for asqnmilsim.us -> 163.245.216.173 in progress (initiated 2026-02-13)

## Session Continuity

Last session: 2026-02-13
Stopped at: 08-01 COMPLETE — VPS provisioned: Docker CE, UFW, deploy user, SSH hardened, /opt/asqn, DNS set
Resume file: None
Next action: Execute 08-03 (production docker-compose + Caddy)
