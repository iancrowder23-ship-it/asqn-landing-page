# Pitfalls Research

**Domain:** Milsim unit website with PERSCOM-style personnel management system
**Researched:** 2026-02-10
**Confidence:** MEDIUM-HIGH (RLS/auth pitfalls HIGH via official docs; milsim-specific patterns MEDIUM via community observation and analogous systems)

---

## Critical Pitfalls

### Pitfall 1: RLS Disabled on Tables — The Silent Data Leak

**What goes wrong:**
New Postgres tables created via SQL Editor or migrations default to RLS disabled. Every row in those tables is publicly readable through the Supabase API by anyone with the anon key — including the personnel records, service history, promotions, and enlistment applications that this system centers on. There are no error messages; data just silently flows out.

**Why it happens:**
Supabase's dashboard Table Editor enables RLS by default, but SQL migrations and the SQL Editor do not. Developers writing schema migrations skip `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` because they're focused on column definitions. In January 2025, 170+ Lovable-built apps exposed databases this way (CVE-2025-48757). 83% of exposed Supabase databases involve RLS misconfiguration.

**How to avoid:**
Add `ALTER TABLE [table] ENABLE ROW LEVEL SECURITY;` at the end of every `CREATE TABLE` migration — no exceptions. Create a migration template or checklist that enforces this. Immediately after enabling RLS, add at minimum a deny-all policy (`USING (false)`) as a placeholder, then layer in real policies. Run Supabase's built-in Database Advisor (Dashboard → Database → Advisors) after every migration batch to catch missed tables.

**Warning signs:**
- You can read another user's data in the browser console while authenticated as a low-privilege user
- The Supabase Table Editor shows "RLS disabled" badge on any table with sensitive data
- Supabase Database Advisor flags "RLS disabled" warnings

**Phase to address:**
Foundation / Schema phase — RLS must be enabled on every table at creation time, not retrofitted later.

---

### Pitfall 2: JWT Staleness for Role Changes — Promoted Member Still Has Old Permissions

**What goes wrong:**
The permission system uses custom JWT claims (role: "Member" | "NCO" | "Command" | "Admin") embedded in the access token via a Supabase Auth Hook. When a member is promoted — a core workflow in this system — their JWT still carries the old role until the token is refreshed. During that window, RLS policies based on `auth.jwt()->'role'` will deny or grant the wrong access. For demotions and bans this is a security issue, not just a UX one.

**Why it happens:**
JWTs are immutable after issuance. Supabase access tokens expire after 1 hour by default but can persist in client storage. The docs explicitly note: "When the admin removes a row from the user_roles table, user's JWT still contains the custom claim until user logs out and logs in again." Developers implementing RBAC via custom claims often don't account for this propagation delay.

**How to avoid:**
Two complementary strategies: (1) Keep Supabase's default token expiration at 1 hour (don't increase it). (2) For security-critical changes (bans, demotions, role removals), implement a server-side revocation check — store a `force_reauth_at` timestamp in a `profiles` table and add a policy layer that checks `auth.uid()` against this table before granting access, bypassing JWT claims for security decisions. For non-security role changes (promotions), 1-hour staleness is acceptable — document this as a known UX behavior.

**Warning signs:**
- A promoted member complains they still can't access NCO channels right after promotion
- A kicked member can still log in and see member data for up to an hour
- You're setting token expiration longer than 1 hour for convenience

**Phase to address:**
Auth & Permissions phase — design the token refresh and revocation strategy before building any role-gated UI.

---

### Pitfall 3: Testing RLS as Superuser — All Tests Pass, Production is Broken

**What goes wrong:**
The Supabase SQL Editor and `psql` connections run as the `postgres` superuser, which bypasses all RLS policies. A developer writes queries, tests them in the SQL Editor, sees the expected data, concludes RLS is working, deploys — and then real users see empty results or can access rows they shouldn't. This is the #1 cause of "it works for me" RLS bugs.

**Why it happens:**
This is a PostgreSQL fundamental: superuser bypasses RLS unless `SET ROLE` is used explicitly. The Supabase SQL Editor gives no visual indication that it's bypassing RLS. Most tutorials don't highlight this.

**How to avoid:**
Never test RLS from the SQL Editor. Test only through the Supabase JavaScript client with a real authenticated session for each role (Member, NCO, Command, Admin) and as an unauthenticated user. Create a dedicated test script or Playwright/Vitest test suite that signs in as a fixture user for each role and asserts what data is and isn't visible. Keep at least one test user per role in your local dev database.

**Warning signs:**
- Your only RLS testing is in the SQL Editor
- You've never tested as an unauthenticated user
- You can't list what a Member-role user cannot see

**Phase to address:**
Auth & Permissions phase — write role-based access tests before building any feature that depends on them.

---

### Pitfall 4: Hardcoding Roles in the Application Layer Instead of Enforcing at Database Level

**What goes wrong:**
The front-end or API route checks `if user.role === 'Admin'` before showing data, but the underlying Supabase query has no RLS restriction. If anyone crafts a direct Supabase client call — trivially easy with the anon key exposed in the browser — they bypass all application-layer role checks entirely.

**Why it happens:**
Developers coming from traditional full-stack backgrounds (Express + ORM) think in terms of middleware guards. The mental model is "I check the role, then fetch the data." In Supabase's architecture, the database is directly queryable from the browser, so the database must be the last line of defense.

**How to avoid:**
Treat RLS as the authoritative permission layer. Front-end role checks are UI helpers only (to show/hide buttons). Every table needs RLS policies for every operation (SELECT, INSERT, UPDATE, DELETE) that reflect the permission matrix. Use Supabase's `auth.uid()` and `auth.jwt()` in policies, not application code.

**Warning signs:**
- Any Supabase `select()` call that doesn't have a corresponding RLS policy covering it
- You're using the service role key on the client side to "simplify" access
- Role checks only exist in React components or API route guards

**Phase to address:**
Auth & Permissions phase — design the full permission matrix (what can Admin/Command/NCO/Member read, write, update, delete) before writing a single query.

---

### Pitfall 5: Service Record Mutability — Overwriting History Instead of Appending It

**What goes wrong:**
The service record system (promotions, awards, qualifications, transfers) gets implemented as mutable fields on the `members` table: `rank = 'SGT'`, `award_count = 3`. When a member is promoted, the old rank is overwritten. When an award is revoked, the count decrements. The audit trail — the core value proposition of a PERSCOM system — is destroyed.

**Why it happens:**
CRUD thinking. Developers reach for `UPDATE members SET rank = 'SGT'` because it's the simplest implementation. The distinction between "current state" and "event history" isn't obvious until someone asks "when was this person promoted?" and the answer is gone.

**How to avoid:**
Model the service record as an append-only event log from the start. Every change to rank, awards, qualifications, and unit assignments is a new row in a `service_events` table with `(member_id, event_type, old_value, new_value, effective_date, recorded_by, notes)`. The current rank is derived by querying the latest promotion event, or materialized into the `profiles` table for display performance. Never update historical records — only add corrections as new events with a `corrects_event_id` reference.

**Warning signs:**
- Your `members` table has `rank`, `awards`, `qualification_badges` as direct columns that get `UPDATE`d
- There is no `created_at`, `recorded_by` on rank/award fields
- You can't answer "what was this person's rank on [specific date]?"

**Phase to address:**
Data Model phase (before any service record UI is built) — the schema decision here is irreversible once data exists.

---

### Pitfall 6: Enlistment Workflow Without State Machine Discipline — Ghost Applications and Double-Approvals

**What goes wrong:**
The enlistment pipeline (apply → review → interview → accept/deny) is implemented with a simple `status` enum field. Two reviewers can simultaneously transition the same application from `review` to `interview`, creating duplicate interviews. A denied application can be re-opened by someone who didn't see the denial. Applications get stuck in intermediate states with no path forward.

**Why it happens:**
State machines feel like over-engineering for small units. The temptation is to just show the current status and let users update it. Without explicit state transition rules enforced at the database level, any authorized user can write any status value.

**How to avoid:**
Define valid state transitions explicitly in a Postgres function or check constraint. Only allow transitions that are valid: `pending` → `under_review`, `under_review` → `interview_scheduled` | `denied`, `interview_scheduled` → `accepted` | `denied`. Enforce this via a trigger or RPC function that rejects invalid transitions. Use Postgres `SELECT FOR UPDATE` or optimistic locking (a `version` column) to prevent concurrent updates on the same application row.

**Warning signs:**
- Your enlistment `status` is updated via a direct `UPDATE` statement with no transition validation
- Two NCOs can both click "Schedule Interview" on the same application
- There's no record of who changed the status or when

**Phase to address:**
Enlistment Workflow phase — model the state machine before building the UI.

---

### Pitfall 7: Discord as Sole Auth — Unit Identity Tied to a Third-Party Platform

**What goes wrong:**
Every member's identity is their Discord account. If a member's Discord account is banned, hacked, or deleted, they lose all access to their service record permanently. If Discord changes their OAuth scopes, terms of service, or API behavior, the entire auth system breaks. There is no recovery path for legitimate members who lose Discord access.

**Why it happens:**
Discord is central to milsim unit operations — everyone already has an account, it handles voice comms, and it's the natural identity layer. The convenience is real. But "everyone has it now" is not the same as "it's a stable identity provider forever."

**How to avoid:**
Store the Discord user ID (`discord_id`) as the canonical external identifier in a `profiles` table, but decouple it from the internal `id` (Supabase UUID). This allows: (1) future migration to a different Discord account for the same member, (2) an admin-level "account recovery" flow where a Command member can re-link a service record to a new Discord ID. Document the account recovery process in the admin panel even if it's initially just a note saying "contact admin."

**Warning signs:**
- Your `members` table primary key is the Discord user ID (not a Supabase UUID)
- There's no admin UI to re-link a member's Discord account
- No documented recovery procedure exists

**Phase to address:**
Auth & Data Model phase — separate internal and external identity from the start.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Service role key in browser for "easy admin queries" | No RLS complexity to debug | Any user with DevTools can execute admin-level queries | Never |
| Rank/awards as direct columns (not event log) | Simple CRUD, fast initial build | Complete rewrite to add audit trail; lost history | Never — model correctly from day one |
| RLS disabled "temporarily" during development | Faster iteration, easier SQL debugging | Forgotten before launch; data exposed | Never — use SQL Editor superuser for dev exploration, but keep RLS on |
| Single `role` enum column for permissions | Simple to implement | Can't handle edge cases (e.g., member with limited NCO access); requires schema change to extend | Only acceptable during early prototyping with a migration plan to custom claims |
| Hard-coded role strings in application code | Fast | Any role rename breaks silently across the codebase | Use constants/enums from day one |
| Storing sensitive member data in Supabase `user_metadata` | Easy access via `auth.uid()` | `user_metadata` is editable by the authenticated user — they can forge their own rank | Never for anything security-relevant |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Discord OAuth | Hardcoding `localhost:3000` as redirect URI, forgetting to add production URL | Add both dev and prod redirect URIs to Discord Developer Portal before first test |
| Discord OAuth | Assuming Discord username is stable identity | Use Discord `id` (numeric snowflake), not username — usernames change |
| Discord OAuth | Not requesting `guilds` scope to verify unit membership | Request `identify` + `guilds` + `guilds.members.read` if server membership verification is needed |
| Supabase RLS | Testing in SQL Editor (superuser bypasses RLS) | Test exclusively through Supabase JS client with authenticated sessions |
| Supabase Storage | Creating public buckets for "convenience" during dev | Private buckets with signed URLs from the start; no public buckets for member-uploaded content |
| Supabase Storage | No file type/size validation | Validate MIME type and file size on upload; Supabase Storage allows this via bucket config |
| Supabase Auth Hook (RBAC) | Relying on `user_metadata` for role claims | Use a dedicated `user_roles` table read by a custom access token hook; `user_metadata` is user-editable |
| Docker VPS | Supabase self-hosted or external Supabase? | Clarify early — self-hosting Supabase adds significant ops complexity; external Supabase (cloud) is strongly recommended for units this size |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| RLS policy columns without indexes | Roster page is slow; service record queries take 500ms+ | Index every column used in `USING` or `WITH CHECK` clauses (`member_id`, `user_id`, `unit_id`) | Noticeable at 100+ members with complex policies |
| Calling functions in RLS policies without wrapping in SELECT | Policy re-evaluates function on every row | Wrap: `(SELECT auth.uid())` not `auth.uid()` — forces optimizer to cache the result | Any table with more than a few hundred rows |
| Correlated subqueries in RLS policies | Very slow multi-join queries | Use `EXISTS` with indexes or `ANY` array operations instead of correlated subqueries | 50+ rows |
| N+1 queries in roster views | Roster grid loads slowly (one query per member for awards/rank) | Fetch roster with joins or `select('*, service_events(*)')` in one query; paginate if > 50 members | 30+ members with eager-loaded relations |
| Service record fetching full history for display | Profile page hangs loading years of events | Store current rank/awards in `profiles` table (materialized from events); query history only when explicitly requested | 100+ events per member |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Service role key in browser bundle | Any visitor can bypass all RLS and read/write any table | Service role key only in server-side functions or environment variables — never `VITE_*` or `NEXT_PUBLIC_*` |
| Trusting `user_metadata` for rank/role in RLS policies | Authenticated users can promote themselves by editing their own metadata via `supabase.auth.updateUser()` | Roles live in a separate `user_roles` table only admins can write; read via custom access token hook |
| Public storage buckets for member profile photos | Profile photos are accessible to anyone with the URL — search engines can index them | Use private buckets with short-lived signed URLs for profile images |
| No rate limiting on enlistment applications | Unit can be flooded with spam applications | Add `created_at` rate limit logic in an RLS INSERT policy (`WITH CHECK`) or Edge Function |
| Discord `id` as primary key exposed in URLs | Exposes member Discord IDs; creates correlation attacks | Use internal Supabase UUID in all URLs; Discord ID is stored but never in public endpoints |
| Allowing direct UPDATE on service record events table | Malicious admin can rewrite history | Service record tables should allow INSERT only, never UPDATE/DELETE via RLS; corrections are new events |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Showing "Access Denied" with no explanation | Members don't know what they can or can't see, file bug reports | Show contextual messages: "This section requires NCO rank or above" |
| Forcing re-login after promotion with no notice | Members assume the site is broken when their new permissions don't appear | Show a toast after role change: "Your permissions have been updated — please refresh or re-login to see changes" |
| Custom dark theme with insufficient contrast | Text is unreadable in ambient light; fails WCAG 4.5:1 contrast requirement | Never use true black (#000000) backgrounds; test all text with a contrast checker; minimum 4.5:1 for body text |
| No loading states on Supabase async queries | Roster page appears blank or broken while fetching | Skeleton loaders on roster cards and service record tables |
| Enlistment form with no save-draft ability | Applicant types 500 words, navigates away, loses everything | Auto-save to `localStorage` on form input; restore on return |
| Multiple roster view states (card/tree/table) not persisted | User switches to table view, navigates to a profile, comes back to card view | Persist selected roster view in URL params or `localStorage` |
| No confirmation on destructive actions (deny application, revoke award) | Accidental denials and revocations | Modal confirmation with reason input for any action that changes member status or service record |

---

## "Looks Done But Isn't" Checklist

- [ ] **RLS:** Every table has both RLS enabled AND at least one policy — verify with `SELECT tablename FROM pg_tables WHERE schemaname = 'public'` and cross-reference with `pg_policies`
- [ ] **Role permissions:** Tested as Member, NCO, Command, Admin, and unauthenticated — not just as admin during development
- [ ] **Service record:** Promotions, awards, and qualifications create new event rows — not UPDATE to existing columns — verify no `UPDATE` statements exist in service record mutations
- [ ] **Enlistment state machine:** Only valid transitions are accepted — test attempting an invalid transition (e.g., `pending` → `accepted`) and confirm it fails
- [ ] **Discord OAuth redirect URIs:** Both localhost and production URLs are registered in Discord Developer Portal
- [ ] **Storage buckets:** No bucket is set to public — verify in Supabase Dashboard → Storage → Buckets
- [ ] **Service role key:** Not present in any client-side code, `.env` file exposed to browser, or committed to git — run `grep -r "service_role" .` before every deploy
- [ ] **Audit trail:** Every mutation to member status, rank, awards, or unit assignment has `performed_by` (user ID) and `created_at` recorded
- [ ] **Soft delete:** Discharged/removed members have their data preserved with `status = 'discharged'` — not hard-deleted — their service record must survive their departure
- [ ] **Token refresh on role change:** After a promotion, the member's session reflects the new role within one token TTL (1 hour max) — test by promoting a member and verifying within the hour

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| RLS disabled on table discovered post-launch | HIGH | Enable RLS immediately; add deny-all policy; audit access logs; notify affected members if exposure was significant |
| Service record data modeled as mutable columns, not event log | HIGH | Write a migration that reads current values and creates synthetic historical events; losing exact timestamps is unavoidable |
| Service role key leaked in public repo | HIGH | Rotate key immediately in Supabase Dashboard; audit logs for unauthorized use; invalidate all existing sessions |
| Enlistment workflow double-approvals | MEDIUM | Add `version` column and optimistic lock check; manually resolve duplicate states via admin panel |
| JWT staleness causing access after demotion | MEDIUM | Force session invalidation via Supabase Auth admin API for the specific user; reduce token TTL going forward |
| All members locked to Discord accounts, one account lost | MEDIUM | Build admin "re-link" flow immediately; for current incident, use service role to update `identities` table manually |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| RLS disabled on tables | Foundation / Schema | Run DB Advisor after every migration; check `pg_policies` coverage |
| JWT staleness for role changes | Auth & Permissions | Test promotion flow: promote user, verify old token behavior, verify new token after refresh |
| Testing RLS as superuser | Auth & Permissions | All role tests must use JS client, never SQL Editor — enforce in dev runbook |
| App-layer-only role checks | Auth & Permissions | Code review checklist: every Supabase query maps to an RLS policy |
| Service record mutability | Data Model | Schema review: no `rank`, `award_count` etc. as mutable columns on `members` table |
| Enlistment without state machine | Enlistment Workflow | Test invalid transitions via API — should return error, not silently succeed |
| Discord sole-auth lock-in | Auth & Data Model | `profiles` table has `discord_id` column separate from internal UUID primary key |
| RLS performance (missing indexes) | Schema / Optimization | Run `EXPLAIN ANALYZE` on roster and service record queries before any public launch |
| Storage public buckets | Storage / Media | Bucket audit: all buckets private; signed URL generation working |
| `user_metadata` for role storage | Auth & Permissions | RLS policies reference `user_roles` table via hook — never `auth.users.raw_user_meta_data` |

---

## Sources

- [Supabase RLS Official Docs](https://supabase.com/docs/guides/database/postgres/row-level-security) — HIGH confidence
- [Supabase Custom Claims & RBAC Docs](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac) — HIGH confidence
- [Supabase RLS Performance & Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv) — HIGH confidence
- [Supabase Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control) — HIGH confidence
- [Supabase Discord OAuth Docs](https://supabase.com/docs/guides/auth/social-login/auth-discord) — HIGH confidence
- [Fixing RLS Misconfigurations — ProsperaSoft](https://prosperasoft.com/blog/database/supabase/supabase-rls-issues/) — MEDIUM confidence
- [Optimizing RLS Performance — AntStack](https://www.antstack.com/blog/optimizing-rls-performance-with-supabase/) — MEDIUM confidence
- [Designing performant RLS schema — Caleb Brewer/Medium](https://cazzer.medium.com/designing-the-most-performant-row-level-security-strategy-in-postgres-a06084f31945) — MEDIUM confidence
- [Supabase Best Practices — Leanware](https://www.leanware.co/insights/supabase-best-practices) — MEDIUM confidence
- CVE-2025-48757 (170+ Lovable apps with exposed Supabase DBs, January 2025) — MEDIUM confidence (reported via multiple secondary sources)

---

*Pitfalls research for: milsim unit website with PERSCOM-style personnel management (ASQN 1st SFOD)*
*Researched: 2026-02-10*
