---
phase: 08-vps-provisioning-and-production-compose
plan: 01
subsystem: infra
tags: [docker, ufw, ssh, vps, dns, linux, firewall, deploy-user]

# Dependency graph
requires: []
provides:
  - Docker CE + Compose v2 plugin installed and enabled at boot on VPS 163.245.216.173
  - UFW firewall active — only ports 22, 80, 443 allowed inbound
  - deploy user with SSH key-only access and docker group membership
  - Root SSH login disabled, password authentication disabled
  - /opt/asqn directory owned by deploy:deploy
  - DNS A record asqnmilsim.us -> 163.245.216.173 set (propagating)
affects:
  - 08-02-production-compose (deploy user + /opt/asqn + Docker required)
  - 08-03-caddy-tls (DNS propagation required for ACME)
  - all subsequent phases (VPS is the deployment target)

# Tech tracking
tech-stack:
  added: [docker-ce, docker-compose-plugin, ufw, openssh-server (hardened)]
  patterns:
    - Dedicated deploy user with docker group membership (no sudo needed for docker commands)
    - SSH key-only access via ~/.ssh/asqn_deploy (ed25519)
    - UFW default-deny incoming with explicit allow list

key-files:
  created: []
  modified:
    - /etc/ssh/sshd_config (VPS — PermitRootLogin no, PasswordAuthentication no)
    - /etc/apt/sources.list.d/docker.list (VPS — Docker CE apt repo)
    - /home/deploy/.ssh/authorized_keys (VPS — deploy user public key)

key-decisions:
  - "VPS IP is 163.245.216.173 (changed from initially quoted 69.169.109.166 — DNS A record updated accordingly)"
  - "Deploy key stored at ~/.ssh/asqn_deploy (ed25519) on local machine"
  - "Application directory /opt/asqn owned by deploy:deploy — no sudo needed for app deployments"
  - "UFW allows 443/udp in addition to 443/tcp for HTTP/3 support"

patterns-established:
  - "SSH pattern: key-only access via asqn_deploy key, root login disabled"
  - "Docker pattern: deploy user in docker group, no sudo required for docker commands"
  - "App directory pattern: /opt/asqn is the deployment root for all subsequent plans"

# Metrics
duration: 42min
completed: 2026-02-13
---

# Phase 8 Plan 01: VPS Provisioning Summary

**Docker CE + Compose v2 on hardened Ubuntu VPS (163.245.216.173) with UFW firewall, key-only deploy user, and /opt/asqn ready for production deployments**

## Performance

- **Duration:** ~42 min
- **Started:** 2026-02-13T01:05:54Z
- **Completed:** 2026-02-13T01:48:09Z
- **Tasks:** 2 (both human-action checkpoints)
- **Files modified:** 0 (all changes made directly on VPS via SSH)

## Accomplishments

- Docker CE + Compose v2 plugin installed from official Docker apt repo and enabled at boot (`systemctl enable docker`)
- UFW firewall configured with default-deny incoming, allowing only 22/80/443 (TCP) and 443 (UDP for HTTP/3)
- `deploy` user created with docker group membership, SSH key-only access via ed25519 key at `~/.ssh/asqn_deploy`
- SSH hardened: `PermitRootLogin no`, `PasswordAuthentication no`, `PubkeyAuthentication yes`
- `/opt/asqn` directory created and owned by `deploy:deploy` — ready for docker-compose deployments
- DNS A record `asqnmilsim.us` -> `163.245.216.173` set (propagating)

## Task Commits

This plan involved only human-action checkpoints (VPS provisioning via SSH). No code files were modified on the local repository. A single metadata commit documents completion.

**Plan metadata:** (see final commit below)

## Files Created/Modified

None — all changes were made directly on the VPS over SSH. Local repository is unchanged.

## Decisions Made

- VPS IP changed during execution from 69.169.109.166 to 163.245.216.173 — DNS A record was updated accordingly before hardening was complete
- `443/udp` was added to UFW rules (in addition to `443/tcp`) to support HTTP/3 via QUIC, which Caddy will use in Plan 08-03
- Deploy key named `asqn_deploy` (ed25519) rather than default `id_ed25519` to avoid conflicts with other SSH keys

## Deviations from Plan

None — plan executed exactly as written. The VPS IP change (69.169.109.166 -> 163.245.216.173) was a user-side change, not a deviation in the provisioning steps themselves.

## Issues Encountered

- Initial VPS IP (69.169.109.166) changed to 163.245.216.173 after DNS was initially set. User updated the DNS A record before SSH hardening was complete, so all final configuration reflects the correct IP.

## User Setup Required

None beyond what was performed during this plan. The following information is needed by subsequent plans:

| Item | Value |
|------|-------|
| VPS IP | `163.245.216.173` |
| SSH user | `deploy` |
| SSH key | `~/.ssh/asqn_deploy` |
| App directory | `/opt/asqn` |
| SSH command | `ssh -i ~/.ssh/asqn_deploy deploy@163.245.216.173` |

## Next Phase Readiness

- VPS is fully provisioned and ready for Plan 08-02 (production docker-compose files)
- DNS propagation for `asqnmilsim.us` is in progress — Caddy (Plan 08-03) will need it resolved
- No blockers for Plan 08-02

---
*Phase: 08-vps-provisioning-and-production-compose*
*Completed: 2026-02-13*

## Self-Check: PASSED

- FOUND: .planning/phases/08-vps-provisioning-and-production-compose/08-01-SUMMARY.md
- No local files to check — all VPS changes were applied directly over SSH
