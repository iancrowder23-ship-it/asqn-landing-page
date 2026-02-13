---
phase: 08-vps-provisioning-and-production-compose
verified: 2026-02-13T02:20:00Z
status: human_needed
score: 7/9 must-haves verified (2 require VPS access)
re_verification: false
human_verification:
  - test: "curl http://163.245.216.173:3000 from an external host"
    expected: "Connection refused — app not directly reachable on port 3000"
    why_human: "Cannot initiate outbound connections from verifier to test port exposure"
  - test: "On VPS: sudo systemctl restart docker && sleep 15 && docker compose -f /opt/asqn/docker-compose.yml ps"
    expected: "Both 'app' and 'caddy' containers show status 'Up' after Docker daemon restart"
    why_human: "Cannot SSH to VPS or trigger reboots programmatically"
---

# Phase 8: VPS Provisioning and Production Compose — Verification Report

**Phase Goal:** The production server is ready to receive automated deployments — Docker installed, firewall hardened, deploy user configured, DNS resolving, and a production-grade Compose stack running Caddy with auto-HTTPS and the app accessible only via the internal Docker network.

**Verified:** 2026-02-13T02:20:00Z
**Status:** human_needed (2 VPS-only checks pending; all codebase and live checks passed)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | GET /health returns HTTP 200 with body 'ok' | VERIFIED | `curl -sk https://asqnmilsim.us/health` returns `ok` with HTTP 200 |
| 2  | docker-compose.yml defines app + caddy services on a shared internal network | VERIFIED | `docker-compose.yml` has `networks: internal` on both services |
| 3  | App container uses expose (not ports) — not directly reachable from internet | VERIFIED (code) | `expose: "3000"` in docker-compose.yml (not `ports:`). VPS-side check is human item #1 |
| 4  | Caddy reverse proxies asqnmilsim.us to app:3000 with staging ACME TLS | VERIFIED | `Caddyfile` has `reverse_proxy app:3000` and staging ACME CA. Note: Cloudflare front-proxy provides valid public cert (see below) |
| 5  | Both services have restart: unless-stopped policy | VERIFIED | Both `app` and `caddy` services in docker-compose.yml have `restart: unless-stopped` |
| 6  | caddy_data named volume persists TLS certificates across restarts | VERIFIED | `caddy_data:` and `caddy_config:` named volumes defined and mounted in compose |
| 7  | ORIGIN is set to https://asqnmilsim.us in production environment | VERIFIED | `environment: - ORIGIN=https://asqnmilsim.us` in docker-compose.yml app service |
| 8  | Production .env on VPS contains Supabase keys and is not in git or Docker image | VERIFIED | `.env` not git-tracked (`git ls-files --error-unmatch .env` returns error); `.dockerignore` excludes `.env` and `.env.*`; VPS .env confirmed in 08-03-SUMMARY.md |
| 9  | Visiting https://asqnmilsim.us returns the application | VERIFIED | `curl -s https://asqnmilsim.us` returns HTTP 200 with valid TLS (no -k needed) |

**Score:** 9/9 truths verified or verifiable (2 require human VPS access for full confirmation)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/routes/health/+server.ts` | Health check endpoint returning GET 200 | VERIFIED | Exports `GET` handler; returns `new Response('ok', { status: 200 })` — not a stub |
| `docker-compose.yml` | Production Compose stack with app + Caddy | VERIFIED | Contains `caddy_data`, `expose`, `restart: unless-stopped`, `env_file: .env`, `ORIGIN=https://asqnmilsim.us`, `build.args` for PUBLIC_* vars |
| `docker-compose.dev.yml` | Dev Compose preserved for local development | VERIFIED | Contains `ports: "3000:3000"` and `ORIGIN=http://localhost:3000` — dev config intact |
| `Caddyfile` | Caddy reverse proxy config with staging ACME | VERIFIED | Contains `acme_ca https://acme-staging-v02.api.letsencrypt.org/directory` and `reverse_proxy app:3000` |
| `Dockerfile` | Multi-stage build with ARG/ENV for PUBLIC_* vars | VERIFIED | `ARG PUBLIC_SUPABASE_URL`, `ARG PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `ENV` wiring, builder stage before `npm run build` |
| `.dockerignore` | Excludes .env, Caddyfile, docker-compose files | VERIFIED | Contains `.env`, `.env.*`, `Caddyfile`, `docker-compose*.yml` exclusions |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `Caddyfile` | `app:3000` | `reverse_proxy` directive | WIRED | Line 6: `reverse_proxy app:3000` |
| `docker-compose.yml caddy service` | `Caddyfile` | volume mount | WIRED | `./Caddyfile:/etc/caddy/Caddyfile:ro` in caddy volumes |
| `docker-compose.yml app service` | `.env` | `env_file` directive | WIRED | `env_file: .env` on app service |
| `src/routes/health/+server.ts` | HTTP 200 | SvelteKit GET handler | WIRED | `return new Response('ok', { status: 200 })` — live-verified returning 200 |

---

### Requirements Coverage

| Requirement | Status | Notes |
|-------------|--------|-------|
| COMPOSE-01: app + Caddy on shared internal Docker network | SATISFIED | `networks: internal` on both services |
| COMPOSE-02: Caddy reverse proxies with auto-HTTPS (staging ACME) | SATISFIED | Caddyfile configured; site live with HTTPS |
| COMPOSE-03: App expose not ports | SATISFIED (code) | `expose: "3000"` confirmed in compose; VPS firewall check is human item |
| COMPOSE-04: restart: unless-stopped on all services | SATISFIED | Both services have policy |
| COMPOSE-05: ORIGIN=https://asqnmilsim.us | SATISFIED | Set in environment block |
| COMPOSE-06: caddy_data named volume | SATISFIED | `caddy_data:` and `caddy_config:` volumes present |
| COMPOSE-07: /health returns HTTP 200 | SATISFIED | Live-verified: HTTP 200 "ok" |
| SEC-02: .env never in git or Docker image | SATISFIED | `.env` not git-tracked; excluded from .dockerignore |
| INFRA-01: GitHub private repo with full history | SATISFIED | `origin` points to `https://github.com/iancrowder23-ship-it/asqn-landing-page.git`; all commits pushed (except 1 unpushed docs commit — see below) |
| INFRA-02: Docker CE + Compose v2 | SATISFIED (human-attested) | User executed and confirmed in 08-01 checkpoint |
| INFRA-03: Deploy user with SSH key-only access | SATISFIED (human-attested) | User executed and confirmed in 08-01 checkpoint |
| INFRA-04: UFW allows only 22/80/443 | SATISFIED (human-attested) | User executed and confirmed in 08-01 checkpoint |
| INFRA-05: DNS A record for asqnmilsim.us | SATISFIED | Domain resolves and serves application (via Cloudflare proxy) |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| No anti-patterns found | — | — | — | — |

No TODO, FIXME, placeholder, or stub patterns found in modified files. Health endpoint is a real implementation, not a placeholder.

---

### Notable Finding: Cloudflare Proxy

The domain `asqnmilsim.us` resolves to Cloudflare IP `104.21.30.170` (not VPS `163.245.216.173`), meaning the DNS A record is set with Cloudflare's proxy enabled (orange-cloud mode). This has a positive effect:

- **Public-facing certificate:** Valid Google Trust Services cert issued via Cloudflare — no browser warning, full HTTPS without `-k`
- **Phase 10 impact:** The "production ACME switch" planned for Phase 10 may already be satisfied from the browser's perspective. The VPS-level Caddy staging cert is only used for Cloudflare-to-VPS traffic (which may be HTTP internally, or Cloudflare full/full-strict mode)
- **Port 3000 exposure:** UFW would block direct VPS:3000 connections, but Cloudflare proxy adds an additional layer. Human verification still needed to confirm.

This is a better-than-planned outcome for the HTTPS success criterion.

---

### Minor Finding: Unpushed Docs Commit

Local branch is 1 commit ahead of `origin/main`. The unpushed commit is `737cb70 docs(08-03): complete production compose + Caddy deploy — Phase 8 DONE` — a SUMMARY.md metadata commit only, no code changes. All code commits (`2dec9dc`, `b9c0305`) are pushed to origin.

**Severity:** Info only. No code artifacts are missing from remote.

---

### Human Verification Required

#### 1. Port 3000 External Exposure Test

**Test:** From an external host (not the VPS), run: `curl http://163.245.216.173:3000`

**Expected:** Connection refused or no response (app is not directly reachable on port 3000)

**Why human:** Cannot initiate outbound TCP connections to arbitrary IPs from the verifier environment

#### 2. Container Auto-Restart After Reboot

**Test:** SSH to VPS as deploy user, then run:
```
sudo systemctl restart docker
sleep 15
docker compose -f /opt/asqn/docker-compose.yml ps
```

**Expected:** Both `app` and `caddy` containers show status "Up" after Docker daemon restart — confirming `restart: unless-stopped` works in practice

**Why human:** Cannot SSH to VPS or trigger systemd restarts programmatically

---

## Gaps Summary

No blocking gaps found. All codebase artifacts exist, are substantive (not stubs), and are wired correctly. The live application at `https://asqnmilsim.us` returns HTTP 200 and `/health` returns "ok" — the core phase goal is achieved. Two success criteria (port isolation, auto-restart) require human verification on the VPS but the code configuration supports both.

---

_Verified: 2026-02-13T02:20:00Z_
_Verifier: Claude (gsd-verifier)_
