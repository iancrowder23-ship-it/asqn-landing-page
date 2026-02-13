# Phase 10: Observability and Validation - Research

**Researched:** 2026-02-12
**Domain:** CI/CD observability (Discord webhooks), TLS certificate management (Caddy/ACME), production security validation
**Confidence:** HIGH

## Summary

Phase 10 closes the v1.1 milestone with two deliverables: (1) Discord webhook notifications on deploy success/failure in the GitHub Actions workflow, and (2) a comprehensive end-to-end validation that every known production pitfall is resolved, including switching from Let's Encrypt staging to production ACME CA.

The Discord notification is straightforward -- the `sarisia/actions-status-discord@v1` action is the ecosystem standard, runs as a JavaScript action (fast, cross-platform), and requires only a webhook URL secret plus `if: always()` to fire on both success and failure. The ACME switch is also simple: remove the `acme_ca` global option from the Caddyfile and restart Caddy. Caddy stores staging and production certificates in separate directories within `caddy_data`, so the staging certs do not interfere with production cert issuance. The validation checklist is a set of concrete shell commands that can be run from the local machine against the VPS.

**Primary recommendation:** Add a `notify` job to `deploy.yml` using `sarisia/actions-status-discord@v1` with `if: always()`, update the Caddyfile to remove `acme_ca` staging line, then run the full production validation checklist from the local machine.

## Standard Stack

### Core

| Library/Tool | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `sarisia/actions-status-discord` | v1 (1.16.0) | Post GitHub Actions status to Discord as embed | 1500+ stars, JavaScript action (fast), OS-agnostic, auto-detects job status, supports customization |
| Caddy | 2-alpine (Docker) | Reverse proxy + auto-HTTPS | Already deployed in docker-compose.yml |
| Let's Encrypt Production ACME | `acme-v02.api.letsencrypt.org` | Trusted TLS certificates | Default Caddy CA when no `acme_ca` override is set |

### Supporting

| Tool | Purpose | When to Use |
|------|---------|-------------|
| `curl` | Verify HTTPS cert, test port exposure | Validation checklist |
| `openssl s_client` | Inspect certificate issuer chain | Verify production (not staging) cert |
| `docker history --no-trunc` | Audit image layers for leaked secrets | Validation checklist |
| `ssh` | Remote VPS commands | Validation checks against running containers |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `sarisia/actions-status-discord@v1` | Raw `curl` to Discord webhook | curl works but requires manual JSON payload construction, no auto status detection, no embed formatting, more error-prone |
| `sarisia/actions-status-discord@v1` | `Ilshidur/action-discord` | Less maintained, Docker-based (slower), fewer features |
| `sarisia/actions-status-discord@v1` | `DiscordHooks/github-actions-discord-webhook` | Docker-based, less configurable |

**Installation:** No npm packages needed. GitHub Action is referenced in workflow YAML. Discord webhook URL stored as GitHub Actions secret.

## Architecture Patterns

### Current deploy.yml Structure (for reference)

```
jobs:
  build:        # Build Docker image, push to GHCR
    steps: checkout -> login -> metadata -> build+push

  deploy:       # SSH to VPS, pull image, restart
    needs: build
    steps: checkout -> scp compose files -> ssh deploy
```

### Pattern 1: Notification Job (Recommended)

**What:** Add a third `notify` job that depends on both `build` and `deploy`, runs `if: always()`, and posts status to Discord.

**When to use:** When you need notifications regardless of which job failed.

**Example:**

```yaml
# Source: https://github.com/marketplace/actions/actions-status-discord
  notify:
    runs-on: ubuntu-latest
    needs: [build, deploy]
    if: always()

    steps:
      - name: Notify Discord
        uses: sarisia/actions-status-discord@v1
        with:
          webhook: ${{ secrets.DISCORD_WEBHOOK }}
          status: ${{ needs.deploy.result == 'success' && 'Success' || 'Failure' }}
          title: "Deploy to asqnmilsim.us"
          description: |
            **Commit:** `${{ github.sha }}`
            **Branch:** `${{ github.ref_name }}`
            **Author:** ${{ github.actor }}
          color: ${{ needs.deploy.result == 'success' && '0x00FF00' || '0xFF0000' }}
          url: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}
```

**Key detail:** The `if: always()` on the job level ensures the notify job runs even if `build` or `deploy` failed or were cancelled. The `needs.deploy.result` expression checks the actual outcome.

### Pattern 2: Production Caddyfile (No Staging Override)

**What:** Remove the `acme_ca` global option so Caddy uses its default production ACME CA.

**Current Caddyfile:**
```
{
    acme_ca https://acme-staging-v02.api.letsencrypt.org/directory
}

asqnmilsim.us {
    reverse_proxy app:3000
}
```

**Production Caddyfile:**
```
asqnmilsim.us {
    reverse_proxy app:3000
}
```

That is the entire change -- remove the global options block. Caddy defaults to Let's Encrypt production CA.

### Anti-Patterns to Avoid

- **Putting notification in the deploy job itself:** If the deploy job fails, steps after the failure point don't run (unless each has `if: always()`). A separate job with `if: always()` is cleaner and more reliable.
- **Using `/github` suffix on Discord webhook URL:** The `/github` endpoint expects GitHub's native webhook format, not custom payloads. The actions-status-discord action sends its own embed format, so use the bare webhook URL.
- **Deleting the caddy_data volume when switching ACME CA:** Not needed. Staging and production certificates are stored in separate directories (`acme-staging-v02.api.letsencrypt.org-directory/` vs `acme-v02.api.letsencrypt.org-directory/`). Caddy will simply request a new production cert alongside the old staging cert data.
- **Hardcoding the Discord webhook URL in deploy.yml:** Always use `${{ secrets.DISCORD_WEBHOOK }}`. Webhook URLs grant unauthenticated post access to the channel.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Discord notification formatting | Custom curl with JSON embed payload | `sarisia/actions-status-discord@v1` | Handles status detection, color coding, GitHub context fields, error resilience (`nofail: true` default) |
| Job status aggregation | Custom `if:` expressions across multiple steps | Separate `notify` job with `needs: [build, deploy]` | GitHub Actions evaluates `needs.*.result` automatically |
| TLS certificate management | Manual certbot or acme.sh | Caddy's built-in ACME client | Already configured, automatic renewal, zero-downtime rotation |

## Common Pitfalls

### Pitfall 1: Notification Job Never Runs on Failure

**What goes wrong:** The `notify` job has `needs: [build, deploy]` but no `if: always()`. GitHub Actions skips dependent jobs when upstream jobs fail.
**Why it happens:** Default behavior for `needs` is to only run if all dependencies succeeded.
**How to avoid:** Always add `if: always()` at the job level for notification jobs.
**Warning signs:** Notifications only arrive on success, never on failure.

### Pitfall 2: Let's Encrypt Rate Limits After Switching to Production

**What goes wrong:** Rapid redeployments or Caddy restarts cause multiple certificate requests, hitting the 5 duplicate certificates per domain per 7 days limit.
**Why it happens:** If `caddy_data` volume is accidentally deleted or not persisted, Caddy requests a new cert on every start.
**How to avoid:** The `caddy_data` named volume is already configured in docker-compose.yml. Never `docker compose down -v` (which removes volumes). Verify the volume persists with `docker volume inspect asqn_caddy_data`.
**Warning signs:** Caddy logs showing "too many certificates already issued" or HTTPS errors after redeploy.

### Pitfall 3: Staging Certificate Still Served After ACME Switch

**What goes wrong:** After removing `acme_ca` from Caddyfile, the site still shows a staging (untrusted) certificate.
**Why it happens:** Caddy caches the previously-obtained staging certificate and may continue serving it until it expires or Caddy is properly restarted.
**How to avoid:** After updating the Caddyfile, restart Caddy fully: `docker compose restart caddy` or `docker compose up -d --force-recreate caddy`. Caddy stores staging and production certs in separate directory trees, so it will recognize it needs a new production cert.
**Warning signs:** `openssl s_client` shows issuer containing "(STAGING)" or "Fake LE".

### Pitfall 4: Discord Webhook URL Leaked in Workflow Logs

**What goes wrong:** The webhook URL appears in GitHub Actions logs, allowing anyone with repo access to spam the Discord channel.
**Why it happens:** Using `echo` to debug or accidentally logging the secret.
**How to avoid:** GitHub Actions automatically masks secrets referenced as `${{ secrets.* }}`. The `sarisia/actions-status-discord` action does not log the webhook URL. Never use `echo ${{ secrets.DISCORD_WEBHOOK }}` in a run step.

### Pitfall 5: Build Args Visible in Docker Image History

**What goes wrong:** `docker history --no-trunc` reveals `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_PUBLISHABLE_KEY` in image layers.
**Why it happens:** Docker `ARG` values used during build are recorded in image metadata.
**How to avoid:** This is acceptable for `PUBLIC_*` variables (they are public by design -- embedded in client-side JavaScript). The critical check is that `SUPABASE_SERVICE_ROLE_KEY` does NOT appear, since it is only in the VPS `.env` file and passed at runtime via `env_file`.
**Warning signs:** Any non-`PUBLIC_*` secret appearing in `docker history` output.

## Code Examples

### Discord Webhook Notification Job (Complete)

```yaml
# Source: https://github.com/marketplace/actions/actions-status-discord
# Add as third job in deploy.yml

  notify:
    runs-on: ubuntu-latest
    needs: [build, deploy]
    if: always()

    steps:
      - name: Notify Discord
        uses: sarisia/actions-status-discord@v1
        with:
          webhook: ${{ secrets.DISCORD_WEBHOOK }}
          status: ${{ needs.deploy.result }}
          title: "Deploy to asqnmilsim.us"
          description: |
            **Commit:** `${{ github.event.head_commit.message }}`
            **Author:** ${{ github.actor }}
```

**Notes:**
- `status` defaults to `${{ job.status }}` but since this is a separate job that always succeeds, use `needs.deploy.result` to reflect the actual deploy outcome.
- If `build` fails, `deploy` is skipped (result = `skipped`), and `notify` will report that.
- The action's `nofail` default is `true`, so a Discord API error won't fail the workflow.

### Production Caddyfile (After Removing Staging)

```
asqnmilsim.us {
    reverse_proxy app:3000
}
```

### Validation Commands

```bash
# 1. ORIGIN is https://asqnmilsim.us
ssh -i ~/.ssh/asqn_deploy deploy@163.245.216.173 \
  "docker compose -f /opt/asqn/docker-compose.yml exec app printenv ORIGIN"
# Expected: https://asqnmilsim.us

# 2. Port 3000 NOT reachable externally
curl -s --connect-timeout 5 http://163.245.216.173:3000 || echo "PASS: Connection refused"
# Expected: Connection refused / timeout

# 3. HTTPS certificate is valid (non-staging)
echo | openssl s_client -connect asqnmilsim.us:443 -servername asqnmilsim.us 2>/dev/null | openssl x509 -noout -issuer
# Expected: issuer containing "Let's Encrypt" (NOT "STAGING" or "Fake")

# 4. caddy_data volume persists across restarts
ssh -i ~/.ssh/asqn_deploy deploy@163.245.216.173 \
  "docker volume inspect asqn_caddy_data --format '{{.Name}}'"
# Expected: asqn_caddy_data

# 5. No secrets in image history
ssh -i ~/.ssh/asqn_deploy deploy@163.245.216.173 \
  "docker history --no-trunc ghcr.io/iancrowder23-ship-it/asqn-landing-page:latest" \
  | grep -iE 'SERVICE_ROLE|service_role|PRIVATE_KEY|private_key' || echo "PASS: No secrets found"
# Expected: No matches (only PASS line)

# 6. Deploy user is not root
ssh -i ~/.ssh/asqn_deploy deploy@163.245.216.173 "whoami"
# Expected: deploy (not root)

# 7. HTTPS responds with 200
curl -sI https://asqnmilsim.us | head -1
# Expected: HTTP/2 200

# 8. Discord webhook fires (manual trigger test)
# Push a trivial commit to main and verify Discord notification arrives
```

### Creating Discord Webhook URL

```
Discord Server Settings -> Integrations -> Webhooks -> New Webhook
  - Name: "ASQN Deploy Bot" (or similar)
  - Channel: Select the notifications/ops channel
  - Copy Webhook URL
  - Add as GitHub Actions secret: DISCORD_WEBHOOK
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Docker-based Discord actions | JavaScript-based `sarisia/actions-status-discord` | 2022+ | 2-3x faster startup, no Docker pull overhead |
| Manual certbot + cron | Caddy built-in ACME with auto-renewal | Caddy v2 (2020) | Zero-maintenance TLS, automatic OCSP stapling |
| Let's Encrypt 50 certs/domain/week | Same limit, but renewal exemptions via ARI | 2024+ | Renewals no longer count against rate limits |

**Deprecated/outdated:**
- `CADDYPATH` environment variable: Replaced by XDG conventions in Caddy v2
- Docker-based GitHub Actions for Discord notifications: JavaScript actions are faster and more reliable

## Open Questions

1. **Discord Channel Selection**
   - What we know: The unit has a Discord server (guild 1464714214819102964)
   - What's unclear: Which specific channel should receive deploy notifications
   - Recommendation: User creates webhook in their preferred ops/admin channel and adds the URL as `DISCORD_WEBHOOK` secret

2. **Volume Name Prefix**
   - What we know: Docker Compose prefixes volume names with the project directory name
   - What's unclear: Whether the volume is named `asqn_caddy_data` or `caddy_data` depends on the compose project name
   - Recommendation: Verify with `docker volume ls` on VPS during validation

## Sources

### Primary (HIGH confidence)
- GitHub Actions `sarisia/actions-status-discord` marketplace page -- full API, inputs, examples
- Caddy official docs (`caddyserver.com/docs/automatic-https`) -- ACME behavior, staging/production switching
- Caddy official docs (`caddyserver.com/docs/conventions`) -- data directory structure
- Let's Encrypt rate limits (`letsencrypt.org/docs/rate-limits/`) -- 50 certs/domain/week, 5 duplicate/week

### Secondary (MEDIUM confidence)
- Caddy Community forum (`caddy.community`) -- certificate storage paths, staging-to-production switching confirmed by maintainers
- CertMagic storage structure -- staging and production use separate CA-named directories within `certificates/`

### Tertiary (LOW confidence)
- None -- all key claims verified against official documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- `sarisia/actions-status-discord` is well-documented with clear API; Caddy ACME is official
- Architecture: HIGH -- deploy.yml structure is known, notification job pattern is well-established GitHub Actions pattern
- Pitfalls: HIGH -- rate limits documented by Let's Encrypt, cert storage verified via Caddy community, Docker history auditing well-documented
- Validation checklist: HIGH -- all commands are standard Unix/Docker tooling targeting known infrastructure

**Research date:** 2026-02-12
**Valid until:** 2026-03-12 (stable domain -- CI/CD patterns, Caddy ACME, and Discord webhooks change slowly)
