---
phase: 03-soldier-profiles-and-service-records
verified: 2026-02-12T03:08:48Z
status: gaps_found
score: 4/5 must-haves verified
gaps:
  - truth: "A member's profile shows attendance statistics: operation count, attendance percentage, last active date"
    status: partial
    reason: "RLS on operation_attendance only allows members to read their OWN attendance records. When member A views member B's profile, the queries for presentCount and recentAttendance return 0/null because the 'Members can read own attendance' policy restricts to soldier_id matching the logged-in user's soldier record. Only NCO+ users can view other members' attendance stats. The total operation count (from the operations table) works for everyone, but the per-soldier present count does not."
    artifacts:
      - path: "supabase/migrations/20260211000004_phase3_profiles.sql"
        issue: "Missing RLS policy: authenticated users should be able to read operation_attendance for ANY soldier (at least the count/stats), not just their own. Current policy: USING (soldier_id IN (SELECT id FROM public.soldiers WHERE user_id = (SELECT auth.uid())))"
      - path: "src/routes/(app)/soldiers/[id]/+page.server.ts"
        issue: "Queries operation_attendance with .eq('soldier_id', params.id) and .eq('status', 'present') — will return 0 rows for regular members viewing other profiles due to RLS restriction"
    missing:
      - "Add an RLS policy on operation_attendance: 'Authenticated can read attendance stats' FOR SELECT TO authenticated USING (true) — or at minimum USING (EXISTS (SELECT 1 FROM public.operations WHERE id = operation_attendance.operation_id AND status = 'completed'))"
      - "Alternative: compute attendance stats server-side using an RPC/function that bypasses RLS, or aggregate in a view with SECURITY DEFINER"
human_verification:
  - test: "Navigate to /soldiers/[other-member-id] as a regular soldier-role user"
    expected: "Attendance stats card shows real operation count, attendance percentage, and last active date for the other member (not 0/N/A)"
    why_human: "Requires a logged-in regular member session in the live app to verify RLS behavior at runtime"
  - test: "Navigate to /soldiers/[own-id] as a regular soldier-role user"
    expected: "Attendance stats show own operation count, attendance %, and last active date correctly"
    why_human: "Requires a logged-in session and populated attendance data to verify"
  - test: "Verify rank insignia image renders when a rank has an insignia_url set"
    expected: "An <img> element displays the rank insignia in the profile header (20x20 area)"
    why_human: "Requires populated rank data with insignia_url values in the database"
---

# Phase 3: Soldier Profiles and Service Records Verification Report

**Phase Goal:** Any logged-in member can view their own and other members' complete profiles including full service history
**Verified:** 2026-02-12T03:08:48Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | A logged-in member can navigate to their own profile and see rank (with full name and insignia image), callsign, MOS, status badge, and current unit assignment | VERIFIED | `+page.svelte` renders rank insignia img (or abbreviation placeholder), display_name, StatusBadge, callsign, MOS, unit name. `+layout.svelte` provides conditional "My Profile" nav link using `mySoldierId`. `+layout.server.ts` queries soldiers table for `mySoldierId`. |
| 2 | A member can view another member's profile page with the same information | VERIFIED | Route `/(app)/soldiers/[id]` uses `params.id` with `Authenticated can read all soldiers` RLS policy (including non-active statuses). Header info (rank, callsign, MOS, status, unit) is served from the soldiers table which any authenticated user can read. |
| 3 | A member can view their own chronological service record showing promotions, awards, qualifications, and transfers in append-only order with timestamps and who performed each action | VERIFIED | `+page.server.ts` queries `service_records` with `.order('occurred_at', { ascending: true })`. `ServiceRecordTimeline.svelte` renders action_type label, date, payload.title, payload.description, and `payload.performed_by_name ?? 'Command'`. New RLS policy "Members can read own service records" allows self-viewing including leadership_only entries. |
| 4 | A member's profile shows attendance statistics: operation count, attendance percentage, last active date | PARTIAL | Attendance stats work correctly when a member views their OWN profile (RLS allows reading own attendance). When viewing ANOTHER member's profile, `presentCount` and `recentAttendance` return 0/null because `operation_attendance` RLS policy "Members can read own attendance" restricts to soldier records owned by the logged-in user. Regular members cannot see another member's attendance stats. |
| 5 | A member's profile shows their full unit assignment history and combat record (missions participated, roles held) | VERIFIED | Assignment history is derived from `service_records` filtered by `action_type = 'transfer'`. Combat record queries `operation_attendance` joined with `operations`. Note: same RLS restriction as Truth 4 — combat record table will be empty for regular members viewing other profiles. However, this is a display-only issue (empty table hidden via `{#if data.combatRecord.length > 0}`), whereas attendance stats display 0/N/A which looks like a functional feature rather than an access restriction. |

**Score:** 4/5 truths verified (Truth 4 partially blocked by RLS gap)

### Required Artifacts

| Artifact | Min Lines | Actual Lines | Status | Details |
|----------|-----------|-------------|--------|---------|
| `src/routes/(app)/soldiers/[id]/+page.server.ts` | — | 144 | VERIFIED | Queries soldiers+ranks+units join, service_records, operations count, operation_attendance count/recency, combat record with operations join |
| `src/routes/(app)/soldiers/[id]/+page.svelte` | 80 | 169 | VERIFIED | Full profile layout: header card with insignia, two-column grid, attendance stats, service record, combat record, assignment history |
| `src/lib/components/ServiceRecordTimeline.svelte` | 30 | 91 | VERIFIED | Vertical timeline, action type labels and icons, date formatting, payload.title/description, performed_by_name, NCO+ visibility badge, empty state |
| `src/lib/components/AttendanceStats.svelte` | 20 | 45 | VERIFIED | Stats card: op count, attendance %, last active date formatted via $derived |
| `src/lib/components/StatusBadge.svelte` | 10 | 25 | VERIFIED | Colored badge for all 6 status values using $derived with switch statement |
| `supabase/migrations/20260211000004_phase3_profiles.sql` | — | 127 | VERIFIED | operations and operation_attendance tables, all RLS policies, 'retired' constraint, service_records own-read policy, soldiers all-read policy |
| `src/lib/types/database.ts` | — | 1100+ | VERIFIED | Contains operations and operation_attendance table types with correct column definitions |
| `src/routes/(app)/+layout.server.ts` | — | 25 | VERIFIED | Queries soldiers table for mySoldierId with maybeSingle(), returns claims + userRole + mySoldierId |
| `src/routes/(app)/+layout.svelte` | 15 | 37 | VERIFIED | Nav bar with Dashboard link, conditional My Profile link using mySoldierId, roleLabel display, Logout form, {@render children()} |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `+layout.server.ts` | soldiers table | `.from('soldiers').select('id').eq('user_id', claims.sub)` | WIRED | Line 14-18: supabase query with maybeSingle(), returns `mySoldierId: mySoldier?.id ?? null` |
| `+layout.svelte` | `/soldiers/{id}` | `{#if data.mySoldierId}<a href="/soldiers/{data.mySoldierId}">` | WIRED | Line 18-20: conditional nav link using mySoldierId |
| `+page.server.ts` | soldiers table | `.from('soldiers').select(...ranks...units...).eq('id', params.id)` | WIRED | Lines 9-23: join query with ranks and units |
| `+page.server.ts` | service_records table | `.from('service_records').select(...).eq('soldier_id', params.id).order('occurred_at', { ascending: true })` | WIRED | Lines 55-59 |
| `+page.server.ts` | operation_attendance table | `.from('operation_attendance').select(...).eq('soldier_id', params.id)` | WIRED | Lines 69-73 and 95-106 |
| `+page.svelte` | ServiceRecordTimeline.svelte | `import ServiceRecordTimeline` + `<ServiceRecordTimeline records={data.serviceRecords} />` | WIRED | Lines 3, 124 |
| `+page.svelte` | AttendanceStats.svelte | `import AttendanceStats` + `<AttendanceStats operationCount=... />` | WIRED | Lines 2, 91-96 |
| `+page.svelte` | StatusBadge.svelte | `import StatusBadge` + `<StatusBadge status={soldier.status} />` | WIRED | Lines 2, 48 |

### Requirements Coverage

| Requirement | Status | Notes |
|-------------|--------|-------|
| PROF-01: Member can view own profile with rank, callsign, MOS, status, unit | SATISFIED | All fields rendered in profile header card |
| PROF-02: Member can view other members' profiles with same layout | SATISFIED | Route is parameterized by soldier ID; RLS allows authenticated to read all soldiers |
| PROF-03: Rank with full name and insignia image | SATISFIED | `<img src={soldier.rank.insignia_url}>` with fallback placeholder div showing abbreviation |
| PROF-04: Current unit assignment name | SATISFIED | `{soldier.unit?.name ?? 'Unassigned'}` in header |
| PROF-05: Status via StatusBadge (Active, LOA, AWOL, Discharged, Retired) | SATISFIED | StatusBadge component handles all 6 status values |
| SRVC-01: Chronological service record with promotions, awards, qualifications, transfers | SATISFIED | ServiceRecordTimeline with ordered-by-occurred_at data |
| SRVC-02: Service record timestamps and performed_by_name | SATISFIED | Date displayed per entry; `payload.performed_by_name ?? 'Command'` pattern |
| SRVC-03: Attendance stats (op count, attendance %, last active date) | BLOCKED | Works for own profile; blocked by RLS for viewing other members' profiles |
| SRVC-04: Unit assignment history | SATISFIED | Derived from transfer service_records and rendered conditionally |
| SRVC-05: Combat record (operations, roles held) | PARTIALLY BLOCKED | Same RLS issue as SRVC-03: empty for regular members viewing other profiles |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/lib/components/StatusBadge.svelte` | 4 | `$derived(() => {...})` wraps arrow function — $derived stores the function itself, then `{colorClasses()}` calls it | INFO | Works correctly at runtime (build passes, Svelte 5 accepts this), but `$derived.by(() => {...})` is the idiomatic form for function-body derivations |

No stub anti-patterns found. No TODO/FIXME/placeholder comments. No empty implementations.

### Human Verification Required

#### 1. Attendance Stats for Other Members' Profiles

**Test:** Log in as a regular soldier-role user. Navigate to another member's profile (not your own). Observe the Attendance card.
**Expected (with gap):** Shows "0 of X" operations, "N/A" attendance rate, "No activity" last active — even if the member has attended operations. This confirms the RLS gap.
**Expected (if fixed):** Shows accurate attendance statistics for the viewed member.
**Why human:** Requires a live Supabase session with both a regular member user AND populated operation_attendance records to verify the RLS enforcement at runtime.

#### 2. Rank Insignia Image Display

**Test:** Log in and navigate to a soldier's profile where the soldier's rank has an `insignia_url` set in the database.
**Expected:** The rank insignia image renders in the top-left of the profile header card (80x80 px area).
**Why human:** Requires populated rank data with actual insignia_url values (URLs to hosted images) to visually confirm the `<img>` path renders correctly.

#### 3. Service Record Timeline with Real Data

**Test:** Navigate to a profile for a soldier with at least one service record entry.
**Expected:** Timeline shows entries in chronological order with action type, date, title from payload, and "by [name]" attribution.
**Why human:** Requires populated service_records data in the database to verify the timeline renders correctly (not just the empty state).

### Gaps Summary

One gap blocks full goal achievement for regular (non-NCO) members:

**RLS gap on `operation_attendance`:** The "Members can read own attendance" policy uses `USING (soldier_id IN (SELECT id FROM public.soldiers WHERE user_id = (SELECT auth.uid())))`. This correctly scopes a member to their own records — but the profile page queries attendance for a *different* soldier (the profile subject, `params.id`). When member A visits member B's profile, the attendance count and last-active queries return 0/null. The total operations count from the `operations` table works (authenticated read policy allows it), so the denominator is correct but the numerator is always 0.

The same RLS gap silently empties the combat record table for regular members viewing other profiles. Because the table is only rendered `{#if data.combatRecord.length > 0}`, this appears as "no combat record" rather than an error — which is misleading but doesn't cause a visible broken UI.

The fix requires either: (a) a new blanket `operation_attendance` SELECT policy for authenticated users (similar to the `Authenticated can read all soldiers` approach), (b) a SECURITY DEFINER function/view for attendance aggregations, or (c) restructuring the stats query to use an RPC.

---

_Verified: 2026-02-12T03:08:48Z_
_Verifier: Claude (gsd-verifier)_
