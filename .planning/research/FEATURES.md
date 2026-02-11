# Feature Research

**Domain:** Milsim unit website + PERSCOM-style personnel management system
**Project:** ASQN 1st SFOD (Arma 3 Delta Force unit)
**Researched:** 2026-02-10
**Confidence:** MEDIUM (WebSearch + live site fetches verified against PERSCOM.io official docs; Discord OAuth confirmed via official Discord developer docs)

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete or the unit seems unprofessional.

#### Public-Facing Site

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Landing page with unit identity | Every unit has one; establishes credibility | LOW | Hero section, unit name/crest, tagline |
| About / unit history section | Recruits need to understand who they're joining | LOW | Mission statement, history, values |
| Leadership roster (public) | Shows the unit isn't a one-man show | LOW | Photos optional; name + rank + role sufficient |
| Unit structure / ORBAT | Standard for any serious milsim unit; recruits check this before applying | MEDIUM | Visual hierarchy: Squadron → Troop → Team |
| Enlistment / application form | Primary recruit funnel; missing = no growth | MEDIUM | Customizable fields; submits to admin queue |
| Contact / Discord link | How recruits reach the unit outside the form | LOW | Discord invite link is minimum viable |
| Rank chart (public) | Recruits want to know what ranks exist and the path to advancement | LOW | Image or table; US Army SF ranks + WOs |
| Rules of conduct / SOP summary | Sets expectations before enlistment; filters unsuitable applicants | LOW | Static page; links to full docs if needed |

#### Personnel Management System (Member Portal)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Soldier profile page | The core of any PERSCOM-style system; the "military ID card" | MEDIUM | Rank, callsign, MOS, status, unit assignment, join date |
| Service record | Every milsim PERSCOM implementation has this; members check it constantly | MEDIUM | Chronological log: promotions, awards, qualifications, transfers, attendance notes |
| Rank display + promotion history | Rank is identity in milsim; must be visually prominent | LOW | Current rank badge/insignia + history of all promotions with dates |
| Awards / decorations display | Awards motivate engagement and retention | MEDIUM | Award image, name, citation, date awarded |
| Qualifications / certifications | In-game certs and course completions are core to SF theme | MEDIUM | List of qual names, issuing authority, date, optionally expiry |
| Unit assignment / billet | Members must know where they are in the org chart | LOW | Squadron → Troop → Team; links to ORBAT |
| Attendance record | Command needs this to enforce activity policies; members track their own LOA compliance | MEDIUM | Per-event attendance log: present / excused / absent |
| Member status display | Active / LOA / AWOL / Discharged / Retired must be visible | LOW | Status badge on profile; drives access permissions |
| Role-based access control | Admin / Command / NCO / Member roles are standard across all milsim systems | HIGH | Drives what each user can see and do across the whole system |
| Discord OAuth login | The unit is Discord-centric; password-based auth is friction | MEDIUM | OAuth2 via Discord developer portal; requires bot in guild for role sync |
| Enlistment workflow (apply → review → interview → accept/deny) | Standard gate for every serious unit | HIGH | State machine: Submitted → Under Review → Interview Scheduled → Decision |
| Member roster (internal) | Members need to see who else is in the unit | LOW | Table/card list of all active members with rank + callsign + MOS |
| Event / operation listing | Members need to know when ops are | MEDIUM | Upcoming events with date, type (Op/Training/FTX), required attendance flag |

---

### Differentiators (Competitive Advantage)

Features that set this unit's site apart from a generic milsim site. Not required, but raise perceived professionalism and engagement.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Formal transfer orders system | Replicates real SF admin paperwork; makes unit feel authentic | MEDIUM | Command creates transfer order; soldier record updated; printable/displayable document |
| Warrant officer rank track | Few milsim units model WOs correctly; this is SF-accurate | LOW | Separate rank progression path from enlisted; display correctly in profile |
| MOS assignment with SF 18-series flavor | Gives members a role identity beyond "rifleman"; specific to Delta Force theme | LOW | 18A, 18B, 18C, 18D, 18E, 18F + simplified game roles mapped to real MOS codes |
| Service record as timeline | PERSCOM shows service records as a list; a visual timeline gives a sense of career arc | MEDIUM | Requires frontend work; high value for long-serving members |
| Delta Force / SFOD-specific branding | Unit crest, patch imagery, authentic SF visual language throughout | LOW | Design work, not engineering; sets tone from first visit |
| After Action Report (AAR) submission | Members can submit AARs tied to specific operations; builds institutional memory | HIGH | Tied to events; rich text; linked to attendance record; searchable |
| Qualification expiry tracking | Some milsim units model cert re-qualification cycles; adds realism | MEDIUM | Expiry date on qual record; admin alert when approaching expiry |
| Discord role sync (bidirectional) | PERSCOM rank/status changes automatically update Discord roles | HIGH | Requires Discord bot with Manage Roles permission; most units do this manually |
| Command-driven promotion workflow | Prevents self-promotion or admin abuse; promotions require Command role approval with a reason | MEDIUM | Promotion request → Command review → approve/deny → service record auto-updated |
| Public-facing unit statistics | UNITAF shows 942 members, 1877 deployments; numbers build credibility | MEDIUM | Automated counters: total members, ops completed, unit age |

---

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create maintenance burden, scope creep, or harm the community.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| In-game stat tracking (K/D, hours in-game) | Gamification appeal; "see who's best" | Breeds toxicity; K/D is meaningless in milsim; requires mod/API integration that breaks with every Arma update | Track attendance and qualifications instead; reward participation, not performance metrics |
| Forum / full discussion board | "We need a place to talk" | Discord already exists and is where members live; a forum competes with Discord and dies within weeks | Use Discord channels; embed Discord widget on site at most |
| Real-time chat on website | Feels modern | Duplicates Discord; nobody uses it; WebSocket complexity with no payoff | Link to Discord |
| Public leaderboards | "Reward top performers" | Creates hierarchy beyond rank; demotivates lower-ranked members; inconsistent with military culture model | Awards and decorations system handles recognition without raw rankings |
| Custom mod repository / file hosting | "Host our mods here" | Large files, CDN costs, Steam Workshop already does this; maintenance nightmare | Link to Steam Workshop collection; use Arma 3 Sync or similar |
| Integrated voice/VOIP | "All-in-one platform" | Discord/TeamSpeak/ACRE2 already handled; duplicating this is weeks of work for zero benefit | Link to Discord; document ACRE2 setup in SOP |
| Complex finance/dues tracking | "Track member dues" | Milsim units are free; adding money creates legal and interpersonal complexity | Patreon or Ko-fi for voluntary support; keep it separate |
| Automated disciplinary tribunal system | "Make punishments formal" | Over-engineering governance for a 10-30 person game group; creates adversarial culture | Admin notes field on soldier profile; discharge workflow handles removal |

---

## Feature Dependencies

```
Discord OAuth Login
    └──required by──> Member Portal Access (all authenticated features)
                          └──required by──> Soldier Profile
                                               └──required by──> Service Record
                                               └──required by──> Awards Display
                                               └──required by──> Qualifications Display
                                               └──required by──> Attendance Record

Role-Based Access Control (RBAC)
    └──required by──> Enlistment Workflow (admin review actions)
    └──required by──> Promotion Workflow
    └──required by──> Transfer Orders
    └──required by──> Event Management (create/edit ops)

Enlistment Workflow
    └──required by──> Soldier Profile (profile created on acceptance)
    └──enhances──>    Discord Role Sync (grant Member role on acceptance)

Event / Operation System
    └──required by──> Attendance Record (attendance tied to specific events)
    └──enhances──>    AAR Submission (AARs tied to events)

Soldier Profile
    └──required by──> Member Roster (roster is a list of profiles)
    └──required by──> Transfer Orders (source/destination unit)
    └──required by──> Command Promotion Workflow

Discord Role Sync
    └──requires──>   Discord OAuth Login
    └──requires──>   Discord Bot (Manage Roles permission in guild)
    └──enhances──>   RBAC (Discord roles can mirror site roles)

Public ORBAT
    └──enhances──>   Unit Assignment on profile (links from profile to ORBAT node)
    └──requires──>   Unit/Troop/Team data model
```

### Dependency Notes

- **Discord OAuth Login is foundational**: All authenticated member-facing features depend on it. Build this first.
- **RBAC must precede workflow features**: Enlistment review, promotion approval, and transfer orders all require that roles exist and are enforced.
- **Soldier Profile must exist before service record entries can be created**: The service record is a child entity of the profile.
- **Event system must exist before attendance can be tracked**: Attendance records reference specific events; standalone attendance tracking without events is meaningless.
- **Discord Role Sync requires a Discord bot**: The OAuth2 flow alone cannot read or write Discord roles — a bot with the `guilds.members.read` scope and `Manage Roles` permission must be in the guild. This is a common implementation gotcha.
- **AAR system enhances but does not require the event system**: However, without event linkage, AARs are just freeform documents with no operational context. Build event system before AAR.

---

## MVP Definition

### Launch With (v1)

Minimum viable product — what a recruiter sees when they find the unit, and what a new member needs on day one.

**Public Site:**
- [ ] Landing page with unit identity (Delta Force / 1st SFOD branding) — first impression for recruits
- [ ] Unit structure / ORBAT — answers "what is this unit?" before applying
- [ ] Rank chart — answers "what ranks exist?" before applying
- [ ] Enlistment application form — the primary recruit funnel; without this, the site is read-only
- [ ] Leadership page — establishes command legitimacy
- [ ] Discord link / contact — alternate path for questions

**Member Portal:**
- [ ] Discord OAuth login — no password friction; unit is already Discord-centric
- [ ] Soldier profile (rank, callsign, MOS, status, unit assignment) — the "military ID"
- [ ] Service record with promotion + award entries — core PERSCOM functionality
- [ ] Awards display on profile — immediate gratification for decorating new members
- [ ] Member roster (internal) — members need to know their squadmates
- [ ] Role-based access control (Admin / Command / NCO / Member) — required before any admin actions
- [ ] Enlistment workflow (Submitted → Review → Interview → Accept/Deny) — closes the loop from the public form

### Add After Validation (v1.x)

Features to add once core is working and the unit has its first cohort of members using the system.

- [ ] Qualifications / certifications tracking — trigger: unit starts running in-game qualification courses
- [ ] Event / operation management — trigger: need to track attendance formally
- [ ] Attendance record on soldier profile — requires event system to be meaningful
- [ ] Transfer orders system — trigger: unit grows large enough to have inter-troop transfers
- [ ] Command-driven promotion workflow — trigger: enough members that ad-hoc promotions become chaotic
- [ ] Public unit statistics counter — trigger: unit has enough numbers to make it impressive

### Future Consideration (v2+)

Features to defer until the unit is established and the site is proven.

- [ ] Discord role sync (bidirectional) — significant complexity; Discord bot + webhook infrastructure; worth building once the unit is stable and roles are settled
- [ ] After Action Report submission system — requires mature event system; high editorial overhead for a small unit
- [ ] Service record as visual timeline — polish feature; the tabular list serves fine at small scale
- [ ] Qualification expiry tracking — only matters once quals have been running long enough for any to expire

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Landing page + public site | HIGH | LOW | P1 |
| Discord OAuth login | HIGH | MEDIUM | P1 |
| Soldier profile | HIGH | MEDIUM | P1 |
| Service record | HIGH | MEDIUM | P1 |
| Enlistment workflow | HIGH | HIGH | P1 |
| RBAC (4 roles) | HIGH | HIGH | P1 |
| Awards display | HIGH | LOW | P1 |
| Member roster (internal) | MEDIUM | LOW | P1 |
| ORBAT (public) | MEDIUM | MEDIUM | P1 |
| Rank chart (public) | LOW | LOW | P1 |
| Qualifications tracking | HIGH | MEDIUM | P2 |
| Event / op management | HIGH | MEDIUM | P2 |
| Attendance record | HIGH | MEDIUM | P2 |
| Transfer orders | MEDIUM | MEDIUM | P2 |
| Command promotion workflow | MEDIUM | MEDIUM | P2 |
| Public statistics | LOW | LOW | P2 |
| Discord role sync | MEDIUM | HIGH | P3 |
| After Action Reports | MEDIUM | HIGH | P3 |
| Visual timeline service record | LOW | HIGH | P3 |
| Qualification expiry tracking | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

---

## Competitor Feature Analysis

Research covered: PERSCOM.io (cloud product), UNITAF, 16 Air Assault, SEAL Team 3 Milsim (PERSCOM installation), USSOCOM Arma III (PERSCOM installation), Task Force Raider, Special Forces Group.

| Feature | PERSCOM.io (cloud) | Typical self-hosted PERSCOM | UNITAF (custom) | Our Approach |
|---------|--------------------|-----------------------------|-----------------|--------------|
| Authentication | OAuth 2.0 (Discord, others) | Forum-integrated (IPB) | Custom login | Discord OAuth only — matches unit culture |
| Soldier profile | Full (rank, unit, MOS, status) | Full | Full | Full; add Delta Force-specific fields (callsign, troop/team) |
| Service record | Promotions, awards, quals, combat, training, assignments | Promotions, awards, qualifications | Deployments + AARs | Promotions, awards, qualifications, transfers — matches 1st SFOD operational reality |
| Enlistment workflow | Customizable form + states | Basic form + manual review | 4-step onboarding | Apply → Review → Interview → Accept/Deny with admin UI |
| RBAC | Role-based, configurable | Admin vs member | Multi-tier | Admin / Command / NCO / Member — four tiers matching unit structure |
| Discord integration | SSO + notifications + DMs | None (IPB-native) | Not documented | OAuth login + Discord role sync (v1.x); notifications (v3+) |
| Event management | Calendar + events | Not built-in | Campaign center | Events with attendance tracking; linked to service record |
| Awards system | Award images + citations | Award images + citations | Deployment badges | Award images + citations + ribbon bar display |
| Public-facing | PERSCOM widget only | PERSCOM widget | Full public site | Full public site separate from member portal |
| ORBAT | Unit/position hierarchy | Unit hierarchy | Full ORBAT | Visual ORBAT tied to live member assignments |

---

## Sources

- [PERSCOM.io — Official Product Site](https://perscom.io/) — MEDIUM confidence (live site, official)
- [PERSCOM Documentation — Introduction](https://docs.perscom.io/docs/introduction) — MEDIUM confidence (official docs)
- [PERSCOM Discord Integration Docs](https://docs.perscom.io/integrations/third-party/discord) — MEDIUM confidence (official docs)
- [UNITAF — United Task Force Arma 3 Milsim](https://unitedtaskforce.net/) — MEDIUM confidence (live site, major unit)
- [16 Air Assault Milsim Community](https://16aa.net/) — MEDIUM confidence (live site, long-running unit since 2004)
- [SEAL Team 3 MILSIM — PERSCOM Installation](https://sealteam3milsim.team/perscom/) — MEDIUM confidence (live implementation)
- [USSOCOM Arma III — PERSCOM Roster](https://www.arma-socom.com/perscom/personnel/) — MEDIUM confidence (live implementation)
- [Discord OAuth2 Official Documentation](https://discord.com/developers/docs/topics/oauth2) — HIGH confidence (official Discord developer portal)
- [PERSCOM Invision Community Marketplace Listing](https://invisioncommunity.com/files/file/9776-perscom-soldier-management-system/) — MEDIUM confidence (official product listing)
- [Bohemia Interactive Forums — PERSCOM Web App Thread](https://forums.bohemia.net/forums/topic/224442-web-app-unreleased-personnel-management-system-perscom-sort-of/) — LOW confidence (community forum, older)
- [MilSim Units Directory](https://milsimunits.com/) — LOW confidence (aggregator, not authoritative)

---
*Feature research for: milsim unit website + personnel management system (Arma 3 / Delta Force / 1st SFOD)*
*Researched: 2026-02-10*
