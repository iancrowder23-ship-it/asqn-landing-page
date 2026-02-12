# Roadmap: ASQN 1st SFOD — Unit Website & Personnel System

## Overview

Build order is dictated by hard dependencies: auth and schema must be locked before any feature queries them, public pages are parallelizable after auth but independent of personnel data, and the service record's append-only model must be committed before any data exists. Six phases deliver a complete unit website with full PERSCOM-style personnel management — from a visitor landing page through operational event tracking and admin oversight.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** — Discord OAuth, 4-tier RBAC, database schema with RLS, append-only service record model
- [ ] **Phase 2: Public Site** — Landing, about, ORBAT, rank chart, leadership, events list, enlistment form, partial roster, contact
- [ ] **Phase 3: Soldier Profiles and Service Records** — Member profile pages, rank/insignia display, service record timeline, attendance stats, assignment history, combat record
- [ ] **Phase 4: Awards, Qualifications, and Roster** — Award and qualification granting, profile display, internal roster in card/tree/table views
- [ ] **Phase 5: Enlistment Pipeline and Personnel Actions** — Enlistment review queue with state machine, soldier auto-creation on acceptance, promotions, transfers, status changes, notes
- [ ] **Phase 6: Events, Attendance, and Admin Dashboard** — Event creation and management, attendance recording, service record linkage, admin metrics dashboard

## Phase Details

### Phase 1: Foundation
**Goal**: The project infrastructure is deployed and any authenticated member can log in via Discord with their role enforced at the database layer
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04
**Success Criteria** (what must be TRUE):
  1. A Discord user can visit the site, click login, authorize via Discord OAuth, and arrive at a session-gated page without entering a password
  2. Refreshing the browser after login keeps the session active without re-prompting
  3. A member with the Member role cannot access pages or query data designated Admin-only, even by calling Supabase directly with the anon key
  4. The Custom Access Token Hook injects the user's role into the JWT so RLS policies evaluate role without an additional database query
**Plans**: 4 plans

Plans:
- [x] 01-01-PLAN.md — SvelteKit + Tailwind v4 + adapter-node scaffolding and Docker infrastructure
- [x] 01-02-PLAN.md — Discord OAuth, hooks.server.ts session management, auth-gated route group
- [x] 01-03-PLAN.md — Database schema (soldiers, ranks, units, service_records, user_roles) with RLS and baseline policies
- [x] 01-04-PLAN.md — Custom Access Token Hook, role TypeScript helpers, end-to-end auth verification

---

### Phase 2: Public Site
**Goal**: Any visitor can discover the unit, understand its structure, and submit an enlistment application without creating an account
**Depends on**: Phase 1
**Requirements**: SITE-01, SITE-02, SITE-03, SITE-04, SITE-05, SITE-06, SITE-07, SITE-08, SITE-09
**Success Criteria** (what must be TRUE):
  1. A visitor can view the landing page with unit identity, overview, and a visible enlist call-to-action
  2. A visitor can navigate to About, Leadership, ORBAT, Rank Chart, Events, and Contact pages and see real content on each
  3. A visitor can submit a complete enlistment application form and receive confirmation that it was received
  4. A visitor can view a partial roster showing member names and ranks without logging in
  5. All public pages render with correct content when accessed directly by URL (SSR, not client-side-only)
**Plans**: 4 plans

Plans:
- [ ] 02-01-PLAN.md — Database migration (enlistments + events tables, anon RLS, rank seeds), dependency install, (site) route group + tactical theme, Landing/About/Contact pages
- [ ] 02-02-PLAN.md — Rank Chart, ORBAT (recursive tree), and Leadership pages with SSR load functions
- [ ] 02-03-PLAN.md — Enlistment application form with Superforms + Zod v4 validation and anon Supabase insert
- [ ] 02-04-PLAN.md — Public events list and partial roster pages with SSR load functions

---

### Phase 3: Soldier Profiles and Service Records
**Goal**: Any logged-in member can view their own and other members' complete profiles including full service history
**Depends on**: Phase 1
**Requirements**: PROF-01, PROF-02, PROF-03, PROF-04, PROF-05, SRVC-01, SRVC-02, SRVC-03, SRVC-04, SRVC-05
**Success Criteria** (what must be TRUE):
  1. A logged-in member can navigate to their own profile and see their rank (with full name and insignia image), callsign, MOS, status badge, and current unit assignment
  2. A member can view another member's profile page with the same information
  3. A member can view their own chronological service record showing promotions, awards, qualifications, and transfers in append-only order with timestamps and who performed each action
  4. A member's profile shows attendance statistics (operation count, attendance percentage, last active date)
  5. A member's profile shows their full unit assignment history and combat record (missions participated, roles held)
**Plans**: TBD

Plans:
- [ ] 03-01: Soldier profile page — rank, callsign, MOS, status, unit assignment with insignia images
- [ ] 03-02: Service record display component — append-only chronological log, timestamps, performed-by
- [ ] 03-03: Attendance stats and combat record display on profile

---

### Phase 4: Awards, Qualifications, and Roster
**Goal**: NCO and Command can grant awards and qualifications that appear on profiles, and any member can browse the full internal roster in multiple views
**Depends on**: Phase 3
**Requirements**: QUAL-01, QUAL-02, QUAL-03, QUAL-04, ROST-01, ROST-02, ROST-03, ROST-04
**Success Criteria** (what must be TRUE):
  1. An NCO-or-higher can navigate to a soldier's profile and grant a qualification (Marksman, CLS, JTAC, Breacher) or record a course completion — the entry immediately appears in the soldier's service record
  2. A Command-or-higher can award a decoration with citation text — the award immediately appears on the soldier's profile
  3. A logged-in member can view the roster as a card grid showing rank insignia and callsign for each member
  4. A member can switch to a hierarchical tree view showing Squadron > Troop > Soldier structure
  5. A member can switch to a sortable and filterable flat table view and toggle between all three roster views without a page reload
**Plans**: TBD

Plans:
- [ ] 04-01: Awards and qualifications granting UI — NCO+ and Command+ permission gates, service record writes
- [ ] 04-02: Awards and qualifications display components on profile
- [ ] 04-03: Internal roster — shared query driving card grid, hierarchical tree, and sortable table with view toggle

---

### Phase 5: Enlistment Pipeline and Personnel Actions
**Goal**: Command can move applicants from submission to soldier, and execute all formal personnel actions — promotions, transfers, status changes, and notes — that write to the append-only service record
**Depends on**: Phase 3
**Requirements**: ENLS-01, ENLS-02, ENLS-03, ENLS-04, ENLS-05, PERS-01, PERS-02, PERS-03, PERS-04, PERS-05
**Success Criteria** (what must be TRUE):
  1. A Command-or-higher can view a queue of pending enlistment applications and advance each through the states (Submitted > Under Review > Interview Scheduled > Accept/Deny) — invalid state jumps are rejected
  2. Accepting an application automatically creates a soldier profile for the applicant without manual data entry
  3. A Command-or-higher can promote or demote a soldier with a reason, and the action is logged to the service record with date and who performed it
  4. A Command-or-higher can issue a transfer order with effective date and reason, logged to assignment history
  5. An Admin can change a member's status (Active, LOA, AWOL, Discharged/Retired), and Command can add leadership-only notes visible only to NCO and above
**Plans**: TBD

Plans:
- [ ] 05-01: Enlistment review queue — state machine with DB-level transition enforcement
- [ ] 05-02: Application-to-soldier auto-creation flow on acceptance
- [ ] 05-03: Personnel actions — promote/demote, transfer orders, status changes with service record writes
- [ ] 05-04: Leadership-only notes and troop/position assignment

---

### Phase 6: Events, Attendance, and Admin Dashboard
**Goal**: NCO can create and manage unit events, record per-member attendance that feeds soldier profiles, and Command can view a live dashboard of unit health metrics
**Depends on**: Phase 5
**Requirements**: EVNT-01, EVNT-02, EVNT-03, EVNT-04, EVNT-05, ADMN-01, ADMN-02, ADMN-03
**Success Criteria** (what must be TRUE):
  1. An NCO-or-higher can create an event (operation, training, or FTX) with date, type, and details, and can edit or cancel it later
  2. An NCO can record per-member attendance for a completed event (present, excused, absent) — each attendance entry links to the soldier's service record and updates their profile stats
  3. A member can view the upcoming events list (already covered by Phase 2 public page; internal view now shows all event details)
  4. An Admin or Command member can view a dashboard showing member count, pending application count, and attendance trends
  5. The dashboard shows unit readiness state (count of Active vs. LOA vs. AWOL members) and a feed of recent personnel actions
**Plans**: TBD

Plans:
- [ ] 06-01: Event creation, editing, and cancellation with NCO+ permission gate
- [ ] 06-02: Attendance recording per event — present/excused/absent, service record linkage
- [ ] 06-03: Admin dashboard — metrics, unit readiness overview, recent personnel actions feed

---

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

Note: Phases 2 and 3 can overlap after Phase 1 — public site does not depend on personnel data.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 4/4 | ✓ Complete | 2026-02-11 |
| 2. Public Site | 0/4 | Planned | - |
| 3. Soldier Profiles and Service Records | 0/3 | Not started | - |
| 4. Awards, Qualifications, and Roster | 0/3 | Not started | - |
| 5. Enlistment Pipeline and Personnel Actions | 0/4 | Not started | - |
| 6. Events, Attendance, and Admin Dashboard | 0/3 | Not started | - |

---
*Roadmap created: 2026-02-10*
*Last updated: 2026-02-11 after Phase 2 planning*
