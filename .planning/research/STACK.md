# Stack Research

**Domain:** CI/CD Deployment Pipeline — automated build and deploy for SvelteKit/Docker app to single Ubuntu VPS
**Project:** ASQN 1st SFOD — adding CI/CD to existing v1.0 site
**Researched:** 2026-02-12
**Confidence:** HIGH (all versions verified against official release pages on 2026-02-12)

---

## Existing Stack (Do Not Change)

These are already validated and in production. Do not re-research.

| Technology | Version | Role |
|------------|---------|------|
| SvelteKit 2 + Svelte 5 | As installed | App framework |
| adapter-node | ^5.5.2 | Produces `node build` standalone server on port 3000 |
| Dockerfile | Two-stage, node:22-alpine | Builds production image, exposes port 3000 |
| docker-compose.yml | Compose v2 plugin | Current: localhost-only, uses `build: .` |
| Supabase | Hosted | Auth, DB, Storage |
| Tailwind v4 | As installed | CSS |

The current `docker-compose.yml` builds locally and maps port 3000 directly to the host. No reverse proxy. No TLS. The CI/CD milestone replaces this with a pull-from-registry production compose + Caddy.

---

## Recommended Stack Additions

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| GitHub Actions | ubuntu-latest runner | CI/CD pipeline automation | Native to GitHub (where code already lives); free tier is generous for a small unit; no external CI service account needed. Push to `main` triggers build → push → deploy. |
| GitHub Container Registry (GHCR) | ghcr.io | Docker image storage | Co-located with the GitHub repo; authenticates with the built-in `GITHUB_TOKEN` — no separate registry account or PAT needed for pushing from Actions. Free for public repos; free up to 500MB/month for private. |
| Caddy v2 | 2.10.2 (latest stable) | Reverse proxy + automatic HTTPS | Caddy obtains and renews Let's Encrypt certificates automatically — zero cron jobs, zero certbot, zero manual renewal. A 3-line Caddyfile is all that is needed for `asqnmilsim.us` with HTTPS. Dramatically simpler than nginx+certbot for this single-app use case. |
| Docker Compose v2 (plugin) | Ships with Docker CE | Production container orchestration | Already used locally. The production compose file differs from dev only in that it pulls a pre-built GHCR image instead of building locally, and adds Caddy as a sidecar. The Compose v2 plugin (`docker compose`) is the current standard — v1 (`docker-compose` hyphen) reached EOL July 2023. |

### GitHub Actions — Action Versions

All versions verified against official GitHub release pages on 2026-02-12.

| Action | Version | Purpose | Why This Version |
|--------|---------|---------|-----------------|
| `actions/checkout` | **v6** (v6.0.2) | Check out repo | Current stable as of 2026-02-12; v4 still works but v6 is the official latest |
| `docker/login-action` | **v3** (v3.7.0) | Authenticate to GHCR | Current stable v3; use with `secrets.GITHUB_TOKEN` — no PAT needed for same-repo GHCR push |
| `docker/setup-buildx-action` | **v3** (v3.12.0) | Enable BuildKit builder | Required for registry-based layer caching; cuts repeat build times from ~3 min to ~30 sec |
| `docker/metadata-action` | **v5** (v5.10.0) | Generate image tags and OCI labels | Derives `latest` + SHA tags from git context automatically; avoids manual tag management |
| `docker/build-push-action` | **v6** (v6.19.2) | Build image and push to GHCR | Current stable v6 as of 2026-02-12; integrates with BuildKit for cache support |
| `appleboy/ssh-action` | **v1** (v1.2.5) | Execute remote SSH commands on VPS | Industry-standard for single-VPS SSH deployment; handles key auth cleanly; Linux-only (ubuntu-latest runner is fine) |

### Supporting Tools (VPS-Side)

| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| Docker CE + Compose plugin | Latest from Docker apt repo | Run containers on the VPS | One-time VPS setup; install from Docker's official apt repo, not Ubuntu's snap/apt (outdated) |
| Caddyfile | N/A (config file, not a package) | Caddy reverse proxy config | Mounted as a read-only volume into the Caddy container; 3-5 lines for this use case |
| `docker-compose.prod.yml` | N/A (new file) | Production-specific compose | Lives on the VPS at a fixed path (e.g., `/app/docker-compose.prod.yml`); SSH deploy step calls `docker compose -f /app/docker-compose.prod.yml pull && up -d` |

---

## Installation

```bash
# On fresh Ubuntu VPS — one-time setup
# Install Docker CE + Compose v2 plugin from official Docker apt repo
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable docker
sudo usermod -aG docker $USER   # deploy user; log out and back in

# Verify
docker compose version   # must show "Docker Compose version v2.x.x"
```

No npm packages are installed — this is infrastructure-layer tooling only. The existing SvelteKit `package.json` is unchanged.

---

## Key Configuration Patterns

### GitHub Actions Workflow (`.github/workflows/deploy.yml`)

```yaml
name: Build and Deploy

on:
  push:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}   # resolves to "owner/repo"

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write       # required to push to GHCR
      attestations: write   # supply chain security (recommended, optional)
      id-token: write       # supply chain security (recommended, optional)

    steps:
      - uses: actions/checkout@v6

      - uses: docker/setup-buildx-action@v3

      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}   # no PAT needed for same-repo

      - id: meta
        uses: docker/metadata-action@v5
        with:
          images: ghcr.io/${{ github.repository }}
          tags: |
            type=sha,prefix=sha-
            type=raw,value=latest

      - uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=registry,ref=ghcr.io/${{ env.IMAGE_NAME }}:buildcache
          cache-to: type=registry,ref=ghcr.io/${{ env.IMAGE_NAME }}:buildcache,mode=max

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest

    steps:
      - uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            echo ${{ secrets.GHCR_TOKEN }} | docker login ghcr.io -u ${{ secrets.GHCR_USER }} --password-stdin
            docker compose -f /app/docker-compose.prod.yml pull
            docker compose -f /app/docker-compose.prod.yml up -d --remove-orphans
            docker image prune -f
```

Note on GHCR auth in deploy step: the VPS pull requires either (a) the image is public, or (b) a PAT stored as `GHCR_TOKEN` secret. Public repos on GitHub default to public GHCR images — no login needed on VPS. Private repos require the PAT.

### Production `docker-compose.prod.yml` (lives on VPS at `/app/`)

```yaml
# /app/docker-compose.prod.yml
# Pulls pre-built image from GHCR — does NOT build locally
services:
  app:
    image: ghcr.io/OWNER/REPO:latest
    restart: unless-stopped
    env_file:
      - /app/.env.production
    environment:
      - ORIGIN=https://asqnmilsim.us   # MUST match production domain
    networks:
      - web
    # No ports exposed to host — Caddy connects via Docker network

  caddy:
    image: caddy:2.10.2-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
      - "443:443/udp"    # HTTP/3 QUIC support
    volumes:
      - /app/Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data      # CRITICAL: persist TLS certs across restarts
      - caddy_config:/config
    networks:
      - web

volumes:
  caddy_data:    # Let's Encrypt certs live here — must survive container restarts
  caddy_config:

networks:
  web:
```

### `/app/Caddyfile` (on VPS)

```
asqnmilsim.us {
    reverse_proxy app:3000
}
```

That is the entire Caddyfile. Caddy automatically:
- Provisions a Let's Encrypt TLS certificate for `asqnmilsim.us`
- Redirects HTTP → HTTPS
- Proxies all traffic to the `app` container on port 3000
- Renews the certificate before expiry
- Serves HTTP/3 if ports are exposed

### SvelteKit `ORIGIN` env var

adapter-node uses `ORIGIN` to validate request origins and construct correct URLs. In production it must be set to `https://asqnmilsim.us` (not `http://localhost:3000`). The existing `docker-compose.yml` sets `ORIGIN=http://localhost:3000` — the production compose overrides this correctly.

### GitHub Secrets Required

| Secret Name | Value | Where Used |
|-------------|-------|-----------|
| `SSH_HOST` | VPS IP or hostname | appleboy/ssh-action |
| `SSH_USER` | Deploy user on VPS (e.g., `deploy`) | appleboy/ssh-action |
| `SSH_PRIVATE_KEY` | Private key for deploy SSH key pair | appleboy/ssh-action |
| `GHCR_TOKEN` | PAT with `read:packages` scope | VPS docker login (private repos only) |
| `GHCR_USER` | GitHub username | VPS docker login (private repos only) |

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| GHCR | Docker Hub | When project is not on GitHub, or team already has a Docker Hub org |
| GHCR | Self-hosted registry (registry:2) | When images must never leave your own infrastructure (security/compliance) |
| Caddy | nginx + certbot | When nginx-specific modules are needed, or team has deep nginx expertise; certbot requires separate cron for renewal |
| Caddy | Traefik | When deploying many dynamic services with service discovery (Swarm/K8s); overkill for one app on one VPS |
| appleboy/ssh-action | Raw SSH in workflow | Acceptable using `webfactory/ssh-agent` + native `ssh` commands; slightly more verbose, removes third-party action dependency |
| appleboy/ssh-action | Ansible | For managing a fleet of servers or complex provisioning; overkill for one VPS |
| Separate `docker-compose.prod.yml` | Single `docker-compose.yml` with env override | Simpler but conflates dev and prod concerns; separate file is cleaner and prevents accidental prod config in dev |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Kubernetes (K8s) | Requires 3+ nodes for HA; massive operational overhead for a single app on a single VPS | Docker Compose v2 on single VPS |
| Terraform / OpenTofu | Infrastructure-as-code for multi-cloud provisioning; overkill for one Interserver VPS you SSH into | Manual VPS provisioning + documented runbook |
| Docker Swarm | Multi-node orchestration overhead with no benefit on a single host | Docker Compose v2 |
| `docker-compose` (hyphen, v1) | Reached EOL July 2023; no longer receives updates or security patches | `docker compose` (space, v2 plugin) |
| Watchtower | Auto-pulls new image versions without explicit deploy trigger; removes deployment control and auditability | Explicit `docker compose pull` in SSH deploy step |
| Jenkins / CircleCI / GitLab CI | External CI services adding cost and separate account overhead when GitHub Actions handles the need natively | GitHub Actions |
| Let's Encrypt `certbot` standalone | Requires managing cron job for renewal; Caddy handles this automatically as a built-in ACME client | Caddy's built-in ACME client |
| nginx | Requires separate certbot + renewal cron; nginx config for a simple reverse proxy is ~50 lines vs Caddy's 3 lines | Caddy |
| Pin actions to SHA only | SHA pinning is a supply-chain best practice for high-risk org repos, but for a milsim unit site it adds maintenance burden with no meaningful security benefit | Pin to major version tag (e.g., `@v6`) |

---

## Stack Patterns by Variant

**If GHCR image is public (default for public GitHub repos):**
- No `docker login` needed on the VPS to pull
- Remove the `echo ... | docker login` line from the SSH deploy script

**If GHCR image is private:**
- Create a PAT with `read:packages` scope
- Store as `GHCR_TOKEN` + `GHCR_USER` secrets in GitHub
- Add `docker login ghcr.io -u $GHCR_USER -p $GHCR_TOKEN` before `docker compose pull` in SSH script

**If VPS IP changes (Interserver VPS reassignment):**
- Update `SSH_HOST` secret in GitHub repo settings → Settings → Secrets and variables → Actions
- Caddy cert is tied to the domain, not the IP; no re-provisioning needed if DNS resolves correctly

**If zero-downtime deploys become needed (future):**
- Current pattern causes ~5 seconds of downtime during `docker compose up -d`
- For zero-downtime: use `docker compose up -d --no-deps --scale app=2 app`, wait for health check, scale back
- Not needed for milsim unit traffic; current pattern is acceptable

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `caddy:2.10.2-alpine` | Docker Compose v2 | Must use named volume for `/data` — if volume is missing, Caddy re-provisions certs on every restart, hitting Let's Encrypt rate limits |
| `docker/build-push-action@v6` | `docker/setup-buildx-action@v3` | v6 build-push-action requires a Buildx builder; `setup-buildx-action` step must run first |
| `actions/checkout@v6` | All ubuntu-latest runners | v6 is current stable as of 2026-02-12 |
| `appleboy/ssh-action@v1` | Linux runners only | Only supports Linux Docker containers; ubuntu-latest runner satisfies this |
| GHCR `GITHUB_TOKEN` for push | Same repository only | The auto-generated `GITHUB_TOKEN` can push images scoped to the same repo's GHCR namespace; cross-repo push requires a PAT |
| `docker/metadata-action@v5` `type=sha` tag | `docker/build-push-action@v6` | SHA tags enable rollback by deploying a specific `ghcr.io/owner/repo:sha-XXXXXXX` image |

---

## Sources

- [GitHub Docs: Publishing Docker Images](https://docs.github.com/actions/guides/publishing-docker-images) — official workflow YAML, GITHUB_TOKEN permissions, GHCR auth — HIGH confidence
- [GitHub Docs: Working with the Container Registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry) — GHCR naming conventions, PAT vs GITHUB_TOKEN, read:packages scope — HIGH confidence
- [docker/build-push-action releases](https://github.com/docker/build-push-action/releases) — v6.19.2 confirmed latest stable 2026-02-12 — HIGH confidence
- [docker/login-action releases](https://github.com/docker/login-action/releases) — v3.7.0 confirmed latest stable — HIGH confidence
- [docker/metadata-action releases](https://github.com/docker/metadata-action/releases) — v5.10.0 confirmed latest stable — HIGH confidence
- [docker/setup-buildx-action releases](https://github.com/docker/setup-buildx-action/releases) — v3.12.0 confirmed latest stable — HIGH confidence
- [actions/checkout releases](https://github.com/actions/checkout/releases) — v6.0.2 confirmed latest stable — HIGH confidence
- [appleboy/ssh-action releases](https://github.com/appleboy/ssh-action/releases) — v1.2.5 confirmed latest stable — HIGH confidence
- [Caddy releases](https://github.com/caddyserver/caddy/releases) — v2.10.2 confirmed latest stable non-beta — HIGH confidence
- [Docker Install Ubuntu](https://docs.docker.com/engine/install/ubuntu/) — official apt repo install steps, Compose v2 plugin — HIGH confidence
- [servicestack.net: SSH Docker Compose deployment](https://docs.servicestack.net/ssh-docker-compose-deploment) — SSH deploy pattern with GitHub Actions — MEDIUM confidence (verified against official action docs)
- [oneuptime.com: Docker with Caddy Automatic HTTPS 2026](https://oneuptime.com/blog/post/2026-01-16-docker-caddy-automatic-https/view) — Caddy Docker Compose volume patterns — MEDIUM confidence (consistent with official Caddy docs)

---

*Stack research for: CI/CD deployment pipeline (GitHub Actions + GHCR + Caddy + SSH deploy to single Ubuntu VPS)*
*Researched: 2026-02-12*
