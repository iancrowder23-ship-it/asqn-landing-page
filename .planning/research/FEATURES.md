# Feature Research

**Domain:** CI/CD deployment pipeline for SvelteKit + Docker on a single VPS
**Project:** ASQN 1st SFOD — v1.1 Deployment Pipeline milestone
**Researched:** 2026-02-12
**Confidence:** MEDIUM (WebSearch verified against GitHub official docs and community patterns from 2024–2025)

---

## Context

This file covers ONLY the deployment pipeline features for v1.1. The personnel management system (profiles, awards, enlistment, events, etc.) is complete and documented in the prior FEATURES.md. The existing Docker setup is a working multi-stage build (node:22-alpine builder + runner) with a minimal docker-compose.yml exposing port 3000. No registry, no CI, no reverse proxy, no HTTPS automation currently exists beyond local Docker.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that any production deployment pipeline for a single-developer Docker app must have. Missing these = deployments are manual, fragile, or unsafe.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Automated build on git push | Core definition of CI; pushing to main should trigger a build automatically | LOW | GitHub Actions workflow triggered on `push` to `main`; free for public repos, 2000 min/month free for private |
| Docker image pushed to GHCR | Build artifact must be stored somewhere versioned so VPS can pull it | LOW | GHCR (ghcr.io) integrates with `GITHUB_TOKEN` natively — no separate credentials or rate limits; use `docker/build-push-action` |
| SSH-based deploy to VPS | The only realistic delivery mechanism for a single-server setup | LOW | `appleboy/ssh-action` is the standard community action; requires SSH private key in GitHub Secrets |
| Tagged image versioning | Deploying `latest` always makes rollback impossible | LOW | Tag images with git SHA (`sha-${{ github.sha }}`) AND `latest`; keep last 5 images for rollback |
| Environment secrets management | DB URLs, Supabase keys, Discord client secret must never be in the repo | LOW | GitHub Actions Secrets for CI; `.env` file on VPS managed manually or via `scp` step |
| Nginx reverse proxy | Port 3000 must not be exposed publicly; HTTPS termination needed | MEDIUM | Nginx in docker-compose alongside app container; listens on 443, proxies to `app:3000` |
| Let's Encrypt / HTTPS | All production web apps require HTTPS; browsers warn on HTTP | MEDIUM | Certbot with `--nginx` plugin, or use `nginx-proxy` + `acme-companion` Docker images for auto-renewal |
| Health check endpoint | Deployment must be verifiable; ensures the new container actually started | LOW | Add `/health` route to SvelteKit that returns `200 OK`; Docker `HEALTHCHECK` instruction in Dockerfile |
| Container restart policy | App must survive VPS reboots and container crashes | LOW | `restart: unless-stopped` in docker-compose.yml — already absent from current compose |
| Basic deployment logging | Developer must know if a deploy succeeded or failed | LOW | GitHub Actions built-in logs cover CI; add Discord webhook notification on success/failure |

### Differentiators (Competitive Advantage)

Features that elevate the pipeline beyond bare minimum. Appropriate for a single-developer project once the table stakes are stable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Zero-downtime deployment | Members using the site during a deploy do not get dropped requests or 502s | MEDIUM | `docker-rollout` plugin or blue-green with Nginx upstream swap; requires health check endpoint first |
| Rollback command | One command or one workflow re-run to revert to previous image | LOW | Re-run previous workflow OR parameterize deploy workflow to accept an image tag; requires tagged images (already table stakes) |
| Build cache (GitHub Actions + Docker layer cache) | Reduces build time from ~5 min to ~1-2 min on typical SvelteKit app | LOW | `cache-from: type=gha` and `cache-to: type=gha,mode=max` in `docker/build-push-action` |
| Discord deployment notifications | Unit leadership and developer notified of deploy status in the Discord server they already use | LOW | Discord Webhook Notify GitHub Action; post to a `#deployments` channel; include commit message + SHA + status |
| Staging environment check step | Run smoke tests against the new container before swapping it into production traffic | MEDIUM | `docker run --rm` with a `curl /health` check in the workflow before updating Nginx upstream; no separate staging server needed |
| Automated certificate renewal | Let's Encrypt certs expire every 90 days; forgetting to renew takes the site down | LOW | `certbot renew` via cron or systemd timer on VPS; `nginx-proxy` + `acme-companion` Docker images handle this automatically if using that stack |
| Deployment workflow documentation | Future self (or second developer) can understand how to deploy without reading code | LOW | `DEPLOY.md` in repo root documenting secrets, VPS setup steps, rollback procedure |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem sensible for CI/CD but are wrong for this scale.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Kubernetes / k8s | "Industry standard container orchestration" | Massive operational overhead for a single container on one VPS; Helm, RBAC, etcd, control plane complexity is weeks of work with zero benefit at this scale | Docker Compose on single VPS is the right tool; scale to k8s if you ever run 10+ containers across multiple nodes |
| Separate staging server | "Test before production" | Second VPS is ~$10-20/month ongoing cost and requires maintaining identical infra; overkill for one developer with a milsim site | Run new container on same host and smoke-test it before swapping Nginx upstream |
| Automated database migrations in pipeline | "Run migrations as part of deploy" | Supabase manages its own migration state via `supabase db push`; running migrations automatically in CI without a review step risks irreversible schema changes | Run migrations manually via Supabase MCP or CLI before deploying; keep schema and app deploys separate |
| Canary deployments | "Gradual traffic rollout" | Requires load balancer with weighted routing; overkill for < 100 concurrent users; adds Nginx config complexity | All-or-nothing swap is fine at this scale; zero-downtime blue-green is sufficient |
| Self-hosted GitHub Actions runner | "Faster builds, use VPS compute" | Requires maintaining a runner process on the VPS, runner security hardening, and runner autoscaling; adds failure mode where VPS being down blocks CI | GitHub-hosted runners are sufficient; 2000 free minutes/month handles many deploys |
| Container vulnerability scanning | "Security compliance" | Tools like Trivy/Snyk are valuable for regulated industries; for a milsim site they add 2-3 minutes per build and produce noise about base image CVEs you can't control | Keep `node:22-alpine` base image updated; that alone addresses 90% of container CVEs |
| Multi-region deployment | "High availability" | Supabase is already a managed service; the stateful layer is covered; multi-region for the app container serves no purpose for a unit of < 100 members with a single geographic focus | Single VPS is appropriate; Supabase handles database HA |

---

## Feature Dependencies

```
[GitHub Actions Workflow]
    └──requires──> [GitHub Secrets: SSH key, VPS host, VPS user]
    └──requires──> [GitHub Secrets: GHCR credentials (auto via GITHUB_TOKEN)]
    └──produces──> [Docker image pushed to GHCR]
                       └──required by──> [SSH Deploy Step: docker pull on VPS]

[SSH Deploy Step]
    └──requires──> [SSH private key on GitHub, public key on VPS]
    └──executes──> [docker compose pull + up -d on VPS]
                       └──requires──> [docker-compose.yml updated to reference GHCR image]

[Health Check Endpoint /health in SvelteKit]
    └──required by──> [Docker HEALTHCHECK instruction]
    └──required by──> [Zero-Downtime Deploy: smoke test before upstream swap]
    └──required by──> [Post-deploy verification step in workflow]

[Nginx Reverse Proxy container]
    └──required by──> [HTTPS / Let's Encrypt]
    └──required by──> [Zero-Downtime: Nginx upstream swap pattern]
    └──requires──> [docker-compose.yml extended with nginx service]
    └──requires──> [nginx.conf with proxy_pass to app:3000]

[Tagged image versioning (SHA tags)]
    └──required by──> [Rollback: re-run previous workflow or deploy specific tag]
    └──enhances──> [Docker layer cache: consistent layer reuse]

[Discord Webhook Notification]
    └──requires──> [Discord webhook URL in GitHub Secrets]
    └──enhances──> [Deployment visibility for developer + leadership]
    └──independent of──> [all other pipeline features — add last]

[Zero-Downtime Deployment]
    └──requires──> [Health Check Endpoint]
    └──requires──> [Nginx Reverse Proxy]
    └──requires──> [Tagged image versioning]
```

### Dependency Notes

- **Health check endpoint is a prerequisite for zero-downtime**: You cannot verify the new container is ready before swapping traffic without it. Build `/health` before attempting rolling deployment.
- **GHCR must be set up before SSH deploy step**: The VPS pulls the image from GHCR; the deploy workflow cannot reference an image that doesn't exist in a registry.
- **Nginx must be containerized (in docker-compose) before Let's Encrypt automation**: Certbot's `--nginx` plugin or `acme-companion` both expect Nginx to be the TLS terminator. If the app is exposed directly on port 443, Let's Encrypt config is different and messier.
- **docker-compose.yml must be updated on the VPS**: CI pushes a new image, but the VPS `docker-compose.yml` must reference the GHCR image (not `build: .`). This is a one-time migration of the existing compose file.
- **Discord notifications are independent**: They can be added at any point without affecting the rest of the pipeline. Add them last.

---

## MVP Definition

### Launch With (v1.1 — Deploy Pipeline Core)

Minimum viable automated pipeline: push to main, image built, VPS updated, site running with HTTPS.

- [ ] GitHub Actions workflow: build Docker image, push to GHCR — the automation foundation
- [ ] SSH deploy step: pull new image, `docker compose up -d` on VPS — closes the loop from push to live
- [ ] Updated docker-compose.yml: reference GHCR image + `restart: unless-stopped` — fixes existing missing restart policy
- [ ] Nginx container in docker-compose: reverse proxy from 443 to app:3000 — required for HTTPS
- [ ] Let's Encrypt certificate + auto-renewal — HTTPS is non-negotiable for production
- [ ] GitHub Secrets configured: SSH key, VPS host/user, GHCR auth — pipeline cannot run without these
- [ ] Tagged image versioning (git SHA): enables rollback without extra tooling

### Add After Validation (v1.1.x)

Once the basic pipeline is stable and a few deploys have been executed successfully:

- [ ] Health check endpoint (`/health` in SvelteKit + Docker HEALTHCHECK) — trigger: needed before zero-downtime deploy; also improves observability
- [ ] Discord deployment notification — trigger: first time a deploy fails silently and nobody noticed
- [ ] Build layer cache in Actions — trigger: builds taking > 3 minutes consistently
- [ ] Deployment documentation (`DEPLOY.md`) — trigger: before the repo gets handed to anyone else

### Future Consideration (v1.2+)

- [ ] Zero-downtime deployment (blue-green or `docker-rollout`) — trigger: users report 502s during deployments; only needed if deploy cadence is frequent
- [ ] Rollback workflow (parameterized deploy accepting image tag) — trigger: first time a bad deploy reaches production
- [ ] Staging smoke-test step — trigger: introducing breaking changes with higher frequency

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| GitHub Actions build + push to GHCR | HIGH | LOW | P1 |
| SSH deploy step (pull + up) | HIGH | LOW | P1 |
| Updated docker-compose.yml (GHCR image + restart policy) | HIGH | LOW | P1 |
| Nginx reverse proxy container | HIGH | MEDIUM | P1 |
| Let's Encrypt HTTPS + auto-renewal | HIGH | MEDIUM | P1 |
| GitHub Secrets setup | HIGH | LOW | P1 |
| Tagged image versioning | HIGH | LOW | P1 |
| Health check endpoint (`/health`) | MEDIUM | LOW | P2 |
| Discord deployment notifications | MEDIUM | LOW | P2 |
| Build layer cache | LOW | LOW | P2 |
| Deployment documentation | MEDIUM | LOW | P2 |
| Zero-downtime deployment | MEDIUM | MEDIUM | P3 |
| Rollback workflow | MEDIUM | LOW | P3 |
| Staging smoke-test step | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have for v1.1 launch — the pipeline does not work without these
- P2: Should have — add in same milestone once P1 is stable
- P3: Nice to have — future milestone

---

## Existing Docker Setup — What Changes for v1.1

The current setup (`Dockerfile` + `docker-compose.yml`) is a solid foundation. These are the specific gaps v1.1 fills:

| Current State | Required Change | Reason |
|---------------|-----------------|--------|
| `build: .` in docker-compose | Change to `image: ghcr.io/[org]/[repo]:latest` | VPS must pull pre-built image from registry |
| No `restart:` policy in compose | Add `restart: unless-stopped` | App must survive VPS reboots |
| No Nginx service in compose | Add nginx service with SSL config | HTTPS termination |
| No `HEALTHCHECK` in Dockerfile | Add `HEALTHCHECK CMD curl -f http://localhost:3000/health` | Container health visibility |
| No `/health` route in SvelteKit | Add `src/routes/health/+server.ts` returning `200 OK` | Health check target |
| No GitHub Actions workflow | Add `.github/workflows/deploy.yml` | The entire CI/CD automation |
| Manual deploy process | Automated on every push to `main` | The goal of the milestone |

---

## Sources

- [GitHub Actions: Publishing Docker Images (Official Docs)](https://docs.github.com/en/actions/use-cases-and-examples/publishing-packages/publishing-docker-images) — HIGH confidence
- [GitHub Container Registry Docs (Official)](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry) — HIGH confidence
- [Zero-Downtime Docker Compose Deploy (jmh.me, 2024)](https://jmh.me/blog/zero-downtime-docker-compose-deploy) — MEDIUM confidence
- [docker-rollout: Zero Downtime for Docker Compose (GitHub)](https://github.com/wowu/docker-rollout) — MEDIUM confidence
- [Actions Status Discord (GitHub Marketplace)](https://github.com/marketplace/actions/actions-status-discord) — MEDIUM confidence
- [Discord Webhook Notify (GitHub Marketplace)](https://github.com/marketplace/actions/discord-webhook-notify) — MEDIUM confidence
- [appleboy/ssh-action (GitHub)](https://github.com/appleboy/ssh-action) — MEDIUM confidence
- [docker/build-push-action (GitHub)](https://github.com/docker/build-push-action) — HIGH confidence (official Docker action)
- [GHCR vs Docker Hub comparison (DevOps.dev, 2024)](https://blog.devops.dev/docker-hub-or-ghcr-or-ecr-lazy-mans-guide-4da1d943d26e) — MEDIUM confidence
- [Building Production-Ready CI/CD Pipeline (Medium, Jan 2026)](https://medium.com/@vokeogigbah/building-a-production-ready-ci-cd-pipeline-from-zero-to-docker-and-github-actions-707d9aa38db5) — MEDIUM confidence
- [GitHub Actions CI/CD Complete Guide (DevToolbox, 2026)](https://devtoolbox.dedyn.io/blog/github-actions-cicd-complete-guide) — MEDIUM confidence

---
*Feature research for: CI/CD deployment pipeline — SvelteKit + Docker + single VPS (ASQN 1st SFOD v1.1)*
*Researched: 2026-02-12*
