# Phase 8: VPS Provisioning and Production Compose — Research

**Researched:** 2026-02-12
**Domain:** VPS infrastructure, Docker CE, Caddy reverse proxy, SvelteKit adapter-node production deployment
**Confidence:** HIGH (most findings verified via official docs; open questions flagged LOW)

---

## Summary

Phase 8 takes the existing SvelteKit/adapter-node codebase from a local git repo to a running production server accessible over HTTPS. The project already has a functional multi-stage Dockerfile and a dev-only docker-compose.yml — these are starting points, not finished products. The production Compose stack requires substantial additions: a Caddy reverse proxy service, internal Docker networking (app not exposed to internet), named volumes for certificate persistence, and correct restart policies.

The VPS setup work splits cleanly into three sequential areas: (1) OS-level provisioning — Docker CE from the official repo, UFW firewall, deploy user with SSH key-only access, /opt/asqn directory layout; (2) GitHub remote — push existing local git history to a new GitHub repo; (3) Production Compose — replace dev docker-compose.yml with a production-grade stack. DNS propagation is the longest-lead item and must be initiated first.

**Primary recommendation:** Push the existing Dockerfile and Compose changes to a private GitHub repo; provision the VPS manually via SSH; use the `caddy:2-alpine` official image with a mounted Caddyfile and named `caddy_data` volume; use the staging ACME CA throughout this phase per project notes.

---

## Existing Project State (CRITICAL — do not re-create these)

The local repository already has:

| File | Current State | What Phase 8 Must Do |
|------|--------------|----------------------|
| `Dockerfile` | Multi-stage, node:22-alpine, solid production build | Keep as-is — no changes needed |
| `docker-compose.yml` | Dev-only: exposes port 3000 directly, no Caddy, no restart policy | Replace with production Compose |
| `.dockerignore` | Excludes node_modules, .env, build, .svelte-kit | Already correct — keep |
| `.gitignore` | Excludes .env and .env.* | Already correct — .env stays off git |
| `.env.example` | Documents all three keys + ORIGIN | Keep — serves as VPS setup reference |
| `svelte.config.js` | Uses `@sveltejs/adapter-node` | Correct — no changes needed |
| `.git` | Exists locally, no remote set | Needs GitHub remote added |

There is **no `/src/routes/health/+server.ts`** — the `/health` endpoint (COMPOSE-07) must be created.

---

## Standard Stack

### Core Infrastructure
| Component | Version | Purpose | Source |
|-----------|---------|---------|--------|
| `caddy:2-alpine` | latest 2.x | Reverse proxy with auto-HTTPS | Official Docker Hub |
| Docker CE + Compose v2 plugin | current stable | Container runtime | docs.docker.com |
| UFW | system package | Firewall (ports 22, 80, 443) | ubuntu/debian system |
| Node.js | 22-alpine (already in Dockerfile) | App runtime | Already correct |

### Supporting
| Component | Version | Purpose | When to Use |
|-----------|---------|---------|-------------|
| `caddy_data` named volume | — | Persist Let's Encrypt certs across restarts | Always — losing certs triggers rate limiting |
| `caddy_config` named volume | — | Persist Caddy runtime config | Recommended by official Caddy Docker docs |
| ed25519 SSH key pair | — | Deploy user authentication | Generate locally, copy public key to VPS |

### Not Needed (out of scope)
- Nginx: Caddy replaces it completely
- certbot / acme.sh: Caddy handles TLS internally
- Docker Swarm / Kubernetes: Single-host Compose is correct for this scale
- systemd unit files for Compose: `restart: unless-stopped` + `systemctl enable docker` is sufficient

---

## Architecture Patterns

### Production Directory Layout on VPS
```
/opt/asqn/
├── docker-compose.yml      # production Compose stack
├── Caddyfile               # Caddy configuration (mounted read-only)
└── .env                    # production secrets — NEVER in git
```

Volumes and images managed by Docker engine (not in /opt/asqn):
```
caddy_data    (named volume — /data inside caddy container)
caddy_config  (named volume — /config inside caddy container)
```

### Pattern 1: Production docker-compose.yml
**What:** Two services (app + caddy) on a shared internal Docker network. Caddy exposes 80/443 to internet; app uses `expose` not `ports` (internal only).
**When to use:** Any single-host deployment where Caddy terminates TLS.

```yaml
# Source: Official Caddy Docker docs + verified pattern from oneuptime.com/blog/post/2026-01-16-docker-caddy-automatic-https/view
services:
  app:
    build: .
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
      - "443:443/udp"      # HTTP/3 support
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

### Pattern 2: Caddyfile for staging ACME (Phases 8–9)
**What:** Global options block sets staging ACME CA. Remove in Phase 10 final validation.
**Why:** Let's Encrypt production rate limit: 50 certificates per registered domain per week. Staging certs trigger browser warnings but have no rate limit.

```
# Source: https://caddyserver.com/docs/caddyfile/options
{
    acme_ca https://acme-staging-v02.api.letsencrypt.org/directory
}

asqnmilsim.us {
    reverse_proxy app:3000
}
```

**Important:** When switching from staging to production ACME, delete the `caddy_data` volume contents or the volume itself to force Caddy to re-issue real certs. Caddy will not replace a valid staging cert automatically.

### Pattern 3: SvelteKit /health endpoint
**What:** A `+server.ts` API route at `/src/routes/health/+server.ts` that returns HTTP 200.
**Why:** COMPOSE-07 requirement. Caddy's `health_uri` probe can use this. Docker HEALTHCHECK can also reference it.
**How:** SvelteKit API route (not a custom server) — the simplest correct approach.

```typescript
// Source: https://svelte.dev/docs/kit/routing — API routes
import type { RequestHandler } from './$types';

export const GET: RequestHandler = () => {
    return new Response('ok', { status: 200 });
};
```

### Pattern 4: Docker CE Installation on VPS (Ubuntu/Debian)
**What:** Install from official Docker apt repo, not distro packages (distro packages are often outdated).

```bash
# Source: https://docs.docker.com/engine/install/ubuntu/
sudo apt update && sudo apt install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

# Add repo (Ubuntu — use 'debian' URL for Debian)
echo "deb [arch=$(dpkg --print-architecture) \
  signed-by=/etc/apt/keyrings/docker.asc] \
  https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io \
  docker-buildx-plugin docker-compose-plugin

# Enable daemon at boot
sudo systemctl enable docker
sudo systemctl start docker
```

### Pattern 5: Deploy User + SSH Hardening

```bash
# Create deploy user
sudo adduser deploy
sudo usermod -aG docker deploy    # allows docker without sudo

# Copy local public key to VPS deploy user (run on local machine)
ssh-copy-id -i ~/.ssh/id_ed25519.pub deploy@VPS_IP

# Harden sshd — edit /etc/ssh/sshd_config on VPS
# PasswordAuthentication no
# PermitRootLogin no
# PubkeyAuthentication yes
sudo systemctl restart sshd
```

**Security note:** Adding deploy to the `docker` group grants effective root-level container access. This is the standard pattern for automated deploy pipelines. For this single-operator project it is acceptable.

### Pattern 6: UFW Firewall

```bash
# Source: https://documentation.ubuntu.com/server/how-to/security/firewalls/
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp        # SSH — do this BEFORE enabling
sudo ufw allow 80/tcp        # HTTP (Caddy handles redirect to HTTPS)
sudo ufw allow 443/tcp       # HTTPS
sudo ufw allow 443/udp       # HTTP/3
sudo ufw enable
sudo ufw status verbose
```

**CRITICAL:** Allow port 22 before `ufw enable` or you will lock yourself out of the VPS.

### Pattern 7: GitHub Repo Push (existing local git)

```bash
# On local machine — project already has git history
gh repo create asqn-landing-page --private --source=. --remote=origin --push
# OR manually:
# gh repo create asqn-landing-page --private
# git remote add origin git@github.com:USERNAME/asqn-landing-page.git
# git push -u origin main
```

The repo should be **private** — the `.env.example` is safe to commit but keeping the repo private reduces attack surface.

### Anti-Patterns to Avoid
- **`ports: "3000:3000"` on app service in production:** Exposes app directly to internet, bypasses Caddy. Use `expose` instead.
- **Storing secrets in docker-compose.yml environment:** Use `env_file: .env` and keep .env on VPS only.
- **Omitting `caddy_data` named volume:** Caddy re-issues certificates on every restart → hits Let's Encrypt rate limits within hours.
- **Running `docker compose up` as root:** Creates files owned by root in /opt/asqn. Run as deploy user.
- **Using `restart: always` instead of `restart: unless-stopped`:** `always` restarts even after intentional manual stop. `unless-stopped` is correct for production.
- **Forgetting `systemctl enable docker`:** Containers survive crash restarts but not VPS reboots without this.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| TLS certificate provisioning | Custom certbot/acme.sh scripts | Caddy built-in ACME | Caddy auto-renews, handles OCSP stapling, HTTP→HTTPS redirect, HTTP/2+3 out of box |
| HTTP→HTTPS redirect | Nginx or custom redirect service | Caddy (automatic) | Caddy redirects port 80 to 443 automatically when a domain block is defined |
| Certificate persistence | Writing certs to arbitrary paths | Named Docker volume `caddy_data:/data` | Standard Caddy container contract; /data is the defined certificate storage path |
| Reverse proxy health probing | Custom monitoring script | Caddy `health_uri` directive + SvelteKit `/health` route | Works with Docker networking by container name |

**Key insight:** Caddy handles the entire TLS lifecycle. The only custom work is the Caddyfile (domain + reverse_proxy directive) and the `/health` SvelteKit endpoint.

---

## Common Pitfalls

### Pitfall 1: UFW Enabled Before Allowing SSH
**What goes wrong:** Run `sudo ufw enable` without `sudo ufw allow 22/tcp` first → locked out of VPS permanently.
**Why it happens:** UFW default deny incoming blocks existing SSH connection on next TCP handshake.
**How to avoid:** Always `ufw allow 22/tcp` as first UFW command. Verify with `ufw status` before enabling.
**Warning signs:** If you're already locked out, you need VPS provider console access to fix it.

### Pitfall 2: Let's Encrypt Rate Limits with Staging→Production Transition
**What goes wrong:** Switching from staging to production ACME CA but `caddy_data` volume still contains staging cert → Caddy doesn't re-issue → site shows invalid cert in browser.
**Why it happens:** Caddy considers existing cert valid and doesn't replace it even when CA changes.
**How to avoid:** When removing `acme_ca` staging line (Phase 10), run `docker volume rm asqn_caddy_data` before restart.
**Warning signs:** Browser shows "certificate issued by untrusted CA" after switching to production ACME.

### Pitfall 3: ORIGIN Mismatch Causing SvelteKit CSRF Errors
**What goes wrong:** `ORIGIN=http://localhost:3000` (from current dev docker-compose.yml) left in production → SvelteKit form actions and server-side redirects fail.
**Why it happens:** adapter-node validates the `Origin` header against the `ORIGIN` env var for CSRF protection.
**How to avoid:** Set `ORIGIN=https://asqnmilsim.us` in production .env on VPS (or in Compose environment block).
**Warning signs:** POST form submissions return 403 or unexpected redirect failures in production.

### Pitfall 4: DNS Propagation Timing
**What goes wrong:** Starting VPS setup before DNS resolves → Caddy cannot obtain Let's Encrypt cert (ACME HTTP-01 challenge fails) → TLS setup blocked.
**Why it happens:** Let's Encrypt requires HTTP-01 challenge to be reachable at the actual domain, which requires DNS to resolve to the VPS IP.
**How to avoid:** Set DNS A record for asqnmilsim.us → VPS IP as the **first Phase 8 action**. Wait for propagation (minutes to hours) before starting Caddy. Verify with `dig asqnmilsim.us`.
**Warning signs:** `caddy logs` shows ACME challenge failure; `dig asqnmilsim.us` still returns old IP or NXDOMAIN.

### Pitfall 5: App Container Port Exposure Leak
**What goes wrong:** `ports: "3000:3000"` kept on app service in production Compose → port 3000 directly accessible from internet despite Caddy being in place.
**Why it happens:** Mis-copy from dev docker-compose.yml.
**How to avoid:** Use `expose: "3000"` (internal network only) on app service. Verify with `curl http://VPS_IP:3000` from external — must return connection refused (COMPOSE-03 / success criterion 2).

### Pitfall 6: `npm ci` in Dockerfile Copies node_modules to Image
**What goes wrong:** Build cache misses or large image size from unnecessary files.
**Why it happens:** .dockerignore missing `node_modules` entry (existing .dockerignore already excludes it — this is already correct for this project).
**How to avoid:** Current `.dockerignore` is correct. Do not modify it. The `runner` stage uses `npm ci --omit=dev` which is correct.

### Pitfall 7: Docker Compose v1 vs v2 Syntax
**What goes wrong:** `version: '3.8'` header in docker-compose.yml causes deprecation warning with Compose v2.
**Why it happens:** Compose v2 (plugin) ignores the version key but warns about it.
**How to avoid:** Omit the `version` key entirely in new Compose files. The existing docker-compose.yml doesn't have it — keep it that way.
**Warning signs:** `docker compose config` shows warning "version is obsolete".

---

## Code Examples

### Complete Production Caddyfile (staging — Phases 8 & 9)
```
# Source: https://caddyserver.com/docs/caddyfile/options
{
    acme_ca https://acme-staging-v02.api.letsencrypt.org/directory
}

asqnmilsim.us {
    reverse_proxy app:3000
}
```

### SvelteKit /health Endpoint
```typescript
// File: src/routes/health/+server.ts
// Source: https://svelte.dev/docs/kit/routing (API routes)
import type { RequestHandler } from './$types';

export const GET: RequestHandler = () => {
    return new Response('ok', { status: 200 });
};
```

### Production /opt/asqn/.env (template — fill on VPS, never commit)
```bash
# Never commit this file. Fill from .env.example on the VPS directly.
PUBLIC_SUPABASE_URL=https://lelwuinxszfwnlquwsho.supabase.co
PUBLIC_SUPABASE_PUBLISHABLE_KEY=<anon key from Supabase dashboard>
SUPABASE_SERVICE_ROLE_KEY=<service role key from Supabase dashboard>
ORIGIN=https://asqnmilsim.us
NODE_ENV=production
```

### Verify App Not Externally Accessible (success criterion 2)
```bash
# From local machine — must return connection refused
curl http://VPS_IP:3000
# Expected: curl: (7) Failed to connect to VPS_IP port 3000: Connection refused
```

### Enable Docker Daemon at Boot
```bash
# Source: https://docs.docker.com/engine/containers/start-containers-automatically/
sudo systemctl enable docker
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `version: '3.x'` header in compose files | Omit version key entirely | Compose v2 ignores it; omitting avoids deprecation warnings |
| nginx + certbot | Caddy with built-in ACME | No cron for cert renewal; HTTP→HTTPS automatic |
| `docker-compose` (v1, separate binary) | `docker compose` (v2, plugin) | Installed as `docker-compose-plugin`; invoked as `docker compose` |
| `node:XX-alpine` single-stage | Multi-stage builds (already in project) | Smaller images; build tools not in production image |

**Deprecated/outdated:**
- `docker-compose` v1 binary: Superseded by `docker compose` plugin. Install `docker-compose-plugin` not `docker-compose`.

---

## Open Questions

1. **VPS Provider and OS Version**
   - What we know: Phase 8 requires SSH access before execution; VPS IP is pending.
   - What's unclear: Ubuntu 22.04 vs 24.04 vs Debian 12 — Docker CE install commands are slightly different (Ubuntu uses UBUNTU_CODENAME, Debian uses VERSION_CODENAME).
   - Recommendation: Plan should document both Ubuntu and Debian variants. Executor must verify with `cat /etc/os-release` before running install script.
   - Confidence: LOW (unknown until user provides VPS info)

2. **GitHub Repo Visibility**
   - What we know: No GitHub remote exists yet; project notes list this as a pending decision.
   - What's unclear: Public vs private.
   - Recommendation: Default to **private** in the plan. The codebase contains no secrets (`.env` excluded via `.gitignore`), but `.env.example` reveals infrastructure shape. Private is safer at no cost.
   - Confidence: MEDIUM (recommendation only; user decision)

3. **Deploy Strategy: git pull vs image build on VPS**
   - What we know: Phase 8 is initial setup; Phase 9 is CI/CD automation.
   - What's unclear: For Phase 8 bootstrap, should `docker compose up --build` run on the VPS directly (git clone + build on VPS) or build image locally/in CI and pull?
   - Recommendation: For Phase 8 bootstrap: **git clone on VPS + `docker compose up --build` on VPS**. This is simpler for initial setup. Phase 9 will automate the deploy pipeline (likely GitHub Actions).
   - Confidence: MEDIUM

4. **VPS IP Address for DNS**
   - What we know: DNS must be set as first action; IP is unknown until VPS is provisioned.
   - What's unclear: Specific IP depends on VPS provider.
   - Recommendation: Plan task 08-01 as "provision VPS → get IP → set DNS A record immediately." No IP to document in research.
   - Confidence: LOW (external dependency)

---

## Plan-to-Requirements Mapping

| Requirement | Research Finding |
|-------------|-----------------|
| INFRA-01: GitHub push | `gh repo create --private --source=. --push` covers this; existing git history preserved |
| INFRA-02: Docker CE + Compose v2 | Official apt repo; install `docker-compose-plugin` not v1 binary |
| INFRA-03: Deploy user + SSH key-only | `adduser deploy` + `usermod -aG docker deploy` + `ssh-copy-id` + sshd_config hardening |
| INFRA-04: Firewall ports 22/80/443 | `ufw allow` before `ufw enable` — CRITICAL ordering |
| INFRA-05: DNS A record | First action; propagation check with `dig`; required before Caddy can issue TLS cert |
| COMPOSE-01: Compose stack app + Caddy | Verified pattern; use internal network, expose not ports on app |
| COMPOSE-02: Caddy auto-HTTPS | `caddy:2-alpine` + Caddyfile with domain block; staging ACME CA for phases 8-9 |
| COMPOSE-03: App internal-only | `expose: "3000"` not `ports: "3000:3000"` |
| COMPOSE-04: restart: unless-stopped | Both services; requires `systemctl enable docker` |
| COMPOSE-05: ORIGIN=https://asqnmilsim.us | In .env on VPS (not committed); also in compose environment block as override |
| COMPOSE-06: Caddy TLS volume | `caddy_data:/data` named volume |
| COMPOSE-07: /health returns 200 | SvelteKit `+server.ts` API route at `/src/routes/health/+server.ts` |
| SEC-02: .env on VPS only | .gitignore and .dockerignore already exclude .env; .env created manually on VPS |

---

## Sources

### Primary (HIGH confidence)
- [Caddy Reverse Proxy Quick-Start](https://caddyserver.com/docs/quick-starts/reverse-proxy) — domain block syntax, auto-HTTPS behavior
- [Caddy Caddyfile Global Options](https://caddyserver.com/docs/caddyfile/options) — `acme_ca` directive syntax
- [Docker Engine Install Ubuntu](https://docs.docker.com/engine/install/ubuntu/) — exact apt commands verified
- [Docker Start Containers Automatically](https://docs.docker.com/engine/containers/start-containers-automatically/) — restart policy + systemctl enable
- [SvelteKit adapter-node docs](https://svelte.dev/docs/kit/adapter-node) — PORT/HOST/ORIGIN env vars, default port 3000
- [SvelteKit routing docs](https://svelte.dev/docs/kit/routing) — API route pattern for /health

### Secondary (MEDIUM confidence)
- [oneuptime.com Caddy Docker Auto-HTTPS 2026-01-16](https://oneuptime.com/blog/post/2026-01-16-docker-caddy-automatic-https/view) — docker-compose.yml with named volumes, verified against official Caddy docs
- [Docker post-install steps](https://docs.docker.com/engine/install/linux-postinstall/) — docker group membership for deploy user
- [Ubuntu UFW server docs](https://documentation.ubuntu.com/server/how-to/security/firewalls/) — firewall command sequence

### Tertiary (LOW confidence)
- VPS OS specifics: Assumed Ubuntu 22.04/24.04 based on most common VPS offering; Debian path also documented in Docker official docs. Exact OS unknown until user provides VPS.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Official Docker and Caddy docs verified current 2026
- Architecture patterns: HIGH — docker-compose structure verified against official examples
- Pitfalls: HIGH — UFW/ORIGIN/rate-limit pitfalls verified from official docs and known behavior
- Open questions: LOW — VPS IP, OS version, and repo visibility are external/user decisions

**Research date:** 2026-02-12
**Valid until:** 2026-03-12 (stable infrastructure tooling; 30-day window reasonable)
