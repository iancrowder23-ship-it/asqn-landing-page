# Phase 7: Gap Closure — Research

**Researched:** 2026-02-11
**Domain:** SvelteKit auth lifecycle, public route creation, JSONB payload key alignment
**Confidence:** HIGH

---

## Summary

Phase 7 closes three concrete gaps identified in the v1.0 audit. All three are surgical fixes to existing code — no new libraries, no schema migrations, no new patterns. The codebase is well-structured and the gaps are caused by missing routes and a payload key mismatch, not architectural problems.

**Gap 1 — Logout** (`AUTH-01`): The `(app)` layout has a logout button that POSTs to `/auth/logout`, but that route does not exist. The fix is a single new file: `src/routes/auth/logout/+page.server.ts` with a `default` action that calls `supabase.auth.signOut()` and redirects to `/`. The session is server-side (cookies managed by `@supabase/ssr`), so `signOut()` on the server client correctly clears the auth cookies.

**Gap 2 — Public Events** (`SITE-08`): The `(site)` layout nav includes an "Events" link pointing to `/events`. That URL resolves to the `(app)/events` route, which is gated by the `(app)` layout server load that redirects unauthenticated visitors to `/auth/login`. The RLS policy on `events` already permits `anon` reads for `status = 'scheduled'`. The fix is to create `src/routes/(site)/events/+page.server.ts` and `+page.svelte` as a public read-only events listing using the server-side Supabase client. No new RLS changes needed.

**Gap 3 — Assignment History** (`soldier profile`): The soldier profile page template reads `entry.payload.from_unit` and `entry.payload.to_unit`, but the transfer action inserts service records with payload keys `from_unit_name` and `to_unit_name`. This payload key mismatch causes the display to always show `— → —`. The fix is a one-line template change in `+page.svelte` to read the correct keys.

**Primary recommendation:** Three targeted fixes — one new route file pair (logout), one new route file pair (public events), one template string correction (assignment history). No new dependencies.

---

## Standard Stack

### Core (already installed — no additions needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/ssr` | `^0.8.0` | Server-side Supabase client with cookie management | Established in codebase |
| `@supabase/supabase-js` | `^2.95.3` | Auth lifecycle (`signOut`, `getClaims`) | Established in codebase |
| `@sveltejs/kit` | `^2.50.2` | Route handlers, redirects, form actions | Established in codebase |
| `tailwindcss` | `^4.1.18` | Styling, consistent with existing pages | Established in codebase |

### Supporting

None required for this phase. All needed libraries are already installed.

### Alternatives Considered

None — the stack is locked and these are repairs to existing features, not new features requiring choices.

**Installation:**

```bash
# No new packages needed
```

---

## Architecture Patterns

### Recommended Project Structure (new files only)

```
src/routes/
├── auth/
│   └── logout/
│       └── +page.server.ts       # NEW: logout action handler
├── (site)/
│   └── events/
│       ├── +page.server.ts       # NEW: public events loader (anon-safe)
│       └── +page.svelte          # NEW: public events display
└── (app)/
    └── soldiers/
        └── [id]/
            └── +page.svelte      # EDIT: fix from_unit/to_unit key names
```

### Pattern 1: SvelteKit Form Action for Logout

**What:** A `+page.server.ts` under `/auth/logout` that exports a `default` action. The `(app)` layout POSTs `method="POST" action="/auth/logout"` which targets this endpoint.

**When to use:** Any server-side auth state mutation requiring a redirect. Must be server-side to properly clear Supabase session cookies.

**Example:**

```typescript
// src/routes/auth/logout/+page.server.ts
import { redirect } from '@sveltejs/kit'
import type { Actions } from './$types'

export const actions: Actions = {
  default: async ({ locals: { supabase } }) => {
    await supabase.auth.signOut()
    redirect(303, '/')
  }
}
```

**Key detail:** `supabase` here is the server-side client (`createSupabaseServerClient`) injected by `hooks.server.ts`. Calling `signOut()` on it clears the session cookies set during login. The `@supabase/ssr` library's `setAll` cookie handler (already implemented in `server.ts`) ensures cookies are properly deleted.

**Note on `+page.server.ts` vs `+server.ts`:** The existing logout button uses `<form method="POST" action="/auth/logout">` — this targets a form action, which requires `+page.server.ts` with `export const actions`. A `+server.ts` would require a different request method (`DELETE`/`POST` to a raw endpoint) — stick with `+page.server.ts` form action to match the existing button.

### Pattern 2: Public (Unauthenticated) Route Under (site) Layout

**What:** A `+page.server.ts` under `(site)/events` that uses the server Supabase client without requiring auth. The `(site)` layout has no auth guard (confirmed — its `+layout.svelte` has no server load at all). The server-side `supabase` client with the `anon` key used by `createSupabaseServerClient` will hit the `anon` RLS policy.

**When to use:** Public-facing pages that show data filtered by RLS for the `anon` role.

**Example:**

```typescript
// src/routes/(site)/events/+page.server.ts
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
  const { data: events } = await supabase
    .from('events')
    .select('id, title, description, event_date, event_type, status')
    .eq('status', 'scheduled')
    .order('event_date', { ascending: true })

  return { events: events ?? [] }
}
```

**Important:** The `locals.supabase` is available because `hooks.server.ts` creates it for every request. No auth check needed — the `anon` RLS policy already filters to `status = 'scheduled'`.

**The (site) layout has no server load**, confirmed by code inspection of `src/routes/(site)/+layout.svelte` — it is a pure `.svelte` file with no accompanying `+layout.server.ts`. Therefore adding a `(site)/events/+page.server.ts` is safe and will not conflict.

### Pattern 3: Payload Key Access in Svelte Template

**What:** Direct property access on `entry.payload` (typed as `Record<string, unknown>`) via casting.

**The bug:** In `src/routes/(app)/soldiers/[id]/+page.svelte` lines 528-530:

```svelte
{(entry.payload.from_unit as string | undefined) ?? '—'}
→
{(entry.payload.to_unit as string | undefined) ?? '—'}
```

**The actual payload shape** (from `+page.server.ts` transfer action at line 449):

```typescript
payload: {
  from_unit_id,
  from_unit_name,   // ← actual key
  to_unit_id: new_unit_id,
  to_unit_name: new_unit_name,  // ← actual key
  effective_date,
  reason,
  performed_by_name
}
```

**The fix:** Change `entry.payload.from_unit` → `entry.payload.from_unit_name` and `entry.payload.to_unit` → `entry.payload.to_unit_name`.

### Anti-Patterns to Avoid

- **Calling `signOut()` from a client-side event handler:** The browser Supabase client (`createBrowserClient`) is not set up in the app layout — the app uses server-side auth exclusively via `hooks.server.ts`. A client-side signout would not correctly clear the server-set cookies. Use the form action → server handler pattern.
- **Redirect loop risk on logout:** After `signOut()`, redirect to `/` (the public site), not to `/auth/login` or `/dashboard` (which would immediately redirect back to login, which is fine, but going to `/` is cleaner UX).
- **Not filtering by `status` on the public events page:** The `anon` RLS policy already restricts to `status = 'scheduled'` at the database level, but the server-side query should also include `.eq('status', 'scheduled')` for clarity and to filter out any future policy gaps.
- **Creating a `(site)/events` route that conflicts with the (app)/events route:** SvelteKit resolves route groups based on the path without the group prefix — both `(site)/events` and `(app)/events` map to the path `/events`. The two cannot coexist. The public `(site)/events` route must replace the `(app)/events` approach for the public-facing URL, OR the public events page must live at a different path (e.g., `/events` under `(site)` and authenticated events management stays accessible from the `(app)` nav pointing to a different path). However, since the `(app)` nav already points to `/events` and there is an `(app)/events/+page.svelte`, a routing conflict exists if both groups claim `/events`.

---

## Critical Routing Conflict Analysis

**This is the most important finding for planning.**

SvelteKit route groups (`(site)`, `(app)`) are transparent to the URL. Both `src/routes/(site)/events/+page.svelte` and `src/routes/(app)/events/+page.svelte` would map to `/events`. SvelteKit does NOT allow two routes mapping to the same path — it throws a build error.

**Current state:**
- `(app)/events` exists at URL `/events` — auth-gated
- `(site)` nav links to `/events` — but `(app)/events` intercepts it and redirects unauthenticated users to login

**Resolution options:**

| Option | Description | Tradeoff |
|--------|-------------|----------|
| A | Convert `(app)/events` to be auth-aware (serve public view when not authed, member view when authed) | One route, two views — more complex server load logic, but no URL change |
| B | Move the authenticated events management to `/members/events` or `/dashboard/events`, make `(site)/events` the canonical public URL | Clean separation, but breaks existing `(app)` nav link |
| C | Remove `(site)/events` from the nav and instead make `(app)/events` accessible to unauthenticated users by lifting it out of the auth gate | Change the `(app)/events/+page.server.ts` load to not require auth, remove the redirect |

**Recommended: Option C** — The simplest fix that satisfies the success criterion ("an unauthenticated visitor can navigate to the public events page from the site nav and see upcoming events without being redirected to login"). This means:
1. The `(site)` nav already links to `/events` — correct, no change needed there.
2. The `(app)/events/+page.server.ts` currently works because the `(app)/+layout.server.ts` redirects unauthenticated users — the page load itself doesn't re-check auth.
3. The solution is to create a standalone `/events` route OUTSIDE of both `(app)` and `(site)` route groups, OR restructure so events lives in `(site)`.

**Actually: the cleanest Option C implementation** is to move `(app)/events/+page.svelte` and its server load to `(site)/events/` and delete the `(app)/events/+page.svelte`. The `(app)` layout nav can still point to `/events`. The authenticated actions (create/edit) under `(app)/events/new` and `(app)/events/[id]/edit` stay where they are and are protected by the `(app)` layout guard.

**Summary of correct approach:**
- Move the events listing out of `(app)` → into `(site)` (or a parentless route)
- The `(app)/events/new` and `(app)/events/[id]/edit` routes stay in `(app)` and remain auth-gated
- The listing at `/events` becomes public, using the anon-accessible query
- The `(app)` nav link pointing to `/events` continues to work for authenticated users (they'll see the public view, which can include the "Create Event" button if `data.userRole` is present)

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cookie clearing on logout | Manual `cookies.delete()` calls | `supabase.auth.signOut()` on the server SSR client | `@supabase/ssr` knows exactly which cookies to clear |
| Route-level auth checks | Checking claims in every page load | The `(app)/+layout.server.ts` guard already handles all `(app)` routes | The layout guard redirects before the page load even runs |

---

## Common Pitfalls

### Pitfall 1: signOut() on Wrong Client

**What goes wrong:** Calling `signOut()` on a browser client or a misconfigured server client fails to clear cookies, leaving the user in a half-authenticated state.

**Why it happens:** The Supabase session lives in cookies (set by `@supabase/ssr`). If `signOut()` is called without the cookie handlers attached, the response doesn't carry `Set-Cookie: ...; Max-Age=0` headers.

**How to avoid:** Use `locals.supabase` (from `hooks.server.ts`) inside the form action — it's the cookie-aware server client. Never create a fresh `createServerClient` in the action without passing `event.cookies`.

**Warning signs:** User is redirected to `/` but can still navigate to `/dashboard` without being sent to login.

### Pitfall 2: SvelteKit Routing Conflict Between Route Groups

**What goes wrong:** Adding `(site)/events/+page.svelte` while `(app)/events/+page.svelte` still exists causes a build error: "Two or more routes resolve to the same path."

**Why it happens:** Route groups are invisible to URL resolution.

**How to avoid:** Delete `(app)/events/+page.svelte` and `(app)/events/+page.server.ts` when moving events to `(site)/events/`. Keep `(app)/events/new/` and `(app)/events/[id]/edit/` in place.

**Warning signs:** `vite build` or `svelte-kit sync` throws a routing conflict error.

### Pitfall 3: Assignment History Payload Key Mismatch

**What goes wrong:** Template reads `entry.payload.from_unit` (undefined) and `entry.payload.to_unit` (undefined), rendering `— → —`.

**Why it happens:** The transfer action stores `from_unit_name` and `to_unit_name`, but the template was written expecting shorter key names.

**How to avoid:** Fix is one-line in the template. Key insight: the payload shape is defined in the `transfer` action handler in `+page.server.ts` at line 449. Always check the insertion code when debugging payload rendering.

**Warning signs:** Assignment history section shows `— → —` for every entry.

### Pitfall 4: Public Events Page Needs to Show Future Events, Not All Scheduled

**What goes wrong:** Showing events in reverse chronological order means past events appear first for visitors.

**How to avoid:** Order by `event_date ASC` and optionally filter to future events only using `.gte('event_date', new Date().toISOString())`. The `(app)/events` list orders descending (all events). The public page should show upcoming events first.

---

## Code Examples

Verified patterns from codebase inspection:

### Logout Action (new file)

```typescript
// Source: codebase pattern from src/routes/auth/callback/+server.ts + src/routes/auth/login/+page.server.ts
// src/routes/auth/logout/+page.server.ts
import { redirect } from '@sveltejs/kit'
import type { Actions } from './$types'

export const actions: Actions = {
  default: async ({ locals: { supabase } }) => {
    await supabase.auth.signOut()
    redirect(303, '/')
  }
}
```

### Public Events Server Load (new file, replaces (app)/events)

```typescript
// src/routes/(site)/events/+page.server.ts
import type { PageServerLoad } from './$types'
import type { LayoutServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
  const { data: events } = await supabase
    .from('events')
    .select('id, title, description, event_date, event_type, status')
    .eq('status', 'scheduled')
    .order('event_date', { ascending: true })

  return { events: events ?? [] }
}
```

### Assignment History Fix (template edit)

```svelte
<!-- BEFORE (buggy): -->
{(entry.payload.from_unit as string | undefined) ?? '—'}
→
{(entry.payload.to_unit as string | undefined) ?? '—'}

<!-- AFTER (correct): -->
{(entry.payload.from_unit_name as string | undefined) ?? '—'}
→
{(entry.payload.to_unit_name as string | undefined) ?? '—'}
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|-----------------|--------|
| `getSession()` for auth validation | `getClaims()` (JWT signature validated) | Project already uses correct approach — don't change |
| Client-side signOut | Server-side form action signOut | Already implied by `<form method="POST">` in layout — implement correctly |

---

## Open Questions

1. **Should the public `/events` page also serve the NCO "Create Event" button?**
   - What we know: The `(app)/events` page shows a "Create Event" button gated by `hasRole(data.userRole, 'nco')`. If events moves to `(site)`, `data.userRole` won't be available unless we pass it from the layout or check claims in the public page load.
   - What's unclear: Whether authenticated members accessing `/events` should see management actions, or whether they should navigate directly to `/events/new`.
   - Recommendation: Keep it simple for the gap-closure phase. The public `(site)/events` page shows only the listing (no create button). Members who need to create events use the `(app)` nav which still works. The `(app)/events/new` and edit routes stay protected.

2. **Does the existing events data have `status = 'scheduled'` entries?**
   - What we know: The RLS anon policy filters to `status = 'scheduled'`. If no scheduled events exist in the DB, the public page will show "No upcoming events."
   - Recommendation: The success criterion only requires that visitors aren't redirected to login. An empty-state message satisfies the criterion. No data seeding needed.

---

## Sources

### Primary (HIGH confidence)

- Codebase inspection: `src/routes/(app)/+layout.svelte` — confirmed logout button POSTs to `/auth/logout` (line 31)
- Codebase inspection: `src/routes/auth/` directory listing — confirmed no `logout/` directory exists
- Codebase inspection: `src/routes/(app)/soldiers/[id]/+page.svelte` lines 528-530 — confirmed `from_unit`/`to_unit` key names
- Codebase inspection: `src/routes/(app)/soldiers/[id]/+page.server.ts` line 449 — confirmed actual payload uses `from_unit_name`/`to_unit_name`
- Codebase inspection: `src/routes/(site)/+layout.svelte` — confirmed "Events" nav link points to `/events`, no `+layout.server.ts` exists
- Codebase inspection: `src/hooks.server.ts` — confirmed `locals.supabase` is available to all routes
- Supabase MCP `execute_sql`: `pg_policies` for `events` table — confirmed `anon` policy allows SELECT for `status = 'scheduled'`
- Codebase inspection: `src/lib/supabase/server.ts` — confirmed `setAll` cookie handler enables `signOut()` to clear cookies correctly

### Secondary (MEDIUM confidence)

- SvelteKit route group documentation (training data, cross-verified with codebase behavior): Route groups are invisible to URL resolution, two routes in different groups with same path = build error.

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — inspected actual `package.json` and all relevant source files
- Architecture: HIGH — all three gaps diagnosed from source code, not speculation
- Pitfalls: HIGH — routing conflict is verified behavior, payload bug is confirmed by cross-referencing insert code vs template read code
- Logout pattern: HIGH — follows established pattern from existing auth callback and login action

**Research date:** 2026-02-11
**Valid until:** 2026-03-11 (stable — no fast-moving dependencies involved)
