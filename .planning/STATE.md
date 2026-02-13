# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-12)

**Core value:** A soldier's complete service record — from enlistment to current status — is accurate, accessible, and drives unit management decisions.
**Current focus:** v1.1 Production Deployment — CI/CD pipeline to VPS

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-02-12 — Milestone v1.1 started

## Performance Metrics

**v1.0 MVP:**
- Phases: 7
- Plans completed: 21
- Commits: 81 (35 feat)
- Lines of code: 7,247
- Timeline: 2 days (2026-02-10 → 2026-02-11)

## Accumulated Context

### Decisions

All v1.0 decisions logged in PROJECT.md Key Decisions table with outcomes.

### Pending Todos

None.

### Blockers/Concerns

- **Shell**: `NPM_CONFIG_PREFIX=/nonexistent` — all npm/npx commands need `env -u NPM_CONFIG_PREFIX` prefix
- Discord OAuth provider + Custom Access Token Hook require manual Supabase Dashboard configuration
- Awards reference table starts empty — must seed before use
- VPS provisioning requires SSH access to Interserver server
- DNS A record must be pointed to VPS IP before HTTPS can work

## Session Continuity

Last session: 2026-02-12
Stopped at: Milestone v1.1 initialized, defining requirements
Resume file: None
Next action: Define requirements → create roadmap
