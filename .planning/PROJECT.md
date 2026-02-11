# ASQN 1st SFOD — Unit Website & Personnel System

## What This Is

A website and personnel management system for ASQN 1st SFOD (Army Squadron, 1st Special Forces Operational Detachment — Delta Force), an Arma 3 milsim unit. The public-facing site serves as the unit's front door — recruiting, info, and identity. Behind login, the personnel system tracks every soldier's career: rank, assignments, qualifications, attendance, promotions, and service history. Discord is the unit's hub; the site extends that with structured record-keeping and a professional web presence.

## Core Value

A soldier's complete service record — from enlistment to current status — is accurate, accessible, and drives unit management decisions.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Public website with unit overview, about, leadership, events, enlistment, contact
- [ ] Discord OAuth authentication
- [ ] Soldier profiles with rank, callsign, MOS, status, unit assignment
- [ ] Service record tracking (promotions, awards, qualifications, assignments)
- [ ] Attendance tracking per event
- [ ] Event creation and management (operations, training, FTX)
- [ ] Promotion tracking (command decision, logged with date/reason)
- [ ] Awards and qualifications tracking (certs + courses)
- [ ] Notes/disciplinary records (leadership-only visibility)
- [ ] Role-based permissions (Admin, Command, NCO, Member)
- [ ] Enlistment application with review + interview workflow
- [ ] Roster views: card grid, hierarchical tree, sortable table
- [ ] Transfer orders with effective date and reason
- [ ] Member status tracking (Active, LOA, AWOL, Discharged/Retired)
- [ ] Admin dashboard with key metrics

### Out of Scope

- Real-time chat/messaging — Discord handles this
- Mobile app — web-first, responsive design covers mobile
- Points-based promotion system — command makes promotion decisions manually
- Video/media hosting — link to external platforms
- Multi-squadron support — building for Squadron A only
- Public full roster — public sees names/ranks only, full details behind login

## Context

**Unit:** ASQN 1st SFOD, Squadron A (Delta Force milsim)
**Game:** Arma 3
**Size:** Small (10-30 members)
**Communication:** Discord-centric; Discord OAuth is the login mechanism

**Unit Structure:**
- Squadron A
  - Assault Troop 1 (direct action)
  - Assault Troop 2 (direct action)
  - Recce/Sniper Troop (reconnaissance/sniper operations)

**Rank System:** US Army SF ranks including warrant officers (E-5 through O-6, WO1-CW5)

**MOS System:** Blend of real SF MOSs (18A, 18B, 18C, 18D, 18E, 18F, 18Z) and simplified game roles (Rifleman, Medic, Engineer, Comms, etc.)

**Events:** Operations (full missions with briefings), Training (drills, qualifications), FTX (extended multi-session exercises)

**Enlistment Flow:** Application submitted → Leadership reviews → Discord interview → Accept/Deny

**Roster Display:**
- Card grid with rank insignia, callsign, photo
- Hierarchical tree view (Squadron → Troop → Soldier)
- Flat sortable/filterable table
- Toggle between views
- Ranks shown as full name + insignia image throughout

**Soldier Profile Pages:**
- Service record (promotion history, awards, qualifications timeline)
- Attendance stats (op count, attendance %, last active)
- Unit assignment history (past and current placements)
- Combat record (missions participated, roles held per op)

**Member Statuses:** Active, LOA (Leave of Absence), AWOL, Discharged/Retired

**Qualifications:** Both in-game skill certifications (Marksman, CLS, JTAC, Breacher) and course completions (BCT, AIT, leadership courses)

**Transfers:** Formal transfer orders with effective date and reason, logged in assignment history

**Public vs Private:**
- Public: Landing pages, leadership, events, enlistment form, partial roster (names + ranks)
- Private: Full profiles, attendance, personnel actions, admin tools

## Constraints

- **Auth**: Discord OAuth via Supabase Auth — members already live in Discord
- **Database**: Supabase PostgreSQL with row-level security
- **Hosting**: Docker on VPS — self-hosted, containerized deployment
- **Frontend**: Modern JS framework (open to alternatives to Next.js), custom components from scratch (no component library)
- **Styling**: Tactical/SOF dark aesthetic — black, dark gray, muted accents, covert ops feel
- **Data**: Starting fresh, no migration needed
- **Storage**: Supabase Storage for rank insignia, soldier photos, unit assets

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Discord OAuth only | Unit lives on Discord, simplifies auth, one identity | — Pending |
| Custom components (no UI library) | Full control over tactical/SOF aesthetic | — Pending |
| Docker deployment | Reproducible, portable, standard for VPS hosting | — Pending |
| Supabase for backend | Auth + DB + storage in one platform, RLS for permissions | — Pending |
| Formal transfer orders | Maintains proper service record history | — Pending |
| Command-driven promotions | Matches unit culture, no automated point systems | — Pending |
| Partial public roster | Recruiting visibility without exposing full personnel data | — Pending |

---
*Last updated: 2026-02-10 after initialization*
