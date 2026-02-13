# Architecture Research: CI/CD Deployment Pipeline

**Domain:** CI/CD pipeline for SvelteKit + Docker + Caddy + GitHub Actions on a single VPS
**Researched:** 2026-02-12
**Confidence:** HIGH (GitHub official docs, Caddy official docs, verified community patterns)

---

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        DEVELOPER WORKSTATION                         │
│  git push → main branch                                              │
└──────────────────────────────┬──────────────────────────────────────┘
                                │  webhook trigger
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         GITHUB (cloud)                               │
│                                                                       │
│  ┌─────────────────────────────────────────────┐                    │
│  │  GitHub Actions Runner (ubuntu-latest)       │                    │
│  │  1. Checkout code                            │                    │
│  │  2. docker/login-action → ghcr.io            │                    │
│  │  3. docker/metadata-action → tags/labels     │                    │
│  │  4. docker/build-push-action → push image    │                    │
│  │  5. appleboy/ssh-action → deploy on VPS      │                    │
│  └─────────────────────────────────────────────┘                    │
│                                                                       │
│  ┌─────────────────────────────────────────────┐                    │
│  │  GHCR (ghcr.io/org/repo:latest)              │                    │
│  │  GitHub Container Registry — image storage   │                    │
│  └─────────────────────────────────────────────┘                    │
│                                                                       │
│  Secrets: SSH_HOST, SSH_USER, SSH_PRIVATE_KEY, APP_ENV_FILE          │
└──────────────────────────────┬──────────────────────────────────────┘
                                │  SSH deploy command
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     VPS (Ubuntu, Interserver)                         │
│                                                                       │
│  /opt/asqn/                                                           │
│  ├── docker-compose.yml        ← source-controlled, synced via SSH   │
│  ├── Caddyfile                 ← source-controlled, synced via SSH   │
│  └── .env                      ← written once manually, never in git │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Docker Network: asqn_net (bridge)                            │   │
│  │                                                                │   │
│  │  ┌─────────────────┐         ┌──────────────────────────┐    │   │
│  │  │  caddy           │  :80   │  app                      │   │   │
│  │  │  caddy:latest    │  :443  │  ghcr.io/org/repo:latest  │   │   │
│  │  │  ports: 80, 443  │───────▶│  expose: 3000 (internal)  │   │   │
│  │  │                  │        │  env_file: .env            │   │   │
│  │  └─────────────────┘        └──────────────────────────┘    │   │
│  │       volumes:                      volumes: (none)           │   │
│  │         caddy_data (certs)                                     │   │
│  │         caddy_config                                           │   │
│  │         ./Caddyfile                                            │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  Caddy handles: auto-TLS (Let's Encrypt), HTTP→HTTPS redirect,       │
│                 reverse proxy to app:3000 via Docker DNS              │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼  HTTPS (port 443)
                         asqnmilsim.us
```

### Component Responsibilities

| Component | Responsibility | New vs Modified |
|-----------|----------------|-----------------|
| GitHub Actions workflow | Trigger on push to main; build image; push to GHCR; deploy via SSH | NEW — `.github/workflows/deploy.yml` |
| GHCR | Store Docker images tagged by commit SHA + `latest` | NEW — auto-created on first push |
| Caddy container | Terminate TLS, HTTP→HTTPS redirect, reverse proxy to app service | NEW — added to docker-compose |
| app container | Run SvelteKit Node server on port 3000 | MODIFIED — remove `ports:`, change `ORIGIN`, use pre-built image |
| `docker-compose.yml` | Orchestrate caddy + app services on shared network | MODIFIED — add caddy service, volumes, network |
| `Caddyfile` | Declare domain → reverse_proxy rule | NEW — `/opt/asqn/Caddyfile` |
| `.env` on VPS | Hold all runtime secrets; never in git | MODIFIED — add `ORIGIN=https://asqnmilsim.us` |
| VPS directory `/opt/asqn/` | Deployment working directory | NEW — created once during VPS setup |

---

## Recommended Project Structure

```
repo root/
├── .github/
│   └── workflows/
│       └── deploy.yml          # CI/CD pipeline definition
├── Dockerfile                  # Existing two-stage build (unchanged)
├── docker-compose.yml          # MODIFIED — production compose (app + caddy)
├── Caddyfile                   # NEW — Caddy reverse proxy config
├── .env.example                # NEW — document required env vars (no values)
├── src/                        # Application code (unchanged)
└── ...

VPS: /opt/asqn/
├── docker-compose.yml          # synced from repo via SSH in deploy job
├── Caddyfile                   # synced from repo via SSH in deploy job
└── .env                        # written once manually; NOT synced from git
```

### Structure Rationale

- **docker-compose.yml and Caddyfile live in the repo:** They contain no secrets and should be version-controlled. The deploy job copies them to the VPS on every deploy.
- **.env lives only on VPS:** Contains secrets (Supabase keys, etc). Never committed. Written once during VPS provisioning. GitHub Actions does NOT overwrite it.
- **/opt/asqn/ as deploy root:** Conventional, non-root path. Avoids using home directory which can have permission issues with Docker.

---

## Architectural Patterns

### Pattern 1: Two-Job Pipeline (Build → Deploy)

**What:** GitHub Actions workflow split into two sequential jobs. Job 1 builds and pushes the Docker image to GHCR. Job 2 SSHs into the VPS, pulls the new image, and restarts the compose stack.

**When to use:** Always. Separating build from deploy means deploy failures don't re-trigger builds.

**Trade-offs:** ~2-4 minutes total pipeline time. For a single VPS deployment, this is fast enough. No rollback mechanism built in — if the new container fails to start, you need to manually redeploy the previous SHA tag.

**Example:**
```yaml
name: Deploy

on:
  push:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    outputs:
      image: ${{ steps.meta.outputs.tags }}
    steps:
      - uses: actions/checkout@v4

      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=sha,prefix=sha-
            type=raw,value=latest

      - name: Build and push
        uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Copy compose files to VPS
        uses: appleboy/scp-action@v0.1.7
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          source: "docker-compose.yml,Caddyfile"
          target: /opt/asqn/

      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /opt/asqn
            echo ${{ secrets.GHCR_TOKEN }} | docker login ghcr.io -u ${{ secrets.SSH_USER }} --password-stdin
            docker compose pull app
            docker compose up -d --no-deps app
            docker image prune -f
```

### Pattern 2: Caddy + App on Shared Docker Network

**What:** Both services declared in the same `docker-compose.yml`, sharing a named bridge network. Caddy resolves the app service by Docker's internal DNS name (`app`), not by IP or `localhost`.

**When to use:** Required when Caddy and the app run in the same compose stack.

**Trade-offs:** Simple and zero-overhead. The app container does NOT publish ports externally — only Caddy exposes 80/443. This prevents direct port 3000 access from outside.

**Example — docker-compose.yml (production):**
```yaml
services:
  app:
    image: ghcr.io/YOUR_ORG/YOUR_REPO:latest
    expose:
      - "3000"            # internal only — NOT ports:
    env_file:
      - .env
    environment:
      - ORIGIN=https://asqnmilsim.us
    networks:
      - asqn_net
    restart: unless-stopped

  caddy:
    image: caddy:2-alpine
    ports:
      - "80:80"
      - "443:443"
      - "443:443/udp"     # HTTP/3
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    networks:
      - asqn_net
    depends_on:
      - app
    restart: unless-stopped

networks:
  asqn_net:
    driver: bridge

volumes:
  caddy_data:
  caddy_config:
```

**Example — Caddyfile:**
```
asqnmilsim.us {
    reverse_proxy app:3000
}
```

Caddy auto-provisions a Let's Encrypt certificate for `asqnmilsim.us` on first startup. HTTP is automatically redirected to HTTPS. No additional config required for basic TLS.

### Pattern 3: Environment Variable Separation (Image vs VPS)

**What:** Two categories of environment variables. Category A is baked into the compose file as `environment:` keys (non-secret, deployment-specific). Category B lives in `.env` on the VPS only (secrets, never committed).

**When to use:** Always. The SvelteKit `ORIGIN` value is deployment-specific but not secret; put it in `docker-compose.yml` directly. Supabase keys are secrets; put them in `.env` on the VPS.

**Trade-offs:** The `.env` file must be provisioned manually the first time, and any additions require SSHing into the VPS. For a single-VPS deployment with stable secrets, this is acceptable. Do not use GitHub Actions to write `.env` — if a secret rotates, update it on the VPS directly.

**Split by category:**
```
In docker-compose.yml (environment: block, safe to commit):
  ORIGIN=https://asqnmilsim.us
  NODE_ENV=production

In .env on VPS (env_file:, never committed):
  PUBLIC_SUPABASE_URL=https://lelwuinxszfwnlquwsho.supabase.co
  PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJ...
  SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

**NEVER in the Docker image:** No secrets in Dockerfile, no secrets in build args that land in image layers. The image is pushed to GHCR (public by default until set private) — treat it as public.

---

## Data Flow

### Deployment Flow

```
Developer: git push origin main
    ↓
GitHub Actions: push event triggers workflow
    ↓
Job 1 (build):
  checkout → login GHCR → metadata (sha + latest tags) → build image → push to ghcr.io
    ↓ (job 2 needs: build)
Job 2 (deploy):
  checkout → SCP docker-compose.yml + Caddyfile to /opt/asqn/
    ↓
  SSH: cd /opt/asqn && docker compose pull app
    ↓
  SSH: docker compose up -d --no-deps app
    ↓ (only app container restarts; caddy stays up, TLS certs preserved)
  SSH: docker image prune -f
    ↓
New container running with latest image; Caddy continues proxying
```

### HTTPS Request Flow (runtime)

```
Browser → asqnmilsim.us:443
    ↓
VPS port 443 → caddy container
    ↓
Caddy: TLS termination (Let's Encrypt cert from caddy_data volume)
    ↓
Caddy: reverse_proxy → Docker DNS resolves "app" → app container :3000
    ↓
SvelteKit Node server (adapter-node) handles request
    ↓
Server-side: Supabase API calls (cloud, no local DB)
    ↓
Response → Caddy → browser
```

### Secrets Flow

```
Supabase keys:
  Developer → SSH → VPS → /opt/asqn/.env (written once, stays on VPS)

SSH credentials:
  Developer generates ed25519 keypair
  Private key → GitHub Secrets (SSH_PRIVATE_KEY)
  Public key → VPS ~/.ssh/authorized_keys

GHCR authentication:
  GitHub Actions → GITHUB_TOKEN (automatic, no setup needed for build job)
  Deploy job → needs PAT or GITHUB_TOKEN with packages:read to pull on VPS
    (Simplest: generate a PAT with read:packages, store as GHCR_TOKEN secret)
```

---

## VPS Directory Layout

```
/opt/asqn/                        # deployment root (create once)
├── docker-compose.yml            # synced from repo on every deploy
├── Caddyfile                     # synced from repo on every deploy
└── .env                          # written once manually; NEVER overwritten by CI

/root/.ssh/                       # or deploy user's ~/.ssh/
└── authorized_keys               # contains deploy SSH public key

Docker volumes (managed by Docker, not files):
  asqn_caddy_data                 # Let's Encrypt certs + Caddy state
  asqn_caddy_config               # Caddy config cache

GHCR image on VPS (pulled by compose):
  ghcr.io/YOUR_ORG/YOUR_REPO:latest
```

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| GHCR (ghcr.io) | Actions push via GITHUB_TOKEN; VPS pulls via PAT with read:packages | Make the package public in GitHub settings to skip VPS auth, or use PAT |
| Let's Encrypt | Caddy handles automatically — no manual cert work | Requires port 80 open for ACME HTTP-01 challenge on first startup |
| Supabase | Cloud-hosted; app connects via env vars at runtime | No VPS → Supabase network config needed |
| GitHub Secrets | SSH_HOST, SSH_USER, SSH_PRIVATE_KEY, GHCR_TOKEN | 4 secrets total; minimal surface area |

### New vs Modified Components

| Component | Status | What Changes |
|-----------|--------|--------------|
| `docker-compose.yml` | MODIFIED | Add caddy service, volumes, network; change app `ports:` to `expose:`; update ORIGIN |
| `Caddyfile` | NEW | 3-line file; domain + reverse_proxy rule |
| `.github/workflows/deploy.yml` | NEW | Full build + deploy pipeline |
| `Dockerfile` | UNCHANGED | Two-stage build already correct |
| `.env` on VPS | MODIFIED | Change ORIGIN to `https://asqnmilsim.us` |
| `.env.example` | NEW | Document required vars without values; commit this |
| `.gitignore` | MODIFIED | Ensure `.env` is listed |

---

## Anti-Patterns

### Anti-Pattern 1: Exposing App Port Externally When Caddy Is Present

**What people do:** Keep `ports: ["3000:3000"]` on the app service after adding Caddy.
**Why it's wrong:** Port 3000 becomes accessible directly from the internet, bypassing TLS termination and any Caddy middleware.
**Do this instead:** Use `expose: ["3000"]` — this makes the port reachable only within the Docker network. Caddy is the only public entry point.

### Anti-Pattern 2: Copying `.env` From GitHub Actions to VPS

**What people do:** Store the full `.env` contents as a GitHub Secret and SCP it to the VPS on every deploy.
**Why it's wrong:** GitHub Actions logs can leak secret values; secret rotation requires a GitHub secret update; creates a sync dependency.
**Do this instead:** Write `.env` manually once during VPS provisioning. Only update it when secrets rotate. The deploy job never touches it.

### Anti-Pattern 3: Restarting the Full Compose Stack on Deploy

**What people do:** `docker compose down && docker compose up -d` in the deploy script.
**Why it's wrong:** Takes down Caddy, which can lose TLS state or cause a brief outage. `caddy_data` volume preserves certs but downtime still occurs.
**Do this instead:** `docker compose pull app && docker compose up -d --no-deps app` — only the app container restarts. Caddy continues running and the TLS handshake is uninterrupted.

### Anti-Pattern 4: Using `latest` as the Only Image Tag

**What people do:** Only tag the image as `latest`, losing the ability to reference previous builds.
**Why it's wrong:** No rollback path. If the new deployment is broken, you cannot pull a previous known-good image.
**Do this instead:** Tag with both `latest` and `sha-{commit_sha}`. To roll back: SSH in, set `IMAGE_TAG=sha-abc1234` in compose, `docker compose up -d --no-deps app`.

### Anti-Pattern 5: Baking Secrets Into the Docker Image

**What people do:** Pass `ARG SUPABASE_KEY` in the Dockerfile and use it during build.
**Why it's wrong:** Docker build args are visible in image metadata and layer history. GHCR packages may be public by default.
**Do this instead:** All secrets come from `env_file: .env` at container runtime. The image is completely secret-free.

---

## Suggested Build Order

Dependencies determine the order. Each step must succeed before the next.

```
Step 1: VPS initial provisioning
  Install Docker + Docker Compose plugin → create /opt/asqn/ → write .env
      ↓
Step 2: DNS
  Point asqnmilsim.us A record → VPS IP (must propagate before Caddy can get cert)
      ↓
Step 3: Compose file + Caddyfile (repo changes)
  Modify docker-compose.yml (add caddy, change app ports) → write Caddyfile
  → verify locally with `docker compose config`
      ↓
Step 4: GitHub secrets
  Add SSH_HOST, SSH_USER, SSH_PRIVATE_KEY, GHCR_TOKEN to GitHub repo secrets
      ↓
Step 5: GitHub Actions workflow
  Write .github/workflows/deploy.yml → push to main → watch Actions tab
      ↓
Step 6: First deploy validation
  SSH in → check `docker compose ps` (both services healthy)
  → check `docker compose logs caddy` (cert acquired)
  → curl https://asqnmilsim.us → 200
```

**Why this order:**
- DNS must propagate before Caddy first starts — Caddy fetches its Let's Encrypt cert on startup via HTTP-01 challenge to port 80. If DNS isn't pointing at the VPS yet, this fails and Caddy enters a backoff loop.
- VPS provisioning must exist before the deploy job runs SSH commands into it.
- Compose + Caddyfile committed before the workflow, so the first deploy has all files to copy.

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Single VPS (current) | docker-compose with caddy + app. Zero overhead. |
| High-availability needed | Add a second VPS, external load balancer (e.g., DigitalOcean LB), shared Supabase stays as-is. Caddy per-node or move TLS to LB. |
| Multiple services | Expand docker-compose.yml with additional services behind the same Caddy instance. One Caddy can proxy multiple domains/services. |

For a milsim unit website, the single-VPS approach is correct indefinitely. Supabase handles all database scaling. The bottleneck is VPS CPU/memory, not the architecture.

---

## Sources

- GitHub Actions: Publishing Docker images to GHCR (official docs): https://docs.github.com/en/actions/use-cases-and-examples/publishing-packages/publishing-docker-images (HIGH confidence)
- Caddy reverse_proxy directive (official docs): https://caddyserver.com/docs/caddyfile/directives/reverse_proxy (HIGH confidence)
- Docker Compose with Caddy reverse proxy patterns: https://opensourceisfun.substack.com/p/docker-compose-setting-up-a-reverse (MEDIUM confidence — verified against Caddy official docs)
- SSH deploy pattern via appleboy/ssh-action: https://docs.servicestack.net/ssh-docker-compose-deploment (MEDIUM confidence — community docs, consistent with GitHub Actions marketplace docs)
- VPS SSH deployment via GitHub Actions: https://www.andrewhoog.com/posts/how-to-deploy-a-docker-hosted-website-using-github-actions/ (MEDIUM confidence — community resource)
- docker/metadata-action GitHub repo: https://github.com/docker/metadata-action (HIGH confidence — official action)

---
*Architecture research for: CI/CD deployment pipeline — ASQN milsim website on Interserver VPS*
*Researched: 2026-02-12*
