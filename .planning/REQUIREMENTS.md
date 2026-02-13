# Requirements: ASQN 1st SFOD

**Defined:** 2026-02-12
**Core Value:** A soldier's complete service record — from enlistment to current status — is accurate, accessible, and drives unit management decisions.

## v1.1 Requirements

Requirements for production deployment milestone. Each maps to roadmap phases.

### Infrastructure

- [ ] **INFRA-01**: Developer can create GitHub repository and push existing codebase
- [ ] **INFRA-02**: VPS has Docker CE + Compose v2 plugin installed from official Docker repo
- [ ] **INFRA-03**: VPS has a dedicated deploy user with SSH key-only access
- [ ] **INFRA-04**: VPS firewall allows only ports 22, 80, and 443
- [ ] **INFRA-05**: DNS A record for asqnmilsim.us points to VPS IP address

### Production Compose

- [ ] **COMPOSE-01**: Production docker-compose.yml runs app + Caddy on shared Docker network
- [ ] **COMPOSE-02**: Caddy reverse proxy serves asqnmilsim.us with auto-provisioned Let's Encrypt HTTPS
- [ ] **COMPOSE-03**: App container is not directly accessible from the internet (internal network only)
- [ ] **COMPOSE-04**: Both services have `restart: unless-stopped` policy
- [ ] **COMPOSE-05**: ORIGIN is set to `https://asqnmilsim.us` in production
- [ ] **COMPOSE-06**: Caddy TLS certificate data persists across container restarts (named volume)
- [ ] **COMPOSE-07**: App health check endpoint at `/health` returns 200 OK

### CI/CD Pipeline

- [ ] **CICD-01**: GitHub Actions workflow triggers on push to main branch
- [ ] **CICD-02**: Workflow builds Docker image and pushes to GHCR with SHA + latest tags
- [ ] **CICD-03**: `PUBLIC_*` Supabase vars are passed as build-args (not baked from .env)
- [ ] **CICD-04**: Workflow deploys to VPS via SSH (pull image + restart app container)
- [ ] **CICD-05**: Docker build uses layer caching for faster repeat builds
- [ ] **CICD-06**: Discord webhook notification on deploy success or failure

### Secrets Management

- [ ] **SEC-01**: GitHub Secrets configured for SSH key, host, user
- [ ] **SEC-02**: Production `.env` file on VPS contains Supabase keys (never in git or Docker image)
- [ ] **SEC-03**: No secrets appear in Docker image layers

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Deployment Enhancements

- **DEPLOY-01**: Zero-downtime deployment (blue-green or docker-rollout)
- **DEPLOY-02**: Rollback workflow (parameterized deploy accepting specific image tag)
- **DEPLOY-03**: Staging smoke-test step before production swap

## Out of Scope

| Feature | Reason |
|---------|--------|
| Kubernetes | Massive overhead for single-VPS, single-app deployment |
| Terraform / IaC | Overkill for one Interserver VPS with manual SSH access |
| Self-hosted GitHub Actions runner | Adds failure mode; free tier is sufficient |
| Separate staging server | Second VPS cost; smoke-test on same host is sufficient |
| Automated database migrations in CI | Supabase manages migration state; keep schema and app deploys separate |
| Container vulnerability scanning | Noise for milsim site; keep base image updated instead |
| Multi-region deployment | Single VPS is appropriate for <100 members |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | Phase 8 | Pending |
| INFRA-02 | Phase 8 | Pending |
| INFRA-03 | Phase 8 | Pending |
| INFRA-04 | Phase 8 | Pending |
| INFRA-05 | Phase 8 | Pending |
| COMPOSE-01 | Phase 8 | Pending |
| COMPOSE-02 | Phase 8 | Pending |
| COMPOSE-03 | Phase 8 | Pending |
| COMPOSE-04 | Phase 8 | Pending |
| COMPOSE-05 | Phase 8 | Pending |
| COMPOSE-06 | Phase 8 | Pending |
| COMPOSE-07 | Phase 8 | Pending |
| SEC-02 | Phase 8 | Pending |
| CICD-01 | Phase 9 | Pending |
| CICD-02 | Phase 9 | Pending |
| CICD-03 | Phase 9 | Pending |
| CICD-04 | Phase 9 | Pending |
| CICD-05 | Phase 9 | Pending |
| SEC-01 | Phase 9 | Pending |
| SEC-03 | Phase 9 | Pending |
| CICD-06 | Phase 10 | Pending |

**Coverage:**
- v1.1 requirements: 21 total
- Mapped to phases: 21
- Unmapped: 0

---
*Requirements defined: 2026-02-12*
*Last updated: 2026-02-12 — traceability complete (21/21 mapped to Phases 8-10)*
