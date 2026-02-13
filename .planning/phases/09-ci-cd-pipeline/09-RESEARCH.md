# Phase 9: CI/CD Pipeline — Research

**Researched:** 2026-02-12
**Domain:** GitHub Actions, GHCR, Docker build caching, SSH deployment, secret management
**Confidence:** HIGH (core workflow patterns verified against official docs and GitHub Actions marketplace; GHCR private auth pattern verified against GitHub official docs)

---

## Summary

Phase 9 automates the path from `git push` to a running container on the VPS. The infrastructure from Phase 8 is already in place: a VPS at 163.245.216.173, a `deploy` user with docker group access, `/opt/asqn` as the deployment root, a running `docker compose` stack with Caddy + the app container, and a private GitHub repo at `iancrowder23-ship-it/asqn-landing-page`.

The pipeline is a two-job GitHub Actions workflow. The **build job** checks out code, logs into GHCR using the built-in `GITHUB_TOKEN`, extracts image metadata (SHA tag + `latest`), and runs `docker/build-push-action@v6` with GitHub Actions cache (`type=gha`). The Supabase `PUBLIC_*` vars are passed as `--build-arg` (they are public values — not secrets — and must be baked into the image at build time because SvelteKit's `$env/static/public` is compiled by Vite). The **deploy job** needs only: SCP the updated compose file, SSH into the VPS, authenticate Docker with GHCR using a stored PAT, pull the new app image, and run `docker compose up -d --no-deps app` to replace only the app container while Caddy stays untouched.

The key architectural decision is how the production `docker-compose.yml` references the image. The current file uses `build:` which compiles on the VPS — this must change to `image: ghcr.io/iancrowder23-ship-it/asqn-landing-page:latest` on the VPS side. The cleanest pattern is: the workflow SCPs an updated `docker-compose.yml` that replaces `build:` with `image:` pointing to the GHCR image. Since the repo is private, GHCR images are also private, and the VPS requires a PAT with `read:packages` scope stored as a GitHub Secret to authenticate before pulling.

**Primary recommendation:** Use `docker/build-push-action@v6` + `docker/metadata-action@v5` + `appleboy/ssh-action@v1` with `type=gha` cache. Store VPS SSH key/host/user + GHCR PAT + PUBLIC_* vars as GitHub Secrets. Deploy by SCPing the production compose file and running `docker compose pull app && docker compose up -d --no-deps app` on the VPS.

---

## Prior Decisions (from Phase 8 — locked)

| Decision | Value |
|----------|-------|
| VPS IP | 163.245.216.173 |
| DNS | asqnmilsim.us → VPS IP |
| Deploy user | `deploy` (in docker group, SSH key-only) |
| Deploy root | `/opt/asqn` |
| GitHub repo | `iancrowder23-ship-it/asqn-landing-page` (private, HTTPS remote) |
| Main branch | `main` (default, master deleted) |
| SSH key pair | ed25519 at `~/.ssh/asqn_deploy` |
| ACME CA | Staging (through Phase 9; production in Phase 10) |
| App container | `expose: "3000"` only — no port binding to host |
| PUBLIC_* vars | Must be Docker ARG/ENV (inlined by Vite at build time) |

---

## Standard Stack

### Core Actions

| Action | Version | Purpose | Source |
|--------|---------|---------|--------|
| `actions/checkout` | v4 | Checkout repository at triggering commit | GitHub official |
| `docker/login-action` | v3 | Authenticate to GHCR with GITHUB_TOKEN | GitHub Marketplace official |
| `docker/metadata-action` | v5 | Generate SHA + latest tags and OCI labels | GitHub Marketplace official |
| `docker/build-push-action` | v6 | Multi-platform build, push to GHCR, layer cache | GitHub Marketplace official |
| `appleboy/ssh-action` | v1 | SSH into VPS and run deploy commands | GitHub Marketplace |

### Supporting

| Tool/Pattern | Purpose | When to Use |
|-------------|---------|-------------|
| `type=gha` cache backend | GitHub Actions native build cache | Always — requires Buildx >= v0.21.0 (included in current GitHub-hosted runners) |
| `cache-to: type=gha,mode=max` | Cache all layers including intermediates | Always with `mode=max` for maximum cache utilization |
| PAT classic with `read:packages` | VPS authentication to pull private GHCR images | Required because GITHUB_TOKEN only works within Actions workflows |
| `appleboy/scp-action@v1` | SCP files to VPS before SSH commands | Use to push updated docker-compose.yml to /opt/asqn |

### Not Needed

- Docker Hub: GHCR is the registry (free, integrated with GitHub repo)
- Kubernetes / Swarm: Single-host Compose is the stated approach
- Watchtower: CI/CD pipeline provides explicit deploy; Watchtower is implicit/polling
- Self-hosted runners: GitHub-hosted `ubuntu-latest` is sufficient

---

## Architecture Patterns

### Workflow File Location

```
.github/
└── workflows/
    └── deploy.yml      # Single workflow file with two jobs
```

### Pattern 1: Two-Job Workflow Structure

```yaml
# .github/workflows/deploy.yml
name: Build and Deploy

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
    # ... build steps

  deploy:
    runs-on: ubuntu-latest
    needs: build
    # ... deploy steps
```

**Why two jobs:** The build job produces the image digest; the deploy job consumes it. `needs: build` enforces ordering. If build fails, deploy never runs.

### Pattern 2: Build Job — GHCR Login + Metadata + Build+Push

```yaml
# Source: https://docs.github.com/en/actions/use-cases-and-examples/publishing-packages/publishing-docker-images
# Source: https://github.com/docker/metadata-action (v5 docs)
# Source: https://docs.docker.com/build/ci/github-actions/cache/

steps:
  - name: Checkout
    uses: actions/checkout@v4

  - name: Log in to GHCR
    uses: docker/login-action@v3
    with:
      registry: ghcr.io
      username: ${{ github.actor }}
      password: ${{ secrets.GITHUB_TOKEN }}

  - name: Extract Docker metadata
    id: meta
    uses: docker/metadata-action@v5
    with:
      images: ghcr.io/${{ github.repository }}
      tags: |
        type=sha
        type=raw,value=latest,enable={{is_default_branch}}

  - name: Build and push
    uses: docker/build-push-action@v6
    with:
      context: .
      push: true
      tags: ${{ steps.meta.outputs.tags }}
      labels: ${{ steps.meta.outputs.labels }}
      build-args: |
        PUBLIC_SUPABASE_URL=${{ secrets.PUBLIC_SUPABASE_URL }}
        PUBLIC_SUPABASE_PUBLISHABLE_KEY=${{ secrets.PUBLIC_SUPABASE_PUBLISHABLE_KEY }}
      cache-from: type=gha
      cache-to: type=gha,mode=max
```

**Tag output:** `type=sha` produces `sha-XXXXXXX` (7-char git short SHA). `type=raw,value=latest` produces `latest` on pushes to main. Both tags point to the same image digest.

### Pattern 3: Deploy Job — SCP + SSH

```yaml
# Source: https://github.com/appleboy/ssh-action (v1 docs)

deploy:
  runs-on: ubuntu-latest
  needs: build
  steps:
    - name: Checkout (for compose file)
      uses: actions/checkout@v4

    - name: Copy compose file to VPS
      uses: appleboy/scp-action@v1
      with:
        host: ${{ secrets.SSH_HOST }}
        username: ${{ secrets.SSH_USER }}
        key: ${{ secrets.SSH_PRIVATE_KEY }}
        source: docker-compose.prod.yml
        target: /opt/asqn/

    - name: Deploy on VPS
      uses: appleboy/ssh-action@v1
      with:
        host: ${{ secrets.SSH_HOST }}
        username: ${{ secrets.SSH_USER }}
        key: ${{ secrets.SSH_PRIVATE_KEY }}
        script: |
          echo "${{ secrets.GHCR_PAT }}" | docker login ghcr.io -u ${{ secrets.SSH_USER }} --password-stdin
          cd /opt/asqn
          docker compose pull app
          docker compose up -d --no-deps app
```

**Note:** The deploy job uses `docker login ghcr.io` on the VPS because `GITHUB_TOKEN` is only valid within GitHub Actions workflows. The VPS needs a PAT with `read:packages` scope.

### Pattern 4: Production Compose File for CI/CD

The current `docker-compose.yml` uses `build:` to compile the image on the VPS. For CI/CD, the VPS must use a pre-built GHCR image. Two approaches:

**Option A: Replace build: with image: in docker-compose.yml** (recommended)
The CI/CD workflow SCPs a `docker-compose.prod.yml` that replaces the `build:` block with `image: ghcr.io/iancrowder23-ship-it/asqn-landing-page:latest`. This is the canonical CI/CD pattern.

```yaml
# docker-compose.prod.yml (tracked in repo, SCPed to VPS as docker-compose.yml)
services:
  app:
    image: ghcr.io/iancrowder23-ship-it/asqn-landing-page:latest
    expose:
      - "3000"
    env_file: .env
    environment:
      - ORIGIN=https://asqnmilsim.us
      - NODE_ENV=production
    restart: unless-stopped
    networks:
      - internal

  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
      - "443:443/udp"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    networks:
      - internal
    depends_on:
      - app

networks:
  internal:

volumes:
  caddy_data:
  caddy_config:
```

**Option B: Keep existing docker-compose.yml with build: for local dev**
The existing `docker-compose.yml` stays for local/VPS initial bootstrap. The CI/CD deploy job uses `docker compose -f docker-compose.prod.yml up` on the VPS after SCPing the prod file.

**Recommendation: Option A** — maintain `docker-compose.yml` as the production file (tracked in repo, overwritten on VPS by SCP each deploy). `docker-compose.dev.yml` remains for local dev. The `.dockerignore` already excludes `docker-compose*.yml` from the image.

### Pattern 5: GitHub Secrets Required

| Secret Name | Value | Used In |
|-------------|-------|---------|
| `SSH_HOST` | `163.245.216.173` | Deploy job SSH connection |
| `SSH_USER` | `deploy` | Deploy job SSH connection |
| `SSH_PRIVATE_KEY` | Contents of `~/.ssh/asqn_deploy` (private key) | Deploy job SSH connection |
| `GHCR_PAT` | PAT classic with `read:packages` | VPS docker login for pulling private image |
| `PUBLIC_SUPABASE_URL` | `https://lelwuinxszfwnlquwsho.supabase.co` | Build arg (public value, baked at compile time) |
| `PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable/anon key | Build arg (public value, baked at compile time) |

**Note on PUBLIC_* as Secrets:** Although these values are technically public (they're Supabase publishable/anon keys), storing them as GitHub Secrets is pragmatic — it keeps them out of the workflow YAML file which is committed to the repo, while still making them available to the build. They are NOT secret in the security sense; exposing them does not grant backend access.

### Anti-Patterns to Avoid

- **Baking `SUPABASE_SERVICE_ROLE_KEY` as a build-arg:** The service role key is a runtime secret, read at app startup from `.env` on the VPS. It must never be a build-arg or in the Docker image. It stays in `/opt/asqn/.env` only.
- **Using `docker build-push-action` `secrets:` for PUBLIC_* vars:** `--mount=type=secret` is for runtime build secrets (e.g., npm tokens). `PUBLIC_*` are values that must be in the compiled JavaScript bundle — they need `ARG/ENV` not build secrets.
- **Using `type=sha,format=long` without knowing the tag length:** Default `type=sha` produces `sha-XXXXXXX` (7 chars). Long format produces `sha-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX` (40 chars). Keep default (short) for usability.
- **Omitting `needs: build` in deploy job:** Both jobs run in parallel without this. Deploy may SSH to VPS before image exists.
- **Running `docker compose up` (all services) instead of `--no-deps app`:** Recreates the Caddy container unnecessarily, causing brief HTTPS downtime.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Image tagging | Custom tag scripts with `git rev-parse` | `docker/metadata-action@v5` | Handles branch refs, PR tags, SHA, latest, semver — all via config |
| Docker buildx cache | Custom Dockerfile layer tricks | `cache-from/cache-to: type=gha` | GitHub Actions native cache; Buildx handles all layer cache logic |
| SSH command execution | Custom curl/webhook scripts | `appleboy/ssh-action@v1` | Handles key auth, multiple commands, error handling, timeouts |
| File transfer to VPS | rsync/scp shell scripts | `appleboy/scp-action@v1` | Same SSH auth pattern; handles permissions correctly |
| GHCR login | PAT management scripts | `docker/login-action@v3` | Handles registry auth, credential storage, GITHUB_TOKEN scope |

---

## Common Pitfalls

### Pitfall 1: SUPABASE_SERVICE_ROLE_KEY Leaking Into Image

**What goes wrong:** Developer adds `SUPABASE_SERVICE_ROLE_KEY` as a build-arg (alongside the PUBLIC_* vars) thinking it's needed at build time. The key is now visible in `docker history --no-trunc <image>`. SEC-03 violated.

**Why it happens:** Cargo-culting the PUBLIC_* pattern to all Supabase keys.

**How to avoid:** Audit the Dockerfile — only `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_PUBLISHABLE_KEY` should be ARGs. `SUPABASE_SERVICE_ROLE_KEY` is a runtime env var read from `/opt/asqn/.env` by the running container.

**Verification step (success criterion 4):** `docker history --no-trunc ghcr.io/iancrowder23-ship-it/asqn-landing-page:latest | grep -i service_role` must return empty.

### Pitfall 2: GITHUB_TOKEN Can't Pull Private GHCR Images on External VPS

**What goes wrong:** Deploy job uses `GITHUB_TOKEN` to log into GHCR on the VPS via SSH. Token is scoped to the current workflow run and has no cross-environment validity. `docker pull ghcr.io/...` fails with 401.

**Why it happens:** GITHUB_TOKEN is a short-lived token valid only within the GitHub Actions runner, not usable outside the runner environment.

**How to avoid:** Create a PAT (classic) with `read:packages` scope. Store as `GHCR_PAT` GitHub Secret. Use it in the SSH deploy script: `echo "$GHCR_PAT" | docker login ghcr.io -u <github-username> --password-stdin`.

**Source:** https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry

### Pitfall 3: Layer Cache Miss on First Run After Workflow Creation

**What goes wrong:** First push after adding cache configuration still runs full build — seems like cache isn't working.

**Why it happens:** GitHub Actions cache for Docker layers is populated on first successful run. There's nothing to restore from on the very first run. This is expected behavior.

**How to avoid:** Accept the first run is cold. Verify caching is working by checking the second push — build job should complete significantly faster (seconds vs minutes for the npm install and Vite build steps).

**Warning signs:** If the second push is still as slow as the first, check that `cache-from` and `cache-to` are both specified and that the Buildx version on the runner supports GHA cache.

### Pitfall 4: `--no-deps` Behavior Change in Compose v2.26.0+

**What goes wrong:** `docker compose up -d --no-deps app` on a modern Docker install recreates the container even when the image hasn't changed (regression from v2.15.x behavior).

**Why it happens:** Docker Compose v2.26.0+ changed how service recreation is evaluated — it now always recreates when explicitly named.

**How to avoid:** The correct deploy sequence is:
1. `docker compose pull app` — pulls the new image
2. `docker compose up -d --no-deps app` — starts new container from pulled image

Step 1 ensures the image is updated before step 2 runs. Even if recreate always triggers, this is acceptable behavior for a deploy pipeline — brief downtime during container restart is expected (Caddy continues serving until the container restarts).

**Source:** https://github.com/docker/compose/issues/12069

### Pitfall 5: Workflow Triggers on Every Branch Push

**What goes wrong:** Workflow file `on: push` without branch filter triggers builds on feature branches, wasting CI minutes and potentially deploying non-production code.

**How to avoid:**
```yaml
on:
  push:
    branches: [main]
```

This matches the requirement (CICD-01) and ensures only main pushes trigger the full deploy pipeline.

### Pitfall 6: SSH Known Hosts Warning Blocks Deploy

**What goes wrong:** `appleboy/ssh-action` fails because the VPS host key is not in known_hosts, and the action doesn't have `StrictHostKeyChecking no` set.

**Why it happens:** SSH default behavior rejects unknown hosts.

**How to avoid:** `appleboy/ssh-action@v1` handles this automatically by default (sets `StrictHostKeyChecking=no` internally). This is acceptable for a private deploy pipeline. Alternatively, add the VPS host key fingerprint as a secret and pass it via `envs` to a keyscan step.

### Pitfall 7: `docker-compose.yml` Still Has `build:` on VPS After First CI/CD Deploy

**What goes wrong:** CI/CD SCP step copies updated compose file to VPS but file name differs, so old `build:` compose is still used. `docker compose pull app` silently pulls nothing because there's no `image:` field.

**Why it happens:** Mismatched file names between what SCP copies and what `docker compose` reads.

**How to avoid:** SCP must write to exactly `/opt/asqn/docker-compose.yml`. The deploy command `docker compose pull app` then correctly references the `image:` field in the newly-copied file.

---

## Code Examples

### Complete deploy.yml Workflow

```yaml
# .github/workflows/deploy.yml
# Source: GitHub Actions official docs + docker/* action repos
name: Build and Deploy

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

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract Docker metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ghcr.io/${{ env.IMAGE_NAME }}
          tags: |
            type=sha
            type=raw,value=latest,enable={{is_default_branch}}

      - name: Build and push Docker image
        uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          build-args: |
            PUBLIC_SUPABASE_URL=${{ secrets.PUBLIC_SUPABASE_URL }}
            PUBLIC_SUPABASE_PUBLISHABLE_KEY=${{ secrets.PUBLIC_SUPABASE_PUBLISHABLE_KEY }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    runs-on: ubuntu-latest
    needs: build

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Copy production compose file to VPS
        uses: appleboy/scp-action@v1
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          source: "docker-compose.yml,Caddyfile"
          target: /opt/asqn/

      - name: Deploy to VPS
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            echo "${{ secrets.GHCR_PAT }}" | docker login ghcr.io -u "${{ secrets.SSH_USER }}" --password-stdin
            cd /opt/asqn
            docker compose pull app
            docker compose up -d --no-deps app
```

### GHCR Manual Login on VPS (one-time setup, also in deploy script)

```bash
# Source: https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry
# Run on VPS as deploy user — for manual/bootstrap pulls
export GHCR_PAT=<PAT with read:packages>
echo $GHCR_PAT | docker login ghcr.io -u <github-username> --password-stdin
```

### Verify No Secrets in Image Layers (success criterion 4)

```bash
# Run locally after pulling the image
docker pull ghcr.io/iancrowder23-ship-it/asqn-landing-page:latest
docker history --no-trunc ghcr.io/iancrowder23-ship-it/asqn-landing-page:latest | grep -i service_role
# Expected: no output (empty)

# Check what IS in the image env (PUBLIC_* should appear, SERVICE_ROLE must not)
docker inspect ghcr.io/iancrowder23-ship-it/asqn-landing-page:latest | grep -i supabase
# Expected: only PUBLIC_ vars from ARG/ENV in builder stage
```

### Production docker-compose.yml (image: instead of build:)

```yaml
# Tracked in repo as docker-compose.yml — no build: section
# SCPed to /opt/asqn/ by deploy job each run
services:
  app:
    image: ghcr.io/iancrowder23-ship-it/asqn-landing-page:latest
    expose:
      - "3000"
    env_file: .env
    environment:
      - ORIGIN=https://asqnmilsim.us
      - NODE_ENV=production
    restart: unless-stopped
    networks:
      - internal

  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
      - "443:443/udp"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    networks:
      - internal
    depends_on:
      - app

networks:
  internal:

volumes:
  caddy_data:
  caddy_config:
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Docker Hub for image storage | GHCR (GitHub Container Registry) | Free, co-located with repo, uses GITHUB_TOKEN for CI auth |
| `set-output` GitHub Actions commands | `$GITHUB_OUTPUT` environment file | Old set-output deprecated; metadata-action v5+ uses GITHUB_OUTPUT |
| `docker/login-action@v2` | `docker/login-action@v3` | v3 uses Node 20 runtime (v2 uses Node 16, deprecated) |
| `docker/metadata-action@v4` | `docker/metadata-action@v5` | v5 uses Node 20, updated tag generation API |
| `docker/build-push-action@v5` | `docker/build-push-action@v6` | v6 uses Buildx v0.21.0+ which supports GHA cache API v2 |
| Registry cache (`type=registry`) | GHA cache (`type=gha`) | GHA cache is simpler for single-repo pipelines; no registry storage overhead |
| PAT for GHCR push in CI | `secrets.GITHUB_TOKEN` | GITHUB_TOKEN scoped to repo; no long-lived PAT for CI push |

**Deprecated/outdated:**
- `set-output` syntax: Replaced by `$GITHUB_OUTPUT`. Not manually used — actions handle internally.
- GHA cache API v1: Only v2 supported after April 15, 2025. Requires Buildx >= v0.21.0 (ubuntu-latest runners include this).
- `docker/login-action@v1/v2`: Deprecated Node 16 runtime. Use v3.

---

## Open Questions

1. **docker-compose.yml rename/split strategy**
   - What we know: Current `docker-compose.yml` has `build:` context and args; VPS uses it directly. For CI/CD, the VPS must use `image:` not `build:`.
   - What's unclear: Should we rename the current file to `docker-compose.dev.yml`, make a new production `docker-compose.yml` with `image:`, and update the VPS? Or keep them separate with different names?
   - Recommendation: Make `docker-compose.yml` the production file (with `image:` field) and keep `docker-compose.dev.yml` for local builds. This matches Phase 8's precedent (dev compose is already `docker-compose.dev.yml`). The SCP step copies `docker-compose.yml` to `/opt/asqn/` each deploy.
   - Confidence: HIGH — this is the standard pattern; Phase 8 already split dev/prod compose

2. **GHCR PAT — GitHub Actions token vs user PAT**
   - What we know: The VPS needs `read:packages` PAT to pull from private GHCR. GitHub docs say classic PAT is required for package registry operations outside Actions.
   - What's unclear: Fine-grained PATs (beta) may work — GitHub is migrating to fine-grained tokens.
   - Recommendation: Use classic PAT with `read:packages` scope for the VPS. Classic PATs still work and are unambiguous. Document as `GHCR_PAT` secret.
   - Confidence: HIGH (GitHub docs are explicit that classic PAT with `read:packages` works)

3. **appleboy/scp-action for compose file vs embedding in SSH script**
   - What we know: `appleboy/scp-action@v1` exists and works. Alternatively, the deploy script could `git pull` on the VPS and read compose from there.
   - What's unclear: `git pull` on VPS requires git credentials; SCP is simpler.
   - Recommendation: Use SCP for `docker-compose.yml`. Avoid `git pull` on VPS — introduces credential management complexity and the VPS should only have the production binary/config, not full source code.
   - Confidence: HIGH

4. **SSH_USER value for GHCR login on VPS**
   - What we know: Deploy user is `deploy`. GHCR login requires GitHub username (the account owning the PAT).
   - What's unclear: `SSH_USER` is the VPS deploy username (`deploy`), NOT the GitHub account username. These are different.
   - Recommendation: Store the GitHub account username separately as `GHCR_USERNAME` secret (value: `iancrowder23-ship-it` or the account that owns the PAT). Do not reuse `SSH_USER` for GHCR login.
   - Confidence: HIGH — these are different credentials; mixing them causes auth failure

---

## Plan-to-Requirements Mapping

| Requirement | Research Finding |
|-------------|-----------------|
| CICD-01: Triggers on push to main | `on: push: branches: [main]` — standard workflow trigger |
| CICD-02: Build + push to GHCR with SHA + latest | `docker/metadata-action@v5` with `type=sha` + `type=raw,value=latest` |
| CICD-03: PUBLIC_* as build-args, not baked from .env | `build-args` in `docker/build-push-action@v6` from GitHub Secrets |
| CICD-04: Deploy to VPS via SSH (pull + restart app) | `appleboy/ssh-action@v1` with `docker compose pull app && docker compose up -d --no-deps app` |
| CICD-05: Docker layer caching | `cache-from: type=gha` + `cache-to: type=gha,mode=max` |
| SEC-01: GitHub Secrets for SSH key/host/user | `SSH_HOST`, `SSH_USER`, `SSH_PRIVATE_KEY` GitHub Secrets |
| SEC-03: No secrets in Docker image layers | Only PUBLIC_* vars (non-secret) as build-args; SERVICE_ROLE_KEY stays in VPS .env only |

---

## Sources

### Primary (HIGH confidence)

- [GitHub Docs: Publishing Docker images](https://docs.github.com/en/actions/use-cases-and-examples/publishing-packages/publishing-docker-images) — complete workflow structure, GITHUB_TOKEN usage, permissions block
- [GitHub Docs: Working with Container Registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry) — PAT requirement for external VPS pulls, `read:packages` scope
- [Docker Docs: GHA cache backend](https://docs.docker.com/build/ci/github-actions/cache/) — `type=gha`, `mode=max`, Buildx version requirement (>= v0.21.0)
- [docker/metadata-action GitHub repo](https://github.com/docker/metadata-action) — v5, `type=sha`, `type=raw,value=latest,enable={{is_default_branch}}`
- [appleboy/ssh-action GitHub repo](https://github.com/appleboy/ssh-action) — v1, required inputs (host/username/key), script syntax

### Secondary (MEDIUM confidence)

- [GitHub Actions Docker build guide (oneuptime.com 2026-01-25)](https://oneuptime.com/blog/post/2026-01-25-github-actions-docker-images/view) — workflow patterns verified against official docs
- [Docker Compose `--no-deps` behavior change issue #12069](https://github.com/docker/compose/issues/12069) — v2.26.0+ always recreates; workaround is `pull` before `up`
- [Docker build secrets docs](https://docs.docker.com/build/ci/github-actions/secrets/) — confirms `build-args` are visible in image history; `--mount=type=secret` is for actual secrets (not PUBLIC_* vars which are intentionally baked in)

### Tertiary (LOW confidence)

- appleboy/scp-action@v1 patterns: Consistent with ssh-action@v1 usage, not separately verified via official docs (GitHub Marketplace page reviewed but not deeply verified)

---

## Metadata

**Confidence breakdown:**

- Standard stack (actions, versions): HIGH — verified against official GitHub docs and action repos
- Architecture (two-job workflow, GHA cache, metadata tags): HIGH — official Docker docs verified
- GHCR private auth (PAT requirement): HIGH — explicitly stated in GitHub official docs
- Deploy pattern (`--no-deps app`): HIGH — documented in Docker Compose CLI reference; behavior change noted
- Pitfalls: HIGH — service role key leak and PAT requirement verified from official sources

**Research date:** 2026-02-12
**Valid until:** 2026-03-12 (GitHub Actions action versions are stable; 30-day window reasonable)
