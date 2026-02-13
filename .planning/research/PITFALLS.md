# Pitfalls Research

**Domain:** CI/CD deployment pipeline — SvelteKit + Docker + Caddy + GitHub Actions on a single VPS
**Researched:** 2026-02-12
**Confidence:** HIGH for pitfalls backed by official docs; MEDIUM for integration-specific issues verified by community reports

---

## Critical Pitfalls

### Pitfall 1: ORIGIN Set to Localhost in Production — CSRF 403 on All Form Actions

**What goes wrong:**
The current `docker-compose.yml` has `ORIGIN=http://localhost:3000`. In production behind Caddy, SvelteKit's built-in CSRF protection compares the `Origin` request header against this value. Every form action (`use:enhance`, `?/action` routes) returns `403 Cross-site POST form submissions are forbidden`. Login, enlistment applications, and all mutations fail silently from the user's perspective.

**Why it happens:**
SvelteKit adapter-node cannot infer the public URL from inside a container. The `ORIGIN` value in the existing compose file was never intended for production — it was set for local development. The Docker image works fine with `docker compose up` locally, so the problem isn't caught until first real deployment.

**How to avoid:**
Set `ORIGIN=https://asqnmilsim.us` in the production compose file or as a GitHub Actions deployment secret. Never hardcode `localhost` in a compose file that is also used (or adapted) for production. Alternatively set `PROTOCOL_HEADER=x-forwarded-proto` and `HOST_HEADER=x-forwarded-host` and configure Caddy to forward those headers — but only do this because Caddy is a trusted reverse proxy you control, not as a public-facing workaround.

**Warning signs:**
- All form actions return 403 in production but work fine locally
- The browser console shows "Cross-site POST form submissions are forbidden"
- Discord OAuth callback succeeds but post-login redirects fail

**Phase to address:**
Phase 1 (VPS + Compose setup) — the correct `ORIGIN` must be in the production compose file before the first deployment attempt.

---

### Pitfall 2: Docker UFW Bypass — Port 3000 Exposed to the Internet Despite Firewall Rules

**What goes wrong:**
Docker inserts its NAT rules directly into iptables at a level that UFW (Ubuntu's firewall) cannot intercept. When `docker-compose.yml` publishes `"3000:3000"`, port 3000 is accessible from the public internet regardless of `ufw deny 3000` — UFW's rules run in the `INPUT` chain; Docker's rules run in the `PREROUTING` chain of the `nat` table, which fires first. The result: your app is directly reachable on port 3000, bypassing Caddy's HTTPS, TLS termination, and any header security Caddy adds.

**Why it happens:**
This is a well-documented but widely unknown Docker behavior. Developers verify `ufw status` shows 3000 denied and assume they're safe. The UFW check passes; the Docker bypass is invisible.

**How to avoid:**
Bind the app container to the Docker internal network only — do not publish ports directly to `0.0.0.0`. In production compose, configure the app service to only be reachable by Caddy on the internal Docker network:
```yaml
services:
  app:
    networks:
      - internal
  caddy:
    ports:
      - "80:80"
      - "443:443"
    networks:
      - internal
networks:
  internal:
```
Only Caddy publishes ports 80 and 443. The app container has no published ports at all. Confirm with `ss -tlnp | grep 3000` from outside the VPS — it should return nothing.

**Warning signs:**
- `curl http://YOUR_VPS_IP:3000` from another machine returns your app
- `ufw status` shows 3000 denied but the curl still works
- Port scanner shows 3000 open

**Phase to address:**
Phase 1 (VPS provisioning + production compose) — must be designed correctly before first deployment; retrofitting requires a compose file change and full redeploy.

---

### Pitfall 3: Caddy Certificate Volume Not Persisted — Let's Encrypt Rate Limits on Container Restart

**What goes wrong:**
Caddy automatically provisions Let's Encrypt TLS certificates and stores them in `/data`. If the Caddy container is restarted or recreated without a persistent volume for `/data`, it re-requests certificates from Let's Encrypt on every startup. Let's Encrypt enforces a rate limit of 5 duplicate certificates per domain per week. After a few redeploys or troubleshooting restarts, certificate provisioning fails with a rate-limit error, and HTTPS is broken for up to a week.

**Why it happens:**
Developers using Caddy for the first time treat it like a stateless container. The auto-HTTPS feature makes it feel like there's nothing to persist. The data directory is invisible unless you explicitly read Caddy's documentation on persistent storage.

**How to avoid:**
Always define a named Docker volume for Caddy's `/data` and `/config` directories:
```yaml
services:
  caddy:
    volumes:
      - caddy_data:/data
      - caddy_config:/config
volumes:
  caddy_data:
  caddy_config:
```
Use Caddy's staging ACME endpoint during initial setup and testing: set `acme_ca https://acme-staging-v02.api.letsencrypt.org/directory` in your Caddyfile. Only switch to production ACME after verifying the full pipeline works. Staging certificates produce browser warnings but don't consume production rate limits.

**Warning signs:**
- Caddy container restarts show "too many certificates already issued" in logs
- HTTPS stops working after a redeploy
- `docker logs caddy` shows ACME challenge failures

**Phase to address:**
Phase 1 (Caddy configuration) — volumes must be declared in the initial compose file. Use staging ACME during Phase 1 setup; switch to production ACME only in the final verification step.

---

### Pitfall 4: Secrets Leaked via Docker ARG into Image Layers

**What goes wrong:**
If build-time secrets (like `SUPABASE_SERVICE_ROLE_KEY`) are passed as `ARG` or `ENV` in a Dockerfile, they are permanently embedded in image metadata. Anyone who can pull the image from GHCR (or runs `docker history --no-trunc <image>`) can read the secrets. With Docker's build attestations enabled by default in recent versions of `docker/build-push-action`, secrets passed as build args are also exposed in attestation metadata, accessible via `docker buildx imagetools inspect`.

**Why it happens:**
The most common cause: a developer copies environment variables from their `.env` file into `ARG` instructions to make them available during `npm run build`, not realizing the values persist in layers. For SvelteKit specifically, `PUBLIC_SUPABASE_URL` is needed at build time for `$env/static/public` — so developers assume all env vars must be build args.

**How to avoid:**
Only `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_PUBLISHABLE_KEY` are needed at SvelteKit build time (they are baked into the client bundle via `$env/static/public`). These are already public-facing values — they appear in every browser request — so embedding them in the image is acceptable. `SUPABASE_SERVICE_ROLE_KEY` and `ORIGIN` are runtime variables, not build-time. Pass them via `env_file` or `environment:` in docker-compose at container start, never as Dockerfile `ARG`. If you genuinely need a secret at build time, use Docker BuildKit's `--secret` mount, which does not persist in layers:
```dockerfile
RUN --mount=type=secret,id=my_secret,target=/run/secrets/my_secret \
    cat /run/secrets/my_secret
```

**Warning signs:**
- `docker history --no-trunc <image>` shows environment variable values in layer commands
- Your Dockerfile has `ARG SUPABASE_SERVICE_ROLE_KEY`
- `docker buildx imagetools inspect` returns build arg values

**Phase to address:**
Phase 2 (Dockerfile + GitHub Actions build) — secrets strategy must be settled before the first GHCR push. Verify with `docker history` after the first build.

---

### Pitfall 5: GHCR Push Fails Due to Missing `packages: write` Permission

**What goes wrong:**
The GitHub Actions workflow fails at the push step with `Error response from daemon: denied` or `unauthorized`. The `GITHUB_TOKEN` available in workflows has read-only package permissions by default. Without explicitly granting `packages: write`, every image push to GHCR will fail, even if the repository settings appear correct.

**Why it happens:**
GitHub's default `GITHUB_TOKEN` permissions are intentionally minimal. Developers assume that because the token authenticates to GitHub, it can push to GHCR. The login step may even succeed (authentication != authorization), making the failure appear later and less obviously connected to permissions.

**How to avoid:**
Explicitly declare package permissions in the workflow file:
```yaml
permissions:
  contents: read
  packages: write
```
Use `secrets.GITHUB_TOKEN` (not a PAT) for GHCR authentication — it's scoped to the workflow run and rotates automatically. Do not use fine-grained PATs with GHCR; they are not supported and will return 403.

**Warning signs:**
- Login step succeeds but push step fails with "denied"
- 403 or 401 errors on `docker push ghcr.io/...`
- Using a fine-grained PAT instead of `secrets.GITHUB_TOKEN`

**Phase to address:**
Phase 2 (GitHub Actions CI workflow) — add permissions block to the workflow YAML before the first push attempt.

---

### Pitfall 6: SSH Deployment Key Has No Passphrase Restriction — VPS Fully Accessible if Key Leaks

**What goes wrong:**
A deployment SSH key is generated, the private key is stored in GitHub Secrets, and the public key is added to `~/.ssh/authorized_keys` on the VPS with no restrictions. If the private key is ever exposed (e.g., accidentally logged, leaked via a compromised third-party action), an attacker has full shell access to the VPS as the deployment user.

**Why it happens:**
Speed. Generating an unrestricted key pair and copy-pasting into GitHub Secrets is a 2-minute process. Adding restrictions requires reading `authorized_keys` format documentation.

**How to avoid:**
Restrict the deployment key in `authorized_keys` to only the commands needed for deployment:
```
command="cd /opt/asqn && docker compose pull && docker compose up -d",no-port-forwarding,no-X11-forwarding,no-agent-forwarding ssh-ed25519 AAAA...
```
Create a dedicated `deploy` user with no sudo rights rather than using root or the main admin user. The key should only be able to execute the specific deployment commands. Also restrict in UFW: only allow SSH from known IP ranges if GitHub Actions runner IPs are stable enough (they publish CIDR ranges).

**Warning signs:**
- The deployment user is `root`
- `~/.ssh/authorized_keys` has the key with no `command=` restriction
- You would not notice if the deployment key was used for an interactive login

**Phase to address:**
Phase 1 (VPS provisioning + SSH hardening) — key restrictions and dedicated deploy user must be set up before the private key is stored in GitHub Secrets.

---

### Pitfall 7: No Restart Policy — App Goes Down After VPS Reboot and Stays Down

**What goes wrong:**
The current `docker-compose.yml` has no `restart:` policy. After a VPS reboot (kernel update, provider maintenance, crash), the Docker daemon restarts but the containers do not. The site is down until someone manually runs `docker compose up -d`. For a small unit where the admin may not check the site daily, this can mean days of downtime.

**Why it happens:**
Restart policies feel like an edge case during development. Local Docker Compose usage never needs them. The omission is only noticed after the first unexpected reboot.

**How to avoid:**
Add `restart: unless-stopped` to every service in the production compose file:
```yaml
services:
  app:
    restart: unless-stopped
  caddy:
    restart: unless-stopped
```
Use `unless-stopped` rather than `always` — `always` will restart containers even after you manually stop them for maintenance, while `unless-stopped` respects intentional stops but recovers from crashes and reboots.

**Warning signs:**
- `docker compose ps` after a reboot shows containers with `Exit` status
- The site is down but no deployment ran
- Your compose file has no `restart:` key

**Phase to address:**
Phase 1 (production docker-compose.yml) — add restart policies before the first production deployment.

---

### Pitfall 8: Build Cache Busting on Every Run — Slow CI from Ignored Dependency Layers

**What goes wrong:**
Every GitHub Actions workflow run rebuilds the Docker image from scratch, taking 3–5 minutes for dependency installation alone. The `node_modules` layer is rebuilt even when `package.json` hasn't changed because `COPY . .` precedes `RUN npm ci`, invalidating the cache.

**Why it happens:**
Developers copy their working local Dockerfile to the CI workflow without ordering layers for cache efficiency. The rule — copy files that change rarely (package manifests) before running expensive commands, copy everything else after — is not obvious until CI bills start accumulating or waiting becomes painful.

**How to avoid:**
Order Dockerfile layers to maximize cache hits:
```dockerfile
# Copy package manifests first — only invalidates npm ci layer when deps change
COPY package.json package-lock.json ./
RUN npm ci
# Copy source after — only rebuilds app layer when code changes
COPY . .
RUN npm run build
```
Use `docker/build-push-action` with `cache-from: type=gha` and `cache-to: type=gha,mode=max` to persist the GitHub Actions cache between workflow runs.

**Warning signs:**
- Every CI run shows `npm ci` downloading all packages from scratch
- Build times are consistently 4+ minutes regardless of change size
- `COPY . .` appears before `RUN npm ci` in your Dockerfile

**Phase to address:**
Phase 2 (Dockerfile authoring + GitHub Actions workflow) — layer order and cache configuration must be set correctly from the first Dockerfile commit.

---

### Pitfall 9: `PUBLIC_SUPABASE_URL` Missing at Build Time — Empty Bundle, Broken Client

**What goes wrong:**
SvelteKit's `$env/static/public` variables (prefixed `PUBLIC_`) are resolved and inlined at build time by Vite. If `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_PUBLISHABLE_KEY` are not present as environment variables during the `npm run build` step inside the Docker build, they resolve to empty strings. The build succeeds without error, but the resulting app has no Supabase client URL — every API call fails at runtime with a "URL must start with http" or similar error.

**Why it happens:**
`.env` files are deliberately excluded from Docker images (correctly). But `$env/static/public` vars need to exist at build time, not just runtime. This is a SvelteKit-specific behavior: static/public = compile-time; dynamic/public = runtime. Most developers learn this the hard way on first production build.

**How to avoid:**
Pass `PUBLIC_*` values as Docker build arguments for the build stage only (these are already public values — they appear in your browser's network tab — so embedding them in the image is not a security issue):
```dockerfile
ARG PUBLIC_SUPABASE_URL
ARG PUBLIC_SUPABASE_PUBLISHABLE_KEY
ENV PUBLIC_SUPABASE_URL=$PUBLIC_SUPABASE_URL
ENV PUBLIC_SUPABASE_PUBLISHABLE_KEY=$PUBLIC_SUPABASE_PUBLISHABLE_KEY
RUN npm run build
```
Pass them from GitHub Actions:
```yaml
- uses: docker/build-push-action@v5
  with:
    build-args: |
      PUBLIC_SUPABASE_URL=${{ vars.PUBLIC_SUPABASE_URL }}
      PUBLIC_SUPABASE_PUBLISHABLE_KEY=${{ vars.PUBLIC_SUPABASE_PUBLISHABLE_KEY }}
```
Store `PUBLIC_*` as GitHub Actions Variables (not Secrets) — they're not sensitive and shouldn't need secret masking. Keep `SUPABASE_SERVICE_ROLE_KEY` as a Secret, and pass it at runtime only.

**Warning signs:**
- Supabase client throws "Invalid URL" or "URL must start with http" at runtime
- Browser network tab shows no requests to Supabase
- The build log shows no warnings about missing env vars (the silence is the trap)

**Phase to address:**
Phase 2 (Dockerfile + GitHub Actions workflow) — define the build-arg strategy before writing the Dockerfile.

---

### Pitfall 10: Deployment Leaves Old Container Running During Pull — Brief Split-Brain State

**What goes wrong:**
The naive SSH deployment sequence runs `docker compose pull && docker compose up -d`. Between when the old container is stopped and the new one starts, there is a window of downtime (typically 5–15 seconds). For a low-traffic unit site this is usually acceptable, but `docker compose up -d` can also fail to recreate the container if the image pull is incomplete or if the compose file has an error — leaving the old container stopped and nothing running.

**Why it happens:**
`docker compose up -d` is the standard command everyone learns first. The pull-then-recreate sequence has no health check gate before terminating the old container.

**How to avoid:**
For a single-VPS milsim unit, brief downtime during deploy is acceptable. Mitigate with: (1) Pull the image before stopping the old container: `docker compose pull app && docker compose up -d --no-deps app`. (2) Add a health check to the app service so Docker knows when the new container is ready before marking it healthy. For true zero-downtime if it becomes needed later, the `docker-rollout` plugin (github.com/wowu/docker-rollout) handles the blue-green switch with Compose and Caddy without major infrastructure changes.

**Warning signs:**
- Users report brief outages aligned with deployment times
- A failed deploy leaves the site completely down rather than rolling back
- No health check defined in docker-compose.yml

**Phase to address:**
Phase 3 (GitHub Actions deploy workflow) — define the deployment sequence and add a health check before wiring up the SSH deployment step.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Using `latest` image tag instead of SHA or semantic version | Simpler workflow | Silent breaking changes when base image updates; impossible to roll back to a specific known-good build | Never in production — always tag with git SHA |
| Storing `.env` file on the VPS and `env_file: .env` in compose | Easy secret management | Secrets on disk in plaintext; git pull accidents can overwrite it; no rotation audit trail | Acceptable for a single-developer small unit site with no audit requirement, but document the file location and permissions |
| Building the image on the VPS instead of in CI | Simpler — no GHCR setup | VPS CPU/RAM used for builds; build failures take down source on the server; no artifact history | Never — build in CI, deploy artifacts |
| `restart: always` instead of `unless-stopped` | One less thing to think about | Container restarts after intentional `docker stop` during maintenance, requiring additional `docker rm` to truly stop | Use `unless-stopped` — same safety net, better maintenance behavior |
| Disabling CSRF check (`checkOrigin: false`) to fix 403 errors | Fixes form actions immediately | Opens cross-site request forgery vulnerabilities on all form actions | Never for a public production site |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| SvelteKit + Caddy | Not forwarding `x-forwarded-proto` / `x-forwarded-host` headers | Caddy forwards these by default as a reverse proxy, but verify with `request.headers.get('x-forwarded-proto')` in a test endpoint |
| SvelteKit + Caddy | Using `PROTOCOL_HEADER` + `HOST_HEADER` on a server not behind a proxy | Only set these when Caddy is the exclusive entry point; they allow header spoofing if set in a direct-access scenario |
| GitHub Actions + GHCR | Using fine-grained PAT for GHCR authentication | Use `secrets.GITHUB_TOKEN` with `packages: write` permission — fine-grained PATs are not supported by GHCR |
| GitHub Actions + SSH | `StrictHostKeyChecking=yes` causes first connection to fail | Add the VPS host key to known_hosts in the workflow, or use `StrictHostKeyChecking=no` with a note that this trades MITM protection for convenience |
| Docker + UFW | Publishing app port to `0.0.0.0` and relying on UFW to block it | Docker bypasses UFW; use Docker internal networks and only publish through Caddy |
| Caddy + Let's Encrypt | Testing HTTPS provisioning with the production ACME endpoint | Use `acme_ca https://acme-staging-v02.api.letsencrypt.org/directory` for all testing; only remove this line when confirming production go-live |
| Docker Compose + Secrets | Setting `SUPABASE_SERVICE_ROLE_KEY` as a Dockerfile `ARG` | Pass service role key only at runtime via `environment:` or `env_file:` in compose — never in Dockerfile |
| SvelteKit + Docker | `.env` file not present in container because it's gitignored | Correct behavior — pass secrets via compose `environment:` or GitHub Actions deployment step, never copy `.env` into image |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| No Docker layer caching in CI | Every push triggers a full 4–5 minute build even for 1-line changes | Use `cache-from: type=gha` in build-push-action; order Dockerfile layers correctly | Immediately — every run is slow from day one |
| Large Docker image from single-stage build | Image is 800MB+; slow to pull on VPS during deploy | Multi-stage Dockerfile: build stage uses full Node + devDeps; runner stage copies only `build/` and `node_modules --omit=dev` to `node:22-alpine` | Noticeable at first deploy; compounds as GHCR storage fills |
| Caddy serving SvelteKit static assets without cache headers | Every page load re-fetches JS/CSS bundles | Caddy's default reverse_proxy passes all headers through; add explicit cache headers for `/_app/immutable/` paths in Caddyfile | Noticeable on repeat visits, especially on mobile connections |
| Docker Compose `up` pulling on every deploy even with same image | Unnecessary network transfer and VPS bandwidth | Tag images with git SHA; skip pull if SHA tag already exists locally | Low severity for small sites but adds 30–60 seconds to every deploy |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Root user inside Docker container | Container escape or misconfiguration gives full root on host | Add `USER node` (non-root) in Dockerfile runner stage after copying build artifacts |
| No `no-new-privileges` security opt | Process inside container can escalate privileges | Add `security_opt: - no-new-privileges:true` to app service in compose |
| SSH port left on default 22 with password auth enabled | Brute force attacks; log noise | Change SSH port or use Fail2ban; disable password auth (`PasswordAuthentication no` in `sshd_config`); key-only auth |
| Docker daemon socket mounted in container (`/var/run/docker.sock`) | Any container with the socket has root on the host | Never mount the Docker socket in the app or Caddy container; only in explicit tooling containers with known risk |
| GitHub Actions secrets in workflow logs | Secrets exposed in public CI logs if accidentally echoed | GitHub masks known secrets automatically, but never `echo $SECRET` or use secrets in shell conditions that print the value |
| `SUPABASE_SERVICE_ROLE_KEY` in a GitHub Actions `env:` block at job level | Scoped too broadly — all steps in the job can access it | Pass the service role key only to the specific deployment step that needs it, or via SSH environment injection at deploy time |

---

## "Looks Done But Isn't" Checklist

- [ ] **ORIGIN variable:** Confirm `ORIGIN=https://asqnmilsim.us` (not localhost) is set in the production environment — test by submitting a form action and verifying no 403
- [ ] **Port exposure:** Confirm `curl http://VPS_IP:3000` from an external machine returns connection refused — app should only be reachable through Caddy
- [ ] **HTTPS working:** `curl -I https://asqnmilsim.us` returns 200 with a valid (non-staging) Let's Encrypt certificate
- [ ] **Caddy volume persisted:** `docker volume ls` shows `caddy_data` and `caddy_config` — certificates survive container recreation
- [ ] **Restart policy:** `docker inspect <app_container> | grep RestartPolicy` shows `unless-stopped` — verify by rebooting the VPS and checking containers auto-start
- [ ] **No secrets in image:** `docker history --no-trunc <image>` contains no secret values — check for `SUPABASE_SERVICE_ROLE_KEY` in layer history
- [ ] **GHCR image pulls on VPS:** `docker compose pull` on the VPS succeeds without manual login — deployment user has read access to the GHCR package
- [ ] **CI cache working:** Second CI run after no code change completes in under 60 seconds (vs. 4+ minutes for cold build)
- [ ] **Deploy user is not root:** SSH deployment runs as a restricted `deploy` user with command restriction in `authorized_keys`
- [ ] **Health check passes:** `docker compose ps` shows app container as `(healthy)` not just `Up`

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| ORIGIN mismatch causing 403 on all forms | LOW | Update `ORIGIN` env var in compose, redeploy — takes 2 minutes |
| Let's Encrypt rate limit hit | HIGH | Wait up to 7 days for rate limit reset; use staging certificate temporarily with `acme_ca` override; consider Let's Encrypt's "duplicate certificate" limit (5/week) vs "certificates per registered domain" limit (50/week) |
| Docker port 3000 exposed publicly | LOW | Remove port binding from compose, add to internal network only, redeploy — takes 5 minutes |
| Service role key leaked in Docker image | HIGH | Rotate `SUPABASE_SERVICE_ROLE_KEY` in Supabase Dashboard immediately; delete and re-push all affected images; audit Supabase logs for unauthorized service-role usage |
| SSH deploy key leaked | HIGH | Remove from VPS `authorized_keys` immediately; generate new key pair; update GitHub Secrets; review VPS access logs |
| Caddy data volume deleted | MEDIUM | Recreate volume, restart Caddy — will re-request certificates (counts against rate limit); if limit hit, use staging endpoint temporarily |
| Failed deploy leaves site down | LOW | SSH into VPS, run `docker compose up -d` manually; investigate failed deployment in GitHub Actions logs |
| Supabase service role key accidentally baked into image | HIGH | Rotate key in Supabase Dashboard; delete all affected images from GHCR; audit access logs |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| ORIGIN=localhost in production | Phase 1: Production compose setup | Submit a form action via the deployed site — 403 = not fixed |
| Docker UFW bypass (port 3000 exposed) | Phase 1: VPS networking + compose | `curl http://VPS_IP:3000` from external — connection refused = fixed |
| Caddy certificate volume not persisted | Phase 1: Caddy configuration | `docker volume ls` shows caddy_data; restart Caddy container and verify HTTPS still works |
| No restart policy | Phase 1: Production compose | Reboot VPS; `docker compose ps` shows containers running without manual intervention |
| Secrets in Docker image layers | Phase 2: Dockerfile + build strategy | `docker history --no-trunc <image>` — no secret values visible |
| GHCR permissions missing | Phase 2: GitHub Actions CI workflow | First image push in CI succeeds without auth errors |
| PUBLIC_ vars missing at build time | Phase 2: Dockerfile build-args | Deploy and open app in browser — Supabase client initializes (no console URL errors) |
| SSH deploy key unrestricted | Phase 1: VPS SSH hardening | `authorized_keys` has `command=` restriction; test that interactive SSH as deploy user is blocked |
| No Docker layer caching | Phase 2: Dockerfile optimization | Second CI run with no code changes completes in under 90 seconds |
| Deploy downtime during container recreation | Phase 3: Deploy workflow sequence | Monitor with uptime check during deployment — acceptable brief gap, but no extended outage |

---

## Sources

- [SvelteKit adapter-node docs — ORIGIN, PROTOCOL_HEADER, HOST_HEADER](https://svelte.dev/docs/kit/adapter-node) — HIGH confidence (official)
- [SvelteKit CSRF issue tracker — Cross-site POST submissions forbidden](https://github.com/sveltejs/kit/issues/6589) — HIGH confidence (official issue)
- [Docker packet filtering and firewalls — UFW bypass](https://docs.docker.com/engine/network/packet-filtering-firewalls/) — HIGH confidence (official)
- [Docker UFW bypass analysis — ufw-docker project](https://github.com/chaifeng/ufw-docker) — HIGH confidence (widely cited)
- [Caddy automatic HTTPS documentation](https://caddyserver.com/docs/automatic-https) — HIGH confidence (official)
- [Let's Encrypt rate limits with Caddy](https://caddy.community/t/trying-to-understand-why-let-s-encrypt-rate-limited-me/5144) — MEDIUM confidence (community)
- [Docker build secrets — secrets in ARG layers](https://pythonspeed.com/articles/docker-build-secrets/) — HIGH confidence (well-sourced)
- [Docker build secrets official docs](https://docs.docker.com/build/building/secrets/) — HIGH confidence (official)
- [Build attestations leaking ARG secrets](https://ricekot.com/2023/docker-provenance-attestations/) — MEDIUM confidence (security research)
- [GHCR workflow permissions](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry) — HIGH confidence (official)
- [GHCR fine-grained PAT incompatibility](https://github.com/orgs/community/discussions/38467) — MEDIUM confidence (community, GitHub official discussion)
- [Docker restart policies](https://docs.docker.com/engine/containers/start-containers-automatically/) — HIGH confidence (official)
- [Docker volume permission issues](https://www.codegenes.net/blog/docker-compose-and-named-volume-permission-denied/) — MEDIUM confidence (community)
- [SvelteKit environment variables — static/public build-time behavior](https://maier.tech/posts/environment-variables-in-sveltekit) — MEDIUM confidence (community, consistent with official docs)
- [Zero-downtime Docker Compose deployment](https://github.com/wowu/docker-rollout) — MEDIUM confidence (community tool, widely used)
- [GitHub Actions Docker cache](https://docs.docker.com/build/ci/github-actions/cache/) — HIGH confidence (official)

---

*Pitfalls research for: CI/CD deployment pipeline — SvelteKit + Docker + Caddy + GitHub Actions (ASQN 1st SFOD v1.1 milestone)*
*Researched: 2026-02-12*
