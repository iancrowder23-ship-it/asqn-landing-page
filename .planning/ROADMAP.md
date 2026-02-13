# Roadmap: ASQN 1st SFOD — Unit Website & Personnel System

## Milestones

- ✅ **v1.0 MVP** — Phases 1-7 (shipped 2026-02-12)
- 🚧 **v1.1 Production Deployment** — Phases 8-10 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-7) — SHIPPED 2026-02-12</summary>

- [x] Phase 1: Foundation (4/4 plans) — completed 2026-02-11
- [x] Phase 2: Public Site (4/4 plans) — completed 2026-02-11
- [x] Phase 3: Soldier Profiles and Service Records (2/2 plans) — completed 2026-02-11
- [x] Phase 4: Awards, Qualifications, and Roster (3/3 plans) — completed 2026-02-11
- [x] Phase 5: Enlistment Pipeline and Personnel Actions (3/3 plans) — completed 2026-02-11
- [x] Phase 6: Events, Attendance, and Admin Dashboard (4/4 plans) — completed 2026-02-11
- [x] Phase 7: Gap Closure (1/1 plan) — completed 2026-02-11

Full details: `.planning/milestones/v1.0-ROADMAP.md`

</details>

### 🚧 v1.1 Production Deployment (In Progress)

**Milestone Goal:** Push to main automatically builds, packages, and deploys the application to a production VPS with HTTPS. The pipeline is observable via Discord notifications and documented for future operators.

- [x] **Phase 8: VPS Provisioning and Production Compose** — Production server ready to receive deployments (completed 2026-02-12)
- [x] **Phase 9: CI/CD Pipeline** — Push to main triggers automated build, push to GHCR, and SSH deploy (completed 2026-02-13)
- [x] **Phase 9.1: Discord Auth Gate** — Restrict login to members of the ASQN Discord server (completed 2026-02-12)
- [ ] **Phase 10: Observability and Validation** — Deploy pipeline is verified end-to-end, observable, and documented

## Phase Details

### Phase 8: VPS Provisioning and Production Compose

**Goal**: The production server is ready to receive automated deployments — Docker installed, firewall hardened, deploy user configured, DNS resolving, and a production-grade Compose stack running Caddy with auto-HTTPS and the app accessible only via the internal Docker network.

**Depends on**: Phase 7 (v1.0 complete)

**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05, COMPOSE-01, COMPOSE-02, COMPOSE-03, COMPOSE-04, COMPOSE-05, COMPOSE-06, COMPOSE-07, SEC-02

**Success Criteria** (what must be TRUE):
1. Visiting `https://asqnmilsim.us` in a browser returns the application over valid HTTPS (no certificate warning)
2. `curl http://VPS_IP:3000` from an external host returns connection refused (app not directly reachable)
3. VPS reboots and both containers automatically restart without manual intervention
4. `curl https://asqnmilsim.us/health` returns HTTP 200 OK
5. The production `.env` on the VPS contains Supabase keys and is absent from the git repository and Docker image

**Plans:** 3 plans

Plans:
- [x] 08-01-PLAN.md — VPS setup: DNS A record, Docker CE, UFW firewall, deploy user, SSH hardening, /opt/asqn directory
- [x] 08-02-PLAN.md — GitHub repo: create private repo, push full codebase with history
- [x] 08-03-PLAN.md — Production Compose: /health endpoint, Caddy + app on internal network, staging ACME TLS, VPS deployment

### Phase 9: CI/CD Pipeline

**Goal**: Pushing a commit to main triggers a two-job GitHub Actions workflow that builds the Docker image with PUBLIC_* build args, pushes it to GHCR with SHA and latest tags, and deploys to the VPS via SSH — with no secrets baked into the image.

**Depends on**: Phase 8 (VPS and Compose must exist before pipeline deploys into it)

**Requirements**: CICD-01, CICD-02, CICD-03, CICD-04, CICD-05, SEC-01, SEC-03

**Success Criteria** (what must be TRUE):
1. Pushing a commit to main triggers the GitHub Actions workflow within seconds
2. A new Docker image tagged with the git SHA and `latest` appears in GHCR after the build job completes
3. The running container on the VPS serves the code from the triggering commit within minutes of push
4. `docker history --no-trunc <image>` shows no Supabase service role key or other runtime secrets in image layers
5. A second push to main completes the build job faster than the first (layer cache active)

**Plans:** 3 plans

Plans:
- [x] 09-01-PLAN.md — GitHub Secrets: SSH credentials, GHCR PAT, PUBLIC_* build args configured on repository
- [x] 09-02-PLAN.md — Production compose (image: GHCR) + complete deploy.yml workflow (build + deploy jobs)
- [x] 09-03-PLAN.md — End-to-end pipeline trigger: push to main, verify GHCR image, verify VPS deployment

### Phase 09.1: Discord Auth Gate (INSERTED)

**Goal:** Only members of the ASQN Discord server (guild 1464714214819102964) can log in -- non-members are rejected at OAuth callback, their Supabase account is deleted, and they see a clear error page.
**Depends on:** Phase 9
**Plans:** 1 plan

Plans:
- [x] 09.1-01-PLAN.md — Add guilds.members.read scope, guild membership check in callback, admin client for user deletion, rejection page

### Phase 10: Observability and Validation

**Goal**: The deployment pipeline is observable — failures surface in Discord immediately — and every known production pitfall has been explicitly verified as resolved before v1.1 is declared complete.

**Depends on**: Phase 9 (requires a working end-to-end pipeline to validate)

**Requirements**: CICD-06

**Success Criteria** (what must be TRUE):
1. A deploy success or failure posts a notification to the unit's Discord channel automatically
2. All production pitfalls confirmed resolved: ORIGIN is `https://asqnmilsim.us`, port 3000 is not reachable externally, HTTPS certificate is valid (non-staging), `caddy_data` volume persists across restarts, no secrets appear in image history, deploy user is not root

**Plans:** 1 plan

Plans:
- [ ] 10-01-PLAN.md — Discord webhook notification on deploy success/failure, production ACME switch, end-to-end validation checklist

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0 | 4/4 | Complete | 2026-02-11 |
| 2. Public Site | v1.0 | 4/4 | Complete | 2026-02-11 |
| 3. Soldier Profiles | v1.0 | 2/2 | Complete | 2026-02-11 |
| 4. Awards, Quals, Roster | v1.0 | 3/3 | Complete | 2026-02-11 |
| 5. Enlistment, Personnel | v1.0 | 3/3 | Complete | 2026-02-11 |
| 6. Events, Attendance, Dashboard | v1.0 | 4/4 | Complete | 2026-02-11 |
| 7. Gap Closure | v1.0 | 1/1 | Complete | 2026-02-11 |
| 8. VPS Provisioning and Production Compose | v1.1 | 3/3 | Complete | 2026-02-12 |
| 9. CI/CD Pipeline | v1.1 | 3/3 | Complete | 2026-02-13 |
| 9.1 Discord Auth Gate | v1.1 | 1/1 | Complete | 2026-02-12 |
| 10. Observability and Validation | v1.1 | 0/1 | Not started | - |

---
*Roadmap created: 2026-02-10*
*Last updated: 2026-02-12 — Phase 10 planned*
