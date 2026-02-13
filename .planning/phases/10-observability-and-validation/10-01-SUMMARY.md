---
phase: 10-observability-and-validation
plan: 01
subsystem: infra
tags: [discord, webhook, caddy, letsencrypt, ci-cd, github-actions, tls, production]

# Dependency graph
requires:
  - phase: 09.1-discord-auth-gate
    provides: Discord OAuth gate — production VPS running with staging TLS cert
  - phase: 09-ci-cd-pipeline
    provides: GitHub Actions deploy pipeline, GHCR image, VPS docker-compose setup
provides:
  - Discord deploy notifications (success + failure embeds) via sarisia/actions-status-discord
  - Production Let's Encrypt TLS certificate (Google Trust Services WE1, not staging)
  - Force-recreated Caddy container picking up updated Caddyfile on each deploy
  - Full 7-point production validation checklist passed
affects: [future phases, v1.1 milestone, ongoing operations]

# Tech tracking
tech-stack:
  added: [sarisia/actions-status-discord@v1]
  patterns:
    - "GitHub Actions notify job with if:always() runs regardless of upstream job failures"
    - "deploy job uses docker compose up -d --force-recreate to restart all containers on each deploy"
    - "$env/dynamic/private for secrets that must not be inlined at build time"

key-files:
  created: []
  modified:
    - .github/workflows/deploy.yml
    - Caddyfile
    - src/lib/supabase/admin.ts

key-decisions:
  - "sarisia/actions-status-discord@v1 chosen for Discord notifications — JS action, fast startup, ecosystem standard"
  - "notify job status set to needs.deploy.result (not needs.build.result) to reflect actual deploy outcome"
  - "force-recreate replaces --no-deps app — ensures Caddy always restarts and reads new Caddyfile"
  - "$env/dynamic/private required for SUPABASE_SERVICE_ROLE_KEY — $env/static/private inlines at build time (build fails if key absent at build)"
  - "Production ACME by removing global options block from Caddyfile — Caddy defaults to production LE when no acme_ca override set"

patterns-established:
  - "Pipeline: 3-job pattern — build → deploy → notify (notify always runs, reflects deploy result)"
  - "Secrets in runtime .env only — never as build ARGs; use $env/dynamic/private for server-side runtime secrets"

# Metrics
duration: ~2h (including user manual actions + pipeline wait time)
completed: 2026-02-12
---

# Phase 10 Plan 01: Observability and Validation Summary

**Discord deploy notifications via sarisia/actions-status-discord + production Let's Encrypt TLS cert + 7-point production validation all passing, closing v1.1 milestone**

## Performance

- **Duration:** ~2h (includes user manual steps: Discord webhook creation, GitHub secret, pipeline wait)
- **Started:** 2026-02-12
- **Completed:** 2026-02-12
- **Tasks:** 4 (2 auto, 2 checkpoint:human)
- **Files modified:** 3

## Accomplishments

- Discord #ops channel receives deploy embeds for both success and failure, with commit message, author, and link to the Actions run
- Production Let's Encrypt certificate obtained (Google Trust Services WE1, expires May 2026) — no longer staging/fake
- All 7 production validation checks pass: ORIGIN, port 3000 blocked, production cert, caddy_data volume persists, no secrets in image history, deploy user is not root, HTTPS/2 200

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Discord webhook notify job + production ACME switch + force-recreate Caddy** - `b852579` (feat)
2. **Task 2: Create Discord webhook and add DISCORD_WEBHOOK secret** - N/A (user manual action — no code commit)
3. **Task 3: Push to main and wait for pipeline** - `2d08de5` (fix — auto-fix of import deviation during push)
4. **Task 4: Verify Discord notification + production validation checklist** - N/A (user verified "all pass")

**Plan metadata:** (this commit — docs)

## Files Created/Modified

- `.github/workflows/deploy.yml` - Added `notify` job (sarisia/actions-status-discord@v1, if:always(), needs:[build,deploy]); changed deploy SSH script to `docker compose up -d --force-recreate`
- `Caddyfile` - Removed global options block (staging ACME override); now contains only the site block with reverse_proxy
- `src/lib/supabase/admin.ts` - Changed `SUPABASE_SERVICE_ROLE_KEY` import from `$env/static/private` to `$env/dynamic/private` (auto-fix deviation)

## Decisions Made

- Used `sarisia/actions-status-discord@v1` over alternatives — JavaScript action with minimal overhead, widely used in ecosystem, no Docker pull delay
- `notify` job `status` set to `${{ needs.deploy.result }}` not the notify job's own status — correctly reflects whether the deploy succeeded or failed, not whether the notification itself succeeded
- `--force-recreate` replaces `--no-deps app` so Caddy always restarts on deploy and picks up Caddyfile changes without manual intervention
- Production ACME enabled by simply removing the global options block — Caddy defaults to production Let's Encrypt when no `acme_ca` override is present
- `$env/dynamic/private` required for `SUPABASE_SERVICE_ROLE_KEY` because `$env/static/private` inlines values at build time; the key is intentionally absent from the build environment (runtime-only secret)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed $env/static/private import causing build failure for SUPABASE_SERVICE_ROLE_KEY**
- **Found during:** Task 3 (Push to main and wait for pipeline)
- **Issue:** `src/lib/supabase/admin.ts` imported `SUPABASE_SERVICE_ROLE_KEY` from `$env/static/private`, which SvelteKit inlines at build time. The key is intentionally absent at build (runtime-only secret), causing the CI build job to fail with a missing environment variable error.
- **Fix:** Changed import to `$env/dynamic/private` so the key is read at runtime from the server environment, not inlined during the Docker build
- **Files modified:** `src/lib/supabase/admin.ts`
- **Verification:** Second pipeline run completed — all 3 jobs (build, deploy, notify) passed; Discord received both a failure embed (first run) and a success embed (second run)
- **Committed in:** `2d08de5` (fix commit, separate from Task 1 feat commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug)
**Impact on plan:** Auto-fix was necessary for the pipeline to succeed. The deviation actually demonstrated the notify job working correctly — it sent a failure notification for the first run and a success notification for the second, confirming both code paths function.

## Issues Encountered

- First pipeline push triggered a build failure due to the `$env/static/private` import on `SUPABASE_SERVICE_ROLE_KEY`. The failure was caught by the new Discord notify job (which sent a failure embed), giving confidence the notification system works end-to-end. Fixed and re-pushed in the same session.

## User Setup Required

Two manual steps were required during execution:

1. **Create Discord webhook** — Discord Server Settings → Integrations → Webhooks → New Webhook ("ASQN Deploy Bot"), select ops channel, copy URL
2. **Add GitHub Actions secret** — `DISCORD_WEBHOOK` secret added at https://github.com/iancrowder23-ship-it/asqn-landing-page/settings/secrets/actions

Both steps completed successfully. No ongoing manual setup required.

## Next Phase Readiness

- v1.1 milestone is complete — all production validation checks pass
- Site is live at https://asqnmilsim.us with production TLS, Discord auth gate, and observable deploy pipeline
- No immediate blockers
- Pending todo noted in STATE.md: add a login button to the public home page

---
*Phase: 10-observability-and-validation*
*Completed: 2026-02-12*
