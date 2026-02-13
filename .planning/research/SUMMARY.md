# Project Research Summary

**Project:** ASQN 1st SFOD — v1.1 CI/CD Deployment Pipeline
**Domain:** Automated build and deploy pipeline for SvelteKit/Docker app to single Ubuntu VPS
**Researched:** 2026-02-12
**Confidence:** HIGH

## Executive Summary

This milestone adds automated CI/CD to an existing, production-validated v1.0 SvelteKit application. The pattern is well-documented and low-risk: GitHub Actions builds a Docker image, pushes it to GHCR, and deploys to a single Interserver VPS via SSH. The recommended stack is GitHub Actions + GHCR + Caddy v2 + Docker Compose v2. Caddy replaces the need for nginx + certbot by handling TLS certificate provisioning and renewal automatically with a 3-line Caddyfile. All action versions have been verified against official GitHub release pages as of 2026-02-12.

The recommended approach separates concerns into two phases: (1) VPS provisioning and production compose setup — Caddy, networking, secrets layout, restart policies — which must be correct before any pipeline runs; (2) the GitHub Actions workflow itself — build, push to GHCR, SCP compose files, SSH deploy. The existing `Dockerfile` is unchanged. The existing `docker-compose.yml` is modified to pull a pre-built image from GHCR, add Caddy as a sidecar, change the app's `ports:` to `expose:`, and add restart policies. The pipeline is split into two sequential jobs (build → deploy) so deploy failures do not re-trigger builds.

The top risks are well-understood and preventable: the existing `ORIGIN=http://localhost:3000` in the current compose file will cause 403 errors on every SvelteKit form action in production and must be corrected to `https://asqnmilsim.us` before first deploy. Docker bypasses UFW firewall rules — port 3000 must be withheld from the host network entirely, accessible only to Caddy via the internal Docker network. SvelteKit's `$env/static/public` variables must be passed as Docker build args or they resolve to empty strings at build time and produce a broken Supabase client with no error during the build. All three are Phase 1/2 concerns that the build order addresses sequentially.

---

## Key Findings

### Recommended Stack

The existing stack (SvelteKit 2 + Svelte 5, adapter-node, Docker multi-stage build) requires no changes. CI/CD adds four components: GitHub Actions as the pipeline runner (native to the repo, free tier sufficient for a milsim unit), GHCR as the image registry (authenticates with the built-in `GITHUB_TOKEN` for the build step — no separate credentials), Caddy v2 as the reverse proxy (auto-provisions and renews Let's Encrypt certificates, eliminates certbot and renewal crons), and Docker Compose v2 plugin for production container orchestration (already used locally; only the compose file changes).

All GitHub Actions action versions pinned to verified stable releases as of 2026-02-12: `actions/checkout@v6` (v6.0.2), `docker/login-action@v3` (v3.7.0), `docker/setup-buildx-action@v3` (v3.12.0), `docker/metadata-action@v5` (v5.10.0), `docker/build-push-action@v6` (v6.19.2), `appleboy/ssh-action@v1` (v1.2.5). BuildKit registry cache (`type=registry`) cuts repeat builds from ~3 minutes to ~30 seconds.

**Core technologies:**
- **GitHub Actions (ubuntu-latest):** Pipeline automation — native to the repo; no external CI service; generous free tier
- **GHCR (ghcr.io):** Image registry — authenticated via `GITHUB_TOKEN`; co-located with codebase; no rate limits
- **Caddy v2.10.2-alpine:** Reverse proxy + auto-HTTPS — 3-line Caddyfile replaces nginx+certbot complexity
- **Docker Compose v2 plugin:** Production orchestration — already used locally; only the compose file changes
- **appleboy/ssh-action@v1:** SSH deploy — industry-standard action for single-VPS deployment

### Expected Features

The research distinguishes features needed for v1.1 launch (P1), post-validation additions (P2), and future considerations (P3). The pipeline is non-functional without all P1 items.

**Must have — v1.1 launch (P1):**
- GitHub Actions workflow (build + push to GHCR on push to `main`)
- SSH deploy step (`docker compose pull` + `up -d --no-deps app`)
- Updated `docker-compose.yml` (GHCR image reference, `restart: unless-stopped`, Caddy service)
- Caddy container in compose (reverse proxy, HTTP/3 ports 80/443/443-udp)
- Let's Encrypt HTTPS via Caddy (automatic; no certbot)
- GitHub Secrets configured (SSH_HOST, SSH_USER, SSH_PRIVATE_KEY; GHCR_TOKEN if private repo)
- Tagged image versioning (git SHA + `latest` tags via `docker/metadata-action`)

**Should have — add after first stable deploy (P2):**
- Health check endpoint (`/health` route in SvelteKit + Docker `HEALTHCHECK`)
- Discord deployment notifications (webhook to #deployments channel)
- BuildKit layer cache in GitHub Actions (cuts repeat build times significantly)
- `DEPLOY.md` documentation (runbook for secrets, VPS setup, rollback procedure)

**Defer — v1.2+ (P3):**
- Zero-downtime deployment (`docker-rollout` or blue-green) — only if 502s reported during deploys
- Parameterized rollback workflow — only after a bad deploy reaches production
- Staging smoke-test step — only if breaking-change frequency increases

**Anti-features confirmed — do not add:**
- Kubernetes, Docker Swarm, Terraform — massively disproportionate to a single-VPS milsim site
- Automated database migrations in CI pipeline — Supabase migrations run separately via MCP/CLI
- Watchtower — removes deployment control and auditability
- Self-hosted GitHub Actions runner — adds VPS failure mode to CI

### Architecture Approach

The production architecture is a two-service Docker Compose stack on a single VPS: a Caddy container that owns ports 80/443 and proxies to the app container via Docker's internal DNS (`app:3000`), and the app container that exposes port 3000 only on the internal Docker bridge network. All config files (`docker-compose.yml`, `Caddyfile`) live in the repo and are SCP'd to `/opt/asqn/` on every deploy. The `.env` file lives only on the VPS and is never written by CI. The GitHub Actions pipeline uses two sequential jobs: `build` (checkout → GHCR login → metadata → build + push) and `deploy` (SCP compose files → SSH pull → SSH up `--no-deps app` → image prune). Only the app container restarts on deploy; Caddy stays up continuously, preserving TLS state and avoiding cert re-provisioning.

**Major components:**
1. **GitHub Actions workflow** — triggers on push to `main`; two-job pipeline (build → deploy); actions pinned to verified stable versions
2. **GHCR image store** — stores `latest` + `sha-{commit}` tags; BuildKit registry cache enables fast incremental builds; SHA tags enable rollback
3. **Caddy container** — public HTTPS entry point; TLS cert in `caddy_data` named volume; proxies to `app:3000` via Docker DNS; HTTP→HTTPS redirect is automatic
4. **app container** — SvelteKit Node server; no published ports; secrets from `env_file: .env` at runtime; `ORIGIN` set in compose `environment:` block
5. **VPS `/opt/asqn/`** — deployment working directory; `docker-compose.yml` and `Caddyfile` synced from repo on each deploy; `.env` written once manually, never overwritten by CI

### Critical Pitfalls

All 10 pitfalls in PITFALLS.md are production-relevant. The top 5 to prevent during implementation:

1. **ORIGIN=localhost causes 403 on all form actions** — The current `docker-compose.yml` has `ORIGIN=http://localhost:3000`. Every SvelteKit form action returns 403 in production. Set `ORIGIN=https://asqnmilsim.us` in the production compose `environment:` block before first deploy. Test by submitting any form action post-deploy.

2. **Docker bypasses UFW — port 3000 reachable publicly** — Docker inserts NAT rules into iptables at a level UFW cannot intercept. Use `expose:` (not `ports:`) on the app service; put both services on a named Docker bridge network; only Caddy publishes 80/443. Verify with `curl http://VPS_IP:3000` from external — must return connection refused.

3. **Caddy `caddy_data` volume not persisted — Let's Encrypt rate limit (5 certs/domain/week)** — Declare named volumes for `/data` and `/config` in compose. Use staging ACME endpoint (`acme_ca https://acme-staging-v02.api.letsencrypt.org/directory`) during setup and testing; remove only at production go-live.

4. **`PUBLIC_SUPABASE_URL` missing at build time — empty Supabase client, no build error** — SvelteKit `$env/static/public` vars are inlined at build time by Vite. Pass `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_PUBLISHABLE_KEY` as Docker build args in the `docker/build-push-action` step. Store as GitHub Actions Variables (not Secrets — they are already public-facing values visible in the browser).

5. **Secrets baked into Docker image via `ARG`** — Never pass `SUPABASE_SERVICE_ROLE_KEY` as a Dockerfile `ARG`; it persists in image layer history. Runtime secrets go in `.env` on the VPS, consumed via `env_file:` in compose. Verify with `docker history --no-trunc <image>` after the first build.

---

## Implications for Roadmap

Research establishes a hard dependency order. DNS propagation is the longest-lead item (can take hours) and must be initiated before Caddy first starts. VPS infrastructure must exist before the pipeline can deploy into it. The production compose file must be correct before the first workflow run — retrofitting networking errors (port exposure, ORIGIN) requires a full redeploy. The GitHub Actions workflow is the last piece, not the first.

### Phase 1: VPS Provisioning and Production Compose

**Rationale:** DNS propagation is the longest-lead item with no workaround — start first so DNS is resolving by the time Caddy provisions its initial TLS certificate. The ORIGIN misconfiguration and Docker UFW bypass are the two most common first-deploy failures; both must be addressed in the compose file before any workflow runs. Caddy volume persistence and restart policies must be in the compose file before the first container start.

**Delivers:** Running VPS with Docker CE + Compose v2 plugin installed from the official Docker apt repo; `/opt/asqn/` directory created; `.env` written with production Supabase keys and `ORIGIN=https://asqnmilsim.us`; DNS A-record pointing to VPS IP; modified `docker-compose.yml` committed to repo (Caddy service, internal network, `expose:` on app, `restart: unless-stopped`, named volumes); `Caddyfile` committed with staging ACME endpoint; dedicated `deploy` user with restricted `authorized_keys`.

**Addresses (FEATURES.md P1):** Updated docker-compose.yml, Caddy container, Let's Encrypt HTTPS, restart policy, GitHub Secrets (SSH key half).

**Avoids (PITFALLS.md):** ORIGIN=localhost 403, Docker UFW bypass, Caddy volume not persisted, no restart policy, SSH deploy key unrestricted.

### Phase 2: GitHub Actions Workflow and Build Strategy

**Rationale:** The workflow references VPS secrets and GHCR — Phase 1 must be complete before the workflow can run. Dockerfile layer order and the `PUBLIC_*` build-arg strategy must be settled before the first GHCR push; fixing it after means re-pushing corrected images. BuildKit cache configuration must be set from the first run to avoid establishing a slow baseline.

**Delivers:** `.github/workflows/deploy.yml` (two-job pipeline with explicit `packages: write` permission); GitHub Secrets configured (SSH_HOST, SSH_USER, SSH_PRIVATE_KEY, GHCR_TOKEN if private); GitHub Actions Variables for `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_PUBLISHABLE_KEY`; Dockerfile `ARG` + `ENV` for public build-time vars; BuildKit registry cache (`cache-from`/`cache-to: type=registry`).

**Addresses (FEATURES.md P1):** GitHub Actions build + push to GHCR, SSH deploy step, tagged image versioning, GitHub Secrets setup.

**Addresses (FEATURES.md P2 — add here):** Build layer cache.

**Avoids (PITFALLS.md):** GHCR `packages: write` missing, `PUBLIC_*` vars empty at build time, secrets baked into image, build cache busting from incorrect layer order, using fine-grained PAT instead of `GITHUB_TOKEN`.

### Phase 3: Validation, Observability, and Documentation

**Rationale:** Can only execute after Phase 2 produces a working end-to-end deploy. Health check and Discord notifications are independent of each other and of the core pipeline — add after the first successful automated deploy is confirmed. The "looks done but isn't" checklist from PITFALLS.md verifies all 10 gotchas are resolved before considering v1.1 complete.

**Delivers:** `/health` route in SvelteKit returning 200 + Docker `HEALTHCHECK` instruction; Discord webhook notification on deploy success/failure; `DEPLOY.md` runbook (secrets setup, VPS setup steps, rollback procedure using SHA tags); full PITFALLS.md verification checklist completed (ORIGIN confirmed, port 3000 blocked, HTTPS valid cert, caddy_data volume present, restart policy tested via reboot, no secrets in image, GHCR pull works on VPS, CI cache active, deploy user is not root, health check shows healthy).

**Addresses (FEATURES.md P2):** Health check endpoint, Discord deployment notifications, deployment documentation.

**Avoids (PITFALLS.md):** Deploy downtime without health check (health check is prerequisite for zero-downtime if needed later); silent deploy failures (Discord notifications).

### Phase Ordering Rationale

- DNS propagation is a blocking external dependency — initiate it first; everything else in Phase 1 can proceed in parallel while waiting for propagation.
- The ORIGIN misconfiguration is the #1 first-deploy failure for SvelteKit behind a reverse proxy; it must be in the compose file before any workflow runs — not patched after.
- Use staging ACME throughout Phases 1 and 2 validation to protect against the 5 certificates/domain/week Let's Encrypt rate limit; only switch to production ACME at Phase 3 final verification.
- Deploy only the app container on each workflow run (`--no-deps app`) — Caddy must stay running continuously to preserve TLS state; restarting the full compose stack risks cert re-provisioning and brief outage.
- SHA image tags are set up in Phase 2 alongside `latest`; this enables manual rollback immediately without additional tooling (SSH in, update IMAGE_TAG in compose, `docker compose up -d --no-deps app`).

### Research Flags

Phases with standard, well-documented patterns (skip `/gsd:research-phase`):
- **Phase 1:** Docker CE install from official Docker apt repo, UFW/Docker networking, Caddy named volumes, ed25519 SSH key setup — all established patterns with official documentation.
- **Phase 2:** GitHub Actions two-job pipeline with GHCR push is the canonical example in GitHub's own documentation; `appleboy/ssh-action` is the industry standard for single-VPS SSH deploy.
- **Phase 3:** SvelteKit `+server.ts` health endpoint is a 5-line file; Discord webhook GitHub Action is marketplace-standard.

No phase requires deeper research before planning. All pitfalls and patterns are well-documented with high-confidence sources. The entire CI/CD pattern for this exact stack (SvelteKit + Docker + GHCR + Caddy + single VPS) is a commonly documented deployment architecture.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All action versions verified against official GitHub release pages on 2026-02-12. Caddy v2.10.2 confirmed latest stable. Docker CE install steps from official Docker apt repo docs. No inferred versions. |
| Features | MEDIUM | Core pipeline features (Actions, GHCR, SSH deploy, HTTPS) verified against official GitHub and Docker docs. P2/P3 features (zero-downtime, Discord notifications) sourced from community — MEDIUM confidence but these are not required for v1.1 launch. |
| Architecture | HIGH | Two-job pipeline pattern, Caddy + app on shared Docker network, env var separation strategy all verified against official docs. Anti-patterns confirmed by official Docker, SvelteKit, and Caddy documentation. |
| Pitfalls | HIGH | ORIGIN/CSRF pitfall backed by official SvelteKit docs + issue tracker. Docker UFW bypass backed by official Docker network docs + widely-cited ufw-docker project. Caddy volume persistence backed by official Caddy HTTPS docs. GHCR permissions pitfall backed by official GitHub packages docs. `PUBLIC_*` build-time pitfall backed by official SvelteKit adapter-node docs. |

**Overall confidence:** HIGH

### Gaps to Address

- **VPS IP address:** The `SSH_HOST` GitHub Secret and DNS A-record both require the VPS IP. Confirm the Interserver VPS IP before Phase 1 begins. If the IP changes later, update `SSH_HOST` in GitHub Secrets; Caddy cert is tied to the domain, not the IP.

- **GHCR package visibility (public vs private):** If the GitHub repo is private, the VPS needs a PAT with `read:packages` stored as `GHCR_TOKEN` to pull images. If the repo is public, the GHCR package is public by default and the `docker login` step on the VPS can be omitted. Determine repo visibility before writing the SSH deploy script.

- **Staging ACME endpoint removal:** PITFALLS.md recommends using `acme_ca https://acme-staging-v02.api.letsencrypt.org/directory` in the Caddyfile throughout Phase 1 and 2 to avoid consuming production Let's Encrypt rate limits during troubleshooting. The Caddyfile committed in Phase 1 should include this line; it is explicitly removed in Phase 3 as the final production go-live step.

- **Deploy user vs admin user:** PITFALLS.md recommends a dedicated `deploy` user with `command=` restriction in `authorized_keys`. Determine whether to create a new user or restrict an existing user during Phase 1 VPS provisioning.

---

## Sources

### Primary (HIGH confidence)
- [GitHub Docs: Publishing Docker Images](https://docs.github.com/actions/guides/publishing-docker-images) — GHCR workflow YAML, GITHUB_TOKEN permissions
- [GitHub Docs: Working with the Container Registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry) — GHCR naming, PAT vs GITHUB_TOKEN, packages: write permission
- [docker/build-push-action releases](https://github.com/docker/build-push-action/releases) — v6.19.2 confirmed latest stable 2026-02-12
- [docker/login-action releases](https://github.com/docker/login-action/releases) — v3.7.0 confirmed latest stable
- [docker/metadata-action releases](https://github.com/docker/metadata-action/releases) — v5.10.0 confirmed latest stable
- [docker/setup-buildx-action releases](https://github.com/docker/setup-buildx-action/releases) — v3.12.0 confirmed latest stable
- [actions/checkout releases](https://github.com/actions/checkout/releases) — v6.0.2 confirmed latest stable
- [appleboy/ssh-action releases](https://github.com/appleboy/ssh-action/releases) — v1.2.5 confirmed latest stable
- [Caddy releases](https://github.com/caddyserver/caddy/releases) — v2.10.2 confirmed latest stable non-beta
- [Docker Install Ubuntu (official)](https://docs.docker.com/engine/install/ubuntu/) — official apt repo install steps, Compose v2 plugin
- [Caddy automatic HTTPS documentation](https://caddyserver.com/docs/automatic-https) — volume persistence, ACME staging endpoint
- [Caddy reverse_proxy directive](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy) — reverse proxy to Docker service by name
- [SvelteKit adapter-node docs](https://svelte.dev/docs/kit/adapter-node) — ORIGIN, PROTOCOL_HEADER, HOST_HEADER behavior
- [SvelteKit CSRF issue tracker](https://github.com/sveltejs/kit/issues/6589) — 403 Cross-site POST form submissions forbidden
- [Docker network packet filtering and firewalls](https://docs.docker.com/engine/network/packet-filtering-firewalls/) — UFW bypass behavior (official)
- [Docker build secrets official docs](https://docs.docker.com/build/building/secrets/) — ARG layer leakage, BuildKit secret mounts
- [Docker restart policies](https://docs.docker.com/engine/containers/start-containers-automatically/) — unless-stopped vs always behavior
- [GitHub Actions Docker cache (official)](https://docs.docker.com/build/ci/github-actions/cache/) — type=gha and type=registry cache configuration
- [docker/metadata-action GitHub repo](https://github.com/docker/metadata-action) — SHA + latest tag generation

### Secondary (MEDIUM confidence)
- [servicestack.net: SSH Docker Compose deployment](https://docs.servicestack.net/ssh-docker-compose-deploment) — SSH deploy pattern, verified against official action docs
- [oneuptime.com: Docker with Caddy Automatic HTTPS 2026](https://oneuptime.com/blog/post/2026-01-16-docker-caddy-automatic-https/view) — Caddy Docker Compose volume patterns
- [Zero-downtime Docker Compose deploy (jmh.me, 2024)](https://jmh.me/blog/zero-downtime-docker-compose-deploy) — blue-green pattern for future reference
- [docker-rollout: Zero Downtime for Docker Compose](https://github.com/wowu/docker-rollout) — P3 zero-downtime option
- [ufw-docker project](https://github.com/chaifeng/ufw-docker) — Docker UFW bypass analysis, widely cited
- [Build attestations leaking ARG secrets (ricekot.com)](https://ricekot.com/2023/docker-provenance-attestations/) — ARG secrets in build attestation metadata
- [GHCR fine-grained PAT incompatibility](https://github.com/orgs/community/discussions/38467) — use GITHUB_TOKEN, not fine-grained PAT for GHCR
- [SvelteKit environment variables — static/public build-time behavior](https://maier.tech/posts/environment-variables-in-sveltekit) — PUBLIC_ vars inlined at build time by Vite
- [Building Production-Ready CI/CD Pipeline (Medium, Jan 2026)](https://medium.com/@vokeogigbah/building-a-production-ready-ci-cd-pipeline-from-zero-to-docker-and-github-actions-707d9aa38db5) — community validation
- [VPS SSH deployment via GitHub Actions (andrewhoog.com)](https://www.andrewhoog.com/posts/how-to-deploy-a-docker-hosted-website-using-github-actions/) — community resource, consistent with official docs

---
*Research completed: 2026-02-12*
*Ready for roadmap: yes*
