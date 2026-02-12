---
phase: 05-enlistment-pipeline-and-personnel-actions
verified: 2026-02-12T05:00:00Z
status: passed
score: 5/5 must-haves verified
re_verification: false
gaps: []
human_verification:
  - test: "Command user advances application: pending -> reviewing -> interview_scheduled -> accepted"
    expected: "Each step updates status, final accept creates soldier profile and writes service record"
    why_human: "Requires authenticated Command-role session in running app to test full state machine flow"
  - test: "Retry accept with existing soldier_id skips soldier creation"
    expected: "No duplicate soldier created; status updated to accepted and redirected"
    why_human: "Idempotency path requires simulating a partial failure and retry"
  - test: "NCO sees queue read-only (no action buttons visible)"
    expected: "Queue page loads, detail page shows read-only banner, no advance/accept/reject buttons"
    why_human: "Requires authenticated NCO-role session"
  - test: "Invalid state jump (pending -> accepted) returns 400 error"
    expected: "Error message: 'Cannot advance from pending to accepted'"
    why_human: "Requires crafting a POST request bypassing UI or a running server"
  - test: "Admin sees Status Change tab; Command-only user does not"
    expected: "Status tab present for admin, absent for command"
    why_human: "Requires two authenticated sessions with different roles"
  - test: "Leadership note visible in service record timeline for NCO+ but not Member"
    expected: "Note appears for NCO/Command/Admin viewers; Member sees no note entry"
    why_human: "RLS visibility enforcement requires two authenticated sessions"
---

# Phase 5: Enlistment Pipeline and Personnel Actions Verification Report

**Phase Goal:** Command can move applicants from submission to soldier, and execute all formal personnel actions — promotions, transfers, status changes, and notes — that write to the append-only service record
**Verified:** 2026-02-12T05:00:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #   | Truth | Status | Evidence |
| --- | ----- | ------ | -------- |
| 1   | Command+ can view a queue of pending enlistment applications and advance each through the states (Submitted > Under Review > Interview Scheduled > Accept/Deny) — invalid state jumps are rejected | VERIFIED | `enlistments/+page.server.ts` + `[id]/+page.server.ts` with `isValidTransition()` guard before every state mutation; `VALID_TRANSITIONS` map enforces the exact required path |
| 2   | Accepting an application automatically creates a soldier profile for the applicant without manual data entry | VERIFIED | `acceptApplication` action: inserts to `soldiers` (display_name, status='active', rank_id, unit_id), dual-writes service_records enlistment entry, sets soldier_id on enlistment for idempotency |
| 3   | Command+ can promote or demote a soldier with a reason, and the action is logged to the service record with date and who performed it | VERIFIED | `promote` action in soldiers/[id]/+page.server.ts: updates `soldiers.rank_id`, inserts `service_records` with action_type='rank_change', payload includes from/to rank names, reason, performed_by_name |
| 4   | Command+ can issue a transfer order with effective date and reason, logged to assignment history | VERIFIED | `transfer` action: updates `soldiers.unit_id`, inserts `service_records` with action_type='transfer', payload includes from/to unit, effective_date, reason |
| 5   | An Admin can change a member's status, and Command can add leadership-only notes visible only to NCO and above | VERIFIED | `statusChange` action gated with `hasRole(userRole, 'admin')`, `addNote` inserts service_records with `visibility: 'leadership_only'`; UI status tab wrapped in `{#if hasRole(data.userRole, 'admin')}` |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `supabase/migrations/20260211000007_phase5_enlistment_pipeline.sql` | ALTER status constraint, add soldier_id FK, add Command+ UPDATE RLS | VERIFIED | All 3 SQL statements present; interview_scheduled in constraint; soldier_id FK references soldiers(id) ON DELETE SET NULL |
| `src/lib/enlistment-transitions.ts` | VALID_TRANSITIONS, isValidTransition, STATUS_LABELS, NEXT_STATES | VERIFIED | All 4 exports present; pending terminal states have empty arrays; isValidTransition uses includes() correctly |
| `src/lib/schemas/advanceEnlistment.ts` | advanceEnlistmentSchema export | VERIFIED | Zod v4 object with target_status: z.string().min(1) |
| `src/lib/schemas/acceptEnlistment.ts` | acceptEnlistmentSchema export | VERIFIED | rank_id: uuid(), unit_id: uuid().optional() |
| `src/lib/schemas/promoteAction.ts` | promoteActionSchema export | VERIFIED | new_rank_id, new_rank_name, from_rank_id, from_rank_name, reason (min 5, max 500) |
| `src/lib/schemas/transferAction.ts` | transferActionSchema export | VERIFIED | new_unit_id, new_unit_name, from_unit_id (nullable), from_unit_name (nullable), effective_date (date regex), reason |
| `src/lib/schemas/statusChangeAction.ts` | statusChangeActionSchema + SOLDIER_STATUSES exports | VERIFIED | SOLDIER_STATUSES const array exported; z.enum(SOLDIER_STATUSES) for both status fields |
| `src/lib/schemas/addNoteAction.ts` | addNoteActionSchema export | VERIFIED | note_text: z.string().min(10).max(2000) |
| `src/lib/types/database.ts` | Regenerated types with enlistments.soldier_id column | VERIFIED | soldier_id: string \| null present in enlistments Row/Insert/Update types; FK relationship documented |
| `src/routes/(app)/enlistments/+page.server.ts` | NCO+ gated queue load | VERIFIED | hasRole(userRole, 'nco') guard; queries non-terminal enlistments; returns allApplications for count badges |
| `src/routes/(app)/enlistments/+page.svelte` | Status filter tabs with count badges | VERIFIED | $state activeFilter, $derived filteredApplications, STATUS_LABELS used for badges, links to /enlistments/{id} |
| `src/routes/(app)/enlistments/[id]/+page.server.ts` | load + advance + acceptApplication + reject actions | VERIFIED | All 3 actions present; isValidTransition() called server-side from DB-fetched status; soldier auto-creation; idempotency check |
| `src/routes/(app)/enlistments/[id]/+page.svelte` | Detail view with action buttons, NCO read-only, terminal state display | VERIFIED | isCommand derived from hasRole; action buttons gated; terminal state shows accepted/rejected with soldier profile link |
| `src/routes/(app)/soldiers/[id]/+page.server.ts` | promote, transfer, statusChange, addNote actions | VERIFIED | All 4 actions present with dual-write pattern; statusChange gated with hasRole(admin); addNote uses visibility='leadership_only' |
| `src/routes/(app)/soldiers/[id]/+page.svelte` | Personnel Actions panel with 4 tabs | VERIFIED | 589-line file; Personnel Actions section at line 195; all 4 tabs present; status tab wrapped in admin conditional; note tab shows leadership disclaimer |
| `src/routes/(app)/+layout.svelte` | Enlistments nav link for NCO+ | VERIFIED | `{#if hasRole(data.userRole, 'nco')}` wraps `<a href="/enlistments">Enlistments</a>` |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| `enlistments/[id]/+page.server.ts` | `src/lib/enlistment-transitions.ts` | isValidTransition() call | WIRED | import at line 5; called in advance action (line 82), acceptApplication action (line 132), reject action (line 237) |
| `enlistments/[id]/+page.server.ts` | `supabase.from('soldiers').insert` | acceptApplication creates soldier row | WIRED | lines 165-174; inserts display_name, status='active', rank_id, unit_id |
| `enlistments/[id]/+page.server.ts` | `supabase.from('service_records').insert` | acceptApplication writes enlistment event | WIRED | lines 182-192; action_type='enlistment', visibility='public' |
| `enlistments/[id]/+page.server.ts` | `supabase.from('enlistments').update` | All advance actions update status | WIRED | advance (line 90), acceptApplication (line 200), reject (line 241) |
| `soldiers/[id]/+page.server.ts` | `supabase.from('soldiers').update` | promote, transfer, statusChange update table | WIRED | promote line 374, transfer line 427, statusChange line 481 |
| `soldiers/[id]/+page.server.ts` | `supabase.from('service_records').insert` | Every personnel action dual-writes | WIRED | promote line 394, transfer line 447, statusChange line 501, addNote line 543 |
| `soldiers/[id]/+page.server.ts` | `src/lib/schemas/promoteAction.ts` | superValidate with zod4 adapter | WIRED | import at line 7; used in promote action (line 365) |

### Requirements Coverage

| Requirement | Status | Notes |
| ----------- | ------ | ----- |
| ENLS-01: View queue of pending applications with status filter | SATISFIED | Queue page with tabs, count badges, non-terminal filter |
| ENLS-02: Advance through states (invalid jumps rejected) | SATISFIED | isValidTransition() server-side check before every DB update |
| ENLS-03: Interview Scheduled state supported | SATISFIED | Migration adds to constraint; state machine includes it |
| ENLS-04: Accept creates soldier profile automatically | SATISFIED | acceptApplication action with soldier insert + service_record |
| ENLS-05: NCO read-only queue access | SATISFIED | hasRole(nco) gate on load; no action buttons for non-Command |
| PERS-01: Promote/demote with service record log | SATISFIED | promote action: soldiers.rank_id update + rank_change service record |
| PERS-02: Transfer with effective date and service record log | SATISFIED | transfer action: soldiers.unit_id update + transfer service record with effective_date |
| PERS-03: Admin status change with service record log | SATISFIED | statusChange action: admin-only gate; soldiers.status update + status_change service record |
| PERS-04: Command+ leadership-only notes | SATISFIED | addNote action: service_records only, visibility='leadership_only' |
| PERS-05: Enlistments nav link NCO+ only | SATISFIED | Layout gated with hasRole(nco) |

### Anti-Patterns Found

None detected. No TODOs, FIXMEs, placeholder returns, empty handlers, or stub implementations found in any Phase 5 files.

### Human Verification Required

#### 1. Full Pipeline Walk-Through (Command role)

**Test:** Log in as a Command-role user. Navigate to /enlistments. Open a pending application. Advance through: pending -> reviewing -> interview_scheduled -> accept (select a rank, optional unit).
**Expected:** Status updates at each step. On accept: soldier profile created, service record written, soldier link appears in terminal state display.
**Why human:** Requires authenticated Command-role session and existing pending enlistment data.

#### 2. Idempotency on Accept Retry

**Test:** Simulate a partial failure by accepting an application, then calling the acceptApplication action again.
**Expected:** No second soldier created; existing soldier_id detected; status confirmed accepted and redirect issued.
**Why human:** Requires simulating mid-transaction failure or calling the action endpoint directly with an already-accepted enlistment.

#### 3. Invalid State Jump Rejection

**Test:** Attempt to POST target_status='accepted' on a pending application (bypassing the UI).
**Expected:** HTTP 400 with message "Cannot advance from 'pending' to 'accepted'".
**Why human:** Requires crafting a raw POST to ?/advance with target_status=accepted on a pending application.

#### 4. Role-Segregated Access (NCO vs Command)

**Test:** Log in as NCO. Open /enlistments/[id] for any application.
**Expected:** Application details visible but no advance/accept/deny buttons. "Read-only access" banner shown.
**Why human:** Requires authenticated NCO-role session.

#### 5. Leadership Note Visibility

**Test:** Command adds a note via the Add Note tab. Log in as Member and view that soldier's profile.
**Expected:** Note does NOT appear in service record timeline for Member role. Appears for NCO+.
**Why human:** RLS enforcement on leadership_only visibility requires two authenticated sessions with different roles.

#### 6. Admin-Only Status Change

**Test:** Log in as Command (not Admin). View soldier profile.
**Expected:** Personnel Actions panel visible (promote/transfer/note tabs), but Status Change tab absent.
**Why human:** Requires authenticated Command-role session distinct from Admin.

### Gaps Summary

No gaps. All automated verification checks passed across all three plans:

- **Plan 05-01:** Migration file, state machine, and all 6 Zod schemas are present and substantive. database.ts regenerated with soldier_id.
- **Plan 05-02:** Enlistment queue and detail pages fully implemented with correct state machine integration, soldier auto-creation, service record dual-write, and idempotency guard.
- **Plan 05-03:** All 4 personnel action handlers implemented with correct role gates, dual-write pattern, and leadership_only visibility for notes. UI panel with 4 tabs correctly gated by role.

The phase goal is achieved: Command can move applicants from submission to soldier through a validated state machine, and execute all formal personnel actions that write to the append-only service record.

---

_Verified: 2026-02-12T05:00:00Z_
_Verifier: Claude (gsd-verifier)_
