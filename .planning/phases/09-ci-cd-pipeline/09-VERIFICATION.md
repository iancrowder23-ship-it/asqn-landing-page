---
phase: 09-ci-cd-pipeline
verified: 2026-02-12T00:00:00Z
status: passed
score: 5/5 must-haves verified
re_verification: null
gaps: []
human_verification:
  - test: "Second push to main completes build job faster than the first"
    expected: "Build job duration noticeably shorter on second run due to GHA layer cache hitting"
    why_human: "Cannot measure runtime performance statically; requires an actual second push and comparing GitHub Actions run durations"
---

# Phase 9: CI/CD Pipeline Verification Report

**Phase Goal:** Pushing a commit to main triggers a two-job GitHub Actions workflow that builds the Docker image with PUBLIC_* build args, pushes it to GHCR with SHA and latest tags, and deploys to the VPS via SSH — with no secrets baked into the image.
**Verified:** 2026-02-12T00:00:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #   | Truth                                                                                                                         | Status     | Evidence                                                                                                                         |
| --- | ----------------------------------------------------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Pushing to main triggers the GitHub Actions workflow                                                                          | VERIFIED | `on: push: branches: [main]` in deploy.yml line 4-6; git commits b1ad7de + a8b3efa pushed to main triggered run 21973748681    |
| 2   | Build job produces GHCR image with SHA tag and latest tag                                                                     | VERIFIED | `docker/metadata-action@v5` with `type=sha` + `type=raw,value=latest,enable={{is_default_branch}}`; SUMMARY 09-03 confirms sha-97e8c47 + latest pushed |
| 3   | Deploy job SSHes to VPS and restarts app from GHCR image                                                                      | VERIFIED | `appleboy/scp-action@v1` + `appleboy/ssh-action@v1` with `needs: build`; script runs `docker compose pull app` + `docker compose up -d --no-deps app`; SUMMARY confirms deploy job completed (14s) |
| 4   | No runtime secrets baked into Docker image layers                                                                             | VERIFIED | Dockerfile uses multi-stage build: PUBLIC_* ARGs only in builder stage; runner stage copies only `build/` output; no SUPABASE_SERVICE_ROLE_KEY in Dockerfile or deploy.yml build-args; SUMMARY 09-03 confirms CLEAN check |
| 5   | Layer caching configured for faster repeat builds                                                                             | VERIFIED | `cache-from: type=gha` and `cache-to: type=gha,mode=max` at deploy.yml lines 49-50                                             |

**Score:** 5/5 truths verified

---

### Required Artifacts

| Artifact                              | Expected                                           | Status   | Details                                                                                      |
| ------------------------------------- | -------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------- |
| `.github/workflows/deploy.yml`        | Two-job GitHub Actions workflow (build + deploy)   | VERIFIED | File exists, 84 lines, contains both `build` and `deploy` jobs; commit a8b3efa              |
| `docker-compose.yml`                  | Production compose with `image:` instead of build: | VERIFIED | `image: ghcr.io/iancrowder23-ship-it/asqn-landing-page:latest` at line 3; no `build:` block |
| `Dockerfile`                          | Multi-stage build; PUBLIC_* args in builder only   | VERIFIED | Builder stage has ARG/ENV for PUBLIC_*; runner stage has none; no service_role key           |
| `docker-compose.dev.yml`              | Unchanged — still uses `build:` for local dev      | VERIFIED | `build: .` at line 3; untouched by Phase 9                                                  |
| GitHub Secrets (7 secrets on repo)    | SSH_HOST, SSH_USER, SSH_PRIVATE_KEY, GHCR_PAT, GHCR_USERNAME, PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY | VERIFIED | SUMMARY 09-01 confirms all 7 set via `gh secret set`; cannot verify values directly (secrets are write-only) |

---

### Key Link Verification

| From                              | To                              | Via                                        | Status   | Details                                                                 |
| --------------------------------- | ------------------------------- | ------------------------------------------ | -------- | ----------------------------------------------------------------------- |
| `on: push: branches: [main]`      | GitHub Actions workflow trigger | git push event                             | VERIFIED | Trigger confirmed in deploy.yml lines 4-6; run 21973748681 confirmed   |
| `docker/build-push-action@v6`     | GHCR registry                   | `push: true` + `tags` from metadata-action | VERIFIED | Lines 40-50; SHA + latest tags generated and confirmed in SUMMARY 09-03 |
| `PUBLIC_*` secrets as build-args  | Vite compile-time bake          | `build-args:` in build-push-action         | VERIFIED | Lines 46-48; secrets referenced as `${{ secrets.PUBLIC_* }}`            |
| `appleboy/scp-action@v1`          | VPS /opt/asqn/                  | SSH with SSH_PRIVATE_KEY secret            | VERIFIED | Lines 61-67; copies docker-compose.yml + Caddyfile                      |
| `appleboy/ssh-action@v1`          | VPS app container restart       | SSH + docker compose pull/up               | VERIFIED | Lines 69-83; GHCR_PAT/GHCR_USERNAME passed via `envs:` (not inline)    |
| `docker-compose.yml image:`       | GHCR-built image                | `docker compose pull app` reads image:     | VERIFIED | docker-compose.yml line 3: `image: ghcr.io/iancrowder23-ship-it/asqn-landing-page:latest` |
| `cache-from/cache-to: type=gha`   | GHA cache backend               | GitHub Actions cache service               | VERIFIED | Lines 49-50 in deploy.yml; mode=max ensures all layers cached           |

---

### Requirements Coverage (from ROADMAP.md success criteria)

| Requirement                                                                                                  | Status     | Notes                                                                              |
| ------------------------------------------------------------------------------------------------------------ | ---------- | ---------------------------------------------------------------------------------- |
| 1. Pushing a commit to main triggers the workflow within seconds                                             | SATISFIED  | Trigger wired; run 21973748681 confirmed by SUMMARY 09-03                          |
| 2. GHCR image tagged SHA + latest appears after build job                                                    | SATISFIED  | sha-97e8c47 + latest confirmed in SUMMARY 09-03                                   |
| 3. VPS serves code from triggering commit within minutes of push                                             | SATISFIED  | Deploy job (14s) confirmed; /health returns ok confirmed in SUMMARY 09-03         |
| 4. `docker history --no-trunc` shows no service role key or other runtime secrets in layers                  | SATISFIED  | Dockerfile has no SUPABASE_SERVICE_ROLE_KEY; SUMMARY 09-03 confirms CLEAN check   |
| 5. Second push completes build job faster than first (layer cache active)                                    | NEEDS HUMAN | Cache config present in deploy.yml; cannot verify runtime performance statically   |

---

### Anti-Patterns Found

| File                                | Line | Pattern                                     | Severity | Impact                                              |
| ----------------------------------- | ---- | ------------------------------------------- | -------- | --------------------------------------------------- |
| `Dockerfile`                        | 8-9  | `ENV PUBLIC_SUPABASE_URL=...` in builder    | INFO     | These are PUBLIC client-side vars (non-sensitive); correctly scoped to builder stage only; not in runner image |

No blockers or warnings found. The single INFO entry is expected and correct behavior — PUBLIC_* vars are intentionally baked at build time (Vite requires them at compile time) and do not appear in the runner layer.

---

### Human Verification Required

#### 1. Layer Cache Speed Improvement on Second Push

**Test:** Push any commit to main, wait for the build job to complete, note the duration. Then push a second trivial commit (e.g., whitespace change) to main, wait for build job, compare durations.
**Expected:** Second build job completes faster (cache hit on node_modules and unchanged source layers). First run in SUMMARY 09-03 was 1m6s; a second run with warm cache should be under 30s for most layers.
**Why human:** Requires live GitHub Actions runs; cannot measure runtime performance from static file analysis.

---

### Gaps Summary

No gaps found. All five observable truths are verified by the actual codebase:

- `deploy.yml` exists with correct structure, triggers, job ordering, and caching config
- `docker-compose.yml` uses `image:` (not `build:`) pointing to the correct GHCR path
- `Dockerfile` uses multi-stage build; PUBLIC_* args only in builder; no runtime secrets anywhere
- `docker-compose.dev.yml` is untouched (still uses `build:` for local dev)
- SUMMARY 09-03 documents a confirmed end-to-end pipeline run (run 21973748681): build job (1m6s) + deploy job (14s) both succeeded, sha-97e8c47 + latest pushed, VPS serving from GHCR image, /health returns ok, no secrets in image history

The one item flagged for human verification (success criterion 5 — layer cache speed) is a runtime observable that requires an actual second push and cannot be verified statically. The cache configuration is correct and in place.

---

_Verified: 2026-02-12T00:00:00Z_
_Verifier: Claude (gsd-verifier)_
