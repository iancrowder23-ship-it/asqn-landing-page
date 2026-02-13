# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-12)

**Core value:** A soldier's complete service record — from enlistment to current status — is accurate, accessible, and drives unit management decisions.
**Current focus:** v1.1 COMPLETE — all phases including Phase 10 observability and validation

## Current Position

Phase: 10 of 10 (Observability and Validation) — COMPLETE
Plan: 1 of 1 in phase 10 — 10-01 COMPLETE
Status: Discord deploy notifications live, production TLS cert, 7-point validation checklist all pass — v1.1 COMPLETE
Last activity: 2026-02-12 — 10-01 complete: Discord notify job, production ACME, force-recreate Caddy, all validation checks pass

Progress: [██████████] 100% (All 10 phases complete — v1.1 milestone achieved)

## Performance Metrics

**v1.0 MVP:**
- Phases: 7
- Plans completed: 21
- Commits: 81 (35 feat)
- Lines of code: 7,247
- Timeline: 2 days (2026-02-10 → 2026-02-11)

**v1.1 (COMPLETE 2026-02-12):**
- Plans completed: 8 (08-01, 08-02, 08-03 — all Phase 8; 09-01 — GitHub Secrets; 09-02 — CI/CD workflow; 09-03 — pipeline validation; 09.1-01 — Discord Auth Gate; 10-01 — Observability and Validation)

## Accumulated Context

### Decisions

All v1.0 decisions logged in PROJECT.md Key Decisions table with outcomes.

v1.1 decisions resolved in 10-01:
- sarisia/actions-status-discord@v1 for Discord notifications — JS action, fast, ecosystem standard
- notify job status = needs.deploy.result (not its own status) — reflects actual deploy outcome
- --force-recreate replaces --no-deps app — Caddy always restarts and picks up new Caddyfile
- $env/dynamic/private required for SUPABASE_SERVICE_ROLE_KEY — static/private inlines at build time (key intentionally absent at build)
- Production ACME enabled by removing global options block from Caddyfile (Caddy defaults to production LE)
- v1.1 milestone COMPLETE — all validation checks pass, site live at https://asqnmilsim.us with production TLS

v1.1 decisions resolved in 09.1-01:
- Used Discord `/guilds/{id}/member` endpoint (single guild check, not list all guilds)
- Guild ID `1464714214819102964` as const at top of callback file
- `!memberRes.ok` catches all non-2xx (no special-casing 404 vs 403)
- deleteUser wrapped in try/catch — still redirects even if delete fails (RLS protects data)
- Admin client uses `SUPABASE_SERVICE_ROLE_KEY` (already in production .env)

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

v1.1 decisions resolved in 09-03:
- CI key must be passphrase-free: asqn_deploy_ci (ed25519, no passphrase) used for GitHub Actions; asqn_deploy (passphrase-protected) retained for human/interactive use
- SSH_PRIVATE_KEY secret updated to asqn_deploy_ci; public key added to VPS deploy user authorized_keys

v1.1 decisions resolved in 09-01:
- GHCR_USERNAME = iancrowder23-ship-it (GitHub org/account that owns the GHCR packages)
- GHCR_PAT is a classic PAT with read:packages only — fine-grained tokens don't support packages scope
- SSH credentials: asqn_deploy key was passphrase-protected (fixed in 09-03 with asqn_deploy_ci)

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

Last session: 2026-02-12
Stopped at: Phase 10 Plan 1 COMPLETE — v1.1 milestone achieved (commits b852579, 2d08de5)
Resume file: None
Next action: v1.1 COMPLETE — site live at https://asqnmilsim.us. Pending todo: add login button to public home page.
