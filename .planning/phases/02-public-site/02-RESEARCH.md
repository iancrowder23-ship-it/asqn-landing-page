# Phase 2: Public Site - Research

**Researched:** 2026-02-11
**Domain:** SvelteKit route groups, Tailwind v4 theming, Superforms + Zod v4, Supabase anon RLS, ORBAT tree rendering
**Confidence:** HIGH (all major findings verified against official docs or current source)

---

## Summary

Phase 2 builds the public-facing site on top of the Phase 1 foundation. The existing codebase has SvelteKit 2 + Svelte 5 (runes), `@supabase/ssr` with a server client injected via `hooks.server.ts`, Tailwind v4 CSS-first (single `@import "tailwindcss"` in `app.css`), and `adapter-node`. None of the public-facing libraries (sveltekit-superforms, Zod) are installed yet — they must be added in Plan 02-01 setup.

The database schema has important findings: an `enlistments` table does NOT exist in the Phase 1 migrations. The schema contains an `applications` table (from a prior project's type file) but it is NOT in the Phase 1 migration SQL — it exists only in the legacy `database.ts` type file that was generated from the old project. Phase 2 must create a new `enlistments` table via migration. The existing `soldiers`, `ranks`, `units` tables need new anon-readable RLS policies. All existing policies are `to authenticated` only — the `anon` role cannot currently read anything.

The unit context is ASQN 1st SFOD (Delta Force / SF), Squadron A, Arma 3. US Army SF uses standard Army enlisted ranks (E-1 through E-9) plus warrant officers (WO1/CW2-CW5). Officer ranks are not relevant for an Arma SF unit roster (operators are NCOs and WOs; the CO is an O-3 captain at most).

**Primary recommendation:** Add a single new migration for anon RLS policies + enlistments table, install superforms + zod, and build the `(site)` route group with SSR load functions that use `event.locals.supabase` (already available from hooks).

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| sveltekit-superforms | ^2.29.1 | Form state, validation, progressive enhancement | De facto SvelteKit form library; handles error display, constraints, and server/client symmetry |
| zod | ^3.x (install latest v3) | Schema validation | zod4 adapter requires Zod v4 import path (`z.email()` not `z.string().email()`) — see note below |
| @sveltejs/kit | ^2.50.2 | Already installed | Route groups, SSR load functions |
| tailwindcss | ^4.1.18 | Already installed | CSS-first theming |

**Zod version note:** Superforms v2.26+ added a `zod4` adapter that works with Zod v4's new API (`z.email()`, `z.url()` as top-level, not methods). However, the standard Zod v3 API still works with the existing `zod` adapter. Use Zod v4 with the `zod4` adapter since the project decision is "Zod v4." Install with `npm install zod` — Zod v4 is now the default package version.

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None beyond above | — | — | No additional libraries needed for Phase 2 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom form handler | sveltekit-superforms | Hand-rolling loses progressive enhancement, constraint propagation, error state management |
| Zod v3 adapter (`zod`) | Zod v4 adapter (`zod4`) | Project decision is Zod v4 — use `zod4` from `sveltekit-superforms/adapters` |

**Installation:**
```bash
npm install sveltekit-superforms zod
```

---

## Architecture Patterns

### Recommended Project Structure
```
src/routes/
├── (app)/                    # Existing auth-gated group — unchanged
│   ├── +layout.server.ts     # Redirects unauthenticated to /auth/login
│   └── dashboard/+page.svelte
├── (site)/                   # New public group — no auth redirect
│   ├── +layout.svelte        # Site chrome: nav, footer, tactical theme
│   ├── +layout.server.ts     # Load shared data (ranks for nav, etc.) — optional
│   ├── +page.svelte          # Landing page (/)
│   ├── about/+page.svelte
│   ├── leadership/
│   │   ├── +page.svelte
│   │   └── +page.server.ts   # Load leadership soldiers from Supabase
│   ├── orbat/
│   │   ├── +page.svelte
│   │   └── +page.server.ts   # Load units + soldiers tree
│   ├── rank-chart/
│   │   ├── +page.svelte
│   │   └── +page.server.ts   # Load ranks ordered by sort_order
│   ├── enlist/
│   │   ├── +page.svelte      # Superforms form
│   │   └── +page.server.ts   # superValidate + anon Supabase insert
│   ├── events/
│   │   ├── +page.svelte
│   │   └── +page.server.ts   # Load operations (upcoming)
│   ├── roster/
│   │   ├── +page.svelte
│   │   └── +page.server.ts   # Load active soldiers (name + rank only)
│   └── contact/+page.svelte  # Static — Discord link, no server load
├── auth/                     # Existing — unchanged
│   ├── callback/+server.ts
│   └── login/+page.svelte
└── +layout.svelte            # Root layout (imports app.css)
```

### Pattern 1: Route Group Isolation
**What:** `(site)` and `(app)` are parallel route groups. Parenthetical folder names are stripped from URLs. Each group has its own `+layout.svelte` and optionally `+layout.server.ts`.
**When to use:** When two sections of an app need different layouts and different authentication requirements.
**Example:**
```
src/routes/(site)/+layout.svelte     → renders at /
src/routes/(app)/+layout.server.ts   → redirects unauthenticated users
```
The root `src/routes/+layout.svelte` (already exists) applies to ALL routes including both groups. It currently only imports `app.css` — keep it that way.

Key rule: `(site)/+layout.server.ts` must NOT redirect unauthenticated visitors. It can load shared data (e.g., site config) but must return normally for all visitors.

### Pattern 2: SSR Load Functions with Existing Supabase Client
**What:** `event.locals.supabase` is already injected by `hooks.server.ts`. All `+page.server.ts` load functions use it directly. No new client setup needed.
**When to use:** Every page that reads from Supabase (ranks, soldiers, units, operations).
**Example:**
```typescript
// Source: existing hooks.server.ts pattern
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
  const { data: ranks, error } = await supabase
    .from('ranks')
    .select('id, name, abbreviation, sort_order, insignia_url')
    .order('sort_order', { ascending: true })

  if (error) {
    // Return empty rather than throwing — public pages should degrade gracefully
    return { ranks: [] }
  }

  return { ranks }
}
```

The `supabase` client in locals uses the Supabase publishable (anon) key. It executes queries as the `anon` role unless a session cookie is present. For public pages, the anon role is correct.

### Pattern 3: Superforms with Zod v4 — Enlistment Form
**What:** Server defines schema + load + action. Client uses `superForm()` with `use:enhance`.
**When to use:** The enlistment form (Plan 02-03).
**Example:**
```typescript
// Source: superforms.rocks/get-started/zod4 (verified 2026-02-11)
// +page.server.ts

import { z } from 'zod'
import { superValidate, message } from 'sveltekit-superforms'
import { zod4 } from 'sveltekit-superforms/adapters'
import { fail } from '@sveltejs/kit'
import type { PageServerLoad, Actions } from './$types'

// Define schema OUTSIDE load — enables adapter caching
const enlistmentSchema = z.object({
  display_name: z.string().min(2).max(50),
  discord_username: z.string().min(2).max(50),
  age: z.number().int().min(16).max(99),
  timezone: z.string().min(1),
  arma_experience: z.string().min(10).max(1000),
  why_join: z.string().min(10).max(2000),
  referred_by: z.string().optional(),
})

export const load: PageServerLoad = async () => {
  const form = await superValidate(zod4(enlistmentSchema))
  return { form }
}

export const actions: Actions = {
  default: async ({ request, locals: { supabase } }) => {
    const form = await superValidate(request, zod4(enlistmentSchema))

    if (!form.valid) {
      return fail(400, { form })
    }

    const { error } = await supabase
      .from('enlistments')
      .insert({
        display_name: form.data.display_name,
        discord_username: form.data.discord_username,
        // ...other fields
        status: 'pending',
      })

    if (error) {
      return message(form, 'Submission failed. Please try again.', { status: 500 })
    }

    return message(form, 'Application submitted! We will contact you on Discord.')
  }
}
```

```svelte
<!-- Source: superforms.rocks/get-started/zod4 (verified 2026-02-11) -->
<!-- +page.svelte -->
<script lang="ts">
  import { superForm } from 'sveltekit-superforms'

  let { data } = $props()
  const { form, errors, constraints, message, enhance } = superForm(data.form)
</script>

<form method="POST" use:enhance>
  {#if $message}<p class="...">{$message}</p>{/if}

  <input
    type="text"
    name="display_name"
    bind:value={$form.display_name}
    {...$constraints.display_name} />
  {#if $errors.display_name}<span>{$errors.display_name}</span>{/if}

  <button type="submit">Submit Application</button>
</form>
```

### Pattern 4: ORBAT Tree — Recursive Component
**What:** `units` table is self-referential (`parent_unit_id`). Load the entire flat array, build a tree in load, render recursively in Svelte.
**When to use:** ORBAT page (Plan 02-04).

In Svelte 5, `<svelte:self>` is deprecated. The correct approach is to import the component into itself:

```svelte
<!-- OrbatNode.svelte -->
<script lang="ts">
  import OrbatNode from './OrbatNode.svelte'  // ← import self by name

  let { unit, children }: {
    unit: { id: string; name: string; abbreviation: string | null }
    children: any[]
  } = $props()
</script>

<div class="orbat-node">
  <div class="unit-box">{unit.abbreviation ?? unit.name}</div>
  {#if children.length > 0}
    <div class="children">
      {#each children as child}
        <OrbatNode unit={child.unit} children={child.children} />
      {/each}
    </div>
  {/if}
</div>
```

Build the tree structure in the server load function (not the component):
```typescript
// In +page.server.ts
function buildTree(units: Unit[], parentId: string | null = null): TreeNode[] {
  return units
    .filter(u => u.parent_unit_id === parentId)
    .map(u => ({
      unit: u,
      soldiers: soldiers.filter(s => s.unit_id === u.id),
      children: buildTree(units, u.id),
    }))
}
```

### Pattern 5: Tailwind v4 Tactical Dark Theme
**What:** CSS-first theme using `@theme` directive in `app.css`. Dark mode via `@custom-variant dark` (class-based, not media query) since this site is always dark.
**When to use:** Plan 02-01 route setup. Apply custom colors in `@theme`, use `dark:` utilities, add dark class to `<html>`.

```css
/* app.css */
@import "tailwindcss";

/* Always-dark site: override dark variant to be class-based */
@custom-variant dark (&:where(.dark, .dark *));

@theme {
  /* Tactical color palette — SOF dark aesthetic */
  --color-od-green: oklch(0.38 0.07 130);       /* Olive Drab */
  --color-od-green-dark: oklch(0.28 0.06 130);
  --color-ranger-tan: oklch(0.72 0.08 80);       /* Ranger Tan */
  --color-ranger-tan-muted: oklch(0.55 0.05 80);
  --color-steel: oklch(0.45 0.02 220);           /* Steel grey */
  --color-night: oklch(0.12 0.01 220);           /* Near-black background */
  --color-night-surface: oklch(0.17 0.01 220);   /* Card/surface */
  --color-alert-red: oklch(0.55 0.2 25);         /* Warning/CTA accent */

  /* Typography */
  --font-mono-tactical: 'Share Tech Mono', 'Courier New', monospace;
}
```

Add `class="dark"` to `<html>` in `app.html` (since the site is always dark):
```html
<!-- src/app.html -->
<!doctype html>
<html lang="en" class="dark">
```

### Anti-Patterns to Avoid
- **`+layout.server.ts` in `(site)` that redirects**: A `(site)` layout server file that calls `redirect()` on missing auth would break all public pages. Only the `(app)` layout redirects.
- **Using `getClaims()` in public pages**: `getClaims()` validates JWT and makes a Supabase Auth request. Public pages don't need it. Use `event.locals.supabase` directly for data queries.
- **Calling `supabase.auth.getUser()` in load functions**: This is a network call per page load. Not needed for public data reads. Reserve for auth-gated sections.
- **Defining Zod schema inside `load()`**: Defeats adapter caching. Always define schema at module scope.
- **Using `<svelte:self>`**: Deprecated in Svelte 5 runes mode. Import component by name into itself instead.
- **Building ORBAT tree in the component**: Build the tree structure in the server load function, pass shaped data to the component.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Form validation + error state | Custom form handler + error object | sveltekit-superforms | Handles constraint propagation, nested errors, progressive enhancement, server/client symmetry |
| Form progressive enhancement | Manual `fetch` + JSON response | `use:enhance` from superforms | Handles file uploads, redirects, failed responses, pending state |
| Zod schema → HTML constraints | Manual `required`, `minlength` mapping | `$constraints` from superForm | Auto-derived from Zod schema |
| Tree structure from flat array | Recursive SQL query | Build in load function, flat SQL | Simpler, avoids recursive CTEs, easier to type |

**Key insight:** Superforms eliminates 80% of form boilerplate. The pattern `superValidate(zod4(schema))` → `fail(400, { form })` → `use:enhance` covers all cases including error display and success messages.

---

## Common Pitfalls

### Pitfall 1: Anon Role Cannot Read Existing Tables
**What goes wrong:** The `anon` Supabase role hits public pages. All existing RLS policies in `20260211000001_rls_policies.sql` are `to authenticated` only. Anon reads of `ranks`, `soldiers`, `units` will return empty arrays or errors.
**Why it happens:** Supabase RLS defaults to deny-all when no policy matches. `anon` is a separate role from `authenticated`.
**How to avoid:** Create a new migration with anon-readable policies for public tables:
```sql
-- New migration: 20260211000003_anon_rls_policies.sql

-- ranks: anon can read (for rank chart)
create policy "Anon can read ranks"
  on public.ranks for select
  to anon
  using (true);

-- units: anon can read (for ORBAT)
create policy "Anon can read units"
  on public.units for select
  to anon
  using (true);

-- soldiers: anon can read active soldiers (partial roster — name + rank only)
-- Column-level restriction done at query level (SELECT display_name, rank_id), not RLS
create policy "Anon can read active soldiers"
  on public.soldiers for select
  to anon
  using (status = 'active');
```
**Warning signs:** Supabase queries return `[]` on public pages even though data exists in the dashboard.

### Pitfall 2: Enlistments Table Does Not Exist
**What goes wrong:** The `database.ts` type file (generated from the old project) contains `applications`, `profiles`, `operations`, and many other tables that do NOT exist in the Phase 1 migrations. Only these 5 tables exist from Phase 1 migrations: `ranks`, `units`, `soldiers`, `service_records`, `user_roles`.
**Why it happens:** The type file was carried over from a prior schema and represents a different (older) database. The actual migrations only create 5 tables.
**How to avoid:** Phase 2 must create an `enlistments` table via a new migration. Do NOT use `applications` table — it has wrong schema and doesn't exist in the actual DB.
**Warning signs:** Supabase insert throws "relation does not exist" error.

### Pitfall 3: Operations Table Does Not Exist for Events Page
**What goes wrong:** The events page (SITE-08) shows upcoming operations. An `operations` table is referenced in `database.ts` but does NOT exist in Phase 1 migrations.
**Why it happens:** Same as Pitfall 2 — the type file is from the old project.
**How to avoid:** Phase 2 must create a minimal `events` or `operations` table as part of its migration. Alternatively, Plan 02-04 (events + roster) explicitly creates this.
**Warning signs:** Compile errors referencing `supabase.from('operations')` since the type file may or may not include this.

### Pitfall 4: `(site)` Route vs Root Route Conflict
**What goes wrong:** The existing `src/routes/+page.svelte` (root) conflicts with `src/routes/(site)/+page.svelte` (landing page inside the group).
**Why it happens:** Both map to URL `/`. SvelteKit will error on ambiguous routes.
**How to avoid:** Move or replace the existing `src/routes/+page.svelte` — either delete it (replaced by `(site)/+page.svelte`) or keep it and don't create `(site)/+page.svelte`. The current root `+page.svelte` appears to be a placeholder.
**Warning signs:** SvelteKit build error: "ambiguous route match."

### Pitfall 5: Superforms `$form` and `$errors` Are Stores (Svelte 5 Runes)
**What goes wrong:** In Svelte 5 runes mode, `superForm()` returns Svelte stores (prefixed with `$` to subscribe). Accessing `form.name` instead of `$form.name` yields the store object, not the value.
**Why it happens:** Superforms uses Svelte stores internally. In Svelte 5, reactive stores still use `$` prefix in templates.
**How to avoid:** Always use `$form.field`, `$errors.field`, `$constraints.field` in templates. In `<script>` blocks, same — use `$form` when reading reactively.
**Warning signs:** Form fields show `[object Object]` instead of values.

### Pitfall 6: anon INSERT Requires Explicit RLS Policy
**What goes wrong:** The enlistments table INSERT from an unauthenticated visitor fails with 401/403 even though the table exists.
**Why it happens:** RLS is enabled on all tables. No policy = deny all. Both a SELECT and INSERT policy are needed for the anon role. (A quirk: INSERT operations need a SELECT policy too for RLS to work correctly with `returning`.)
**How to avoid:**
```sql
-- For enlistments table
create policy "Anon can submit enlistments"
  on public.enlistments for insert
  to anon
  with check (true);

-- Also add select (needed for Supabase client to process response)
create policy "Anon cannot read enlistments"
  on public.enlistments for select
  to anon
  using (false);  -- or omit entirely — returning: 'minimal' avoids this
```
Use `.insert({...})` without `.select()` on the client to avoid the SELECT requirement, or use `returning: 'minimal'`.

---

## Code Examples

Verified patterns from official sources:

### SSR Load Function — Ranks Page
```typescript
// Source: Supabase SvelteKit SSR docs + existing hooks.server.ts pattern
// src/routes/(site)/rank-chart/+page.server.ts
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
  const { data: ranks } = await supabase
    .from('ranks')
    .select('id, name, abbreviation, sort_order, insignia_url')
    .order('sort_order', { ascending: true })

  return { ranks: ranks ?? [] }
}
```

### SSR Load Function — Partial Roster (Column Restriction)
```typescript
// Restrict columns at query level — don't expose discord_id, user_id, etc.
// src/routes/(site)/roster/+page.server.ts
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
  const { data: soldiers } = await supabase
    .from('soldiers')
    .select(`
      display_name,
      callsign,
      mos,
      ranks ( name, abbreviation, sort_order ),
      units ( name, abbreviation )
    `)
    .eq('status', 'active')
    .order('sort_order', { referencedTable: 'ranks', ascending: false })

  return { soldiers: soldiers ?? [] }
}
```

### SSR Load Function — ORBAT Tree Build
```typescript
// src/routes/(site)/orbat/+page.server.ts
import type { PageServerLoad } from './$types'

type Unit = { id: string; name: string; abbreviation: string | null; parent_unit_id: string | null }
type Soldier = { display_name: string; callsign: string | null; unit_id: string | null; ranks: { name: string; abbreviation: string } | null }

interface TreeNode {
  unit: Unit
  soldiers: Soldier[]
  children: TreeNode[]
}

function buildTree(units: Unit[], soldiers: Soldier[], parentId: string | null = null): TreeNode[] {
  return units
    .filter(u => u.parent_unit_id === parentId)
    .map(u => ({
      unit: u,
      soldiers: soldiers.filter(s => s.unit_id === u.id),
      children: buildTree(units, soldiers, u.id),
    }))
}

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
  const [{ data: units }, { data: soldiers }] = await Promise.all([
    supabase.from('units').select('id, name, abbreviation, parent_unit_id'),
    supabase.from('soldiers').select('display_name, callsign, unit_id, ranks(name, abbreviation)').eq('status', 'active'),
  ])

  const tree = buildTree(units ?? [], soldiers ?? [])
  return { tree }
}
```

### Tailwind v4 Dark Tactical Theme in app.css
```css
/* Source: tailwindcss.com/docs/theme + tailwindcss.com/docs/dark-mode (verified 2026-02-11) */
@import "tailwindcss";

/* Class-based dark mode — site is always dark, add class="dark" to <html> */
@custom-variant dark (&:where(.dark, .dark *));

@theme {
  /* Core tactical palette */
  --color-night: oklch(0.12 0.01 220);
  --color-night-surface: oklch(0.17 0.01 220);
  --color-night-border: oklch(0.25 0.01 220);
  --color-od-green: oklch(0.38 0.07 130);
  --color-od-green-light: oklch(0.52 0.09 130);
  --color-ranger-tan: oklch(0.72 0.08 80);
  --color-steel: oklch(0.55 0.02 220);
  --color-alert: oklch(0.62 0.18 25);

  /* Monospace tactical font stack */
  --font-tactical: 'Share Tech Mono', 'Courier New', monospace;
}
```

### Enlistments Migration Schema
```sql
-- New migration: 20260211000003_phase2_public_site.sql
-- Creates enlistments table + anon RLS policies for public reads

create table public.enlistments (
  id              uuid primary key default gen_random_uuid(),
  display_name    text not null,
  discord_username text not null,
  age             int,
  timezone        text,
  arma_experience text,
  why_join        text not null,
  referred_by     text,
  status          text not null default 'pending'
                    check (status in ('pending', 'reviewing', 'accepted', 'rejected')),
  submitted_at    timestamptz not null default now(),
  reviewed_at     timestamptz,
  reviewed_by     uuid references auth.users(id) on delete set null,
  notes           text
);
alter table public.enlistments enable row level security;

-- Anon can submit (INSERT only — no SELECT)
create policy "Anon can submit enlistments"
  on public.enlistments for insert
  to anon
  with check (true);

-- NCO+ can review enlistments
create policy "NCO and above can read enlistments"
  on public.enlistments for select
  to authenticated
  using (
    (select (auth.jwt() ->> 'user_role')::public.app_role)
      in ('nco', 'command', 'admin')
  );

-- Public read policies for existing tables
create policy "Anon can read ranks"
  on public.ranks for select
  to anon
  using (true);

create policy "Anon can read units"
  on public.units for select
  to anon
  using (true);

create policy "Anon can read active soldiers"
  on public.soldiers for select
  to anon
  using (status = 'active');
```

### US Army SF Rank Reference Data
The following enlisted and warrant officer ranks should be seeded into the `ranks` table (sort_order ascending = lower rank first):

**Enlisted (E-1 to E-9):**
```
sort_order  name                      abbreviation
1           Private                   PV1
2           Private                   PV2
3           Private First Class       PFC
4           Specialist                SPC
5           Corporal                  CPL
6           Sergeant                  SGT
7           Staff Sergeant            SSG
8           Sergeant First Class      SFC
9           Master Sergeant           MSG
10          First Sergeant            1SG
11          Sergeant Major            SGM
12          Command Sergeant Major    CSM
```

**Warrant Officers (W-1 to W-5) — SF-specific 180A MOS:**
```
sort_order  name                      abbreviation
13          Warrant Officer 1         WO1
14          Chief Warrant Officer 2   CW2
15          Chief Warrant Officer 3   CW3
16          Chief Warrant Officer 4   CW4
17          Chief Warrant Officer 5   CW5
```

**Officer (for leadership display only — O-1 to O-6):**
```
sort_order  name                      abbreviation
18          Second Lieutenant         2LT
19          First Lieutenant          1LT
20          Captain                   CPT
21          Major                     MAJ
22          Lieutenant Colonel        LTC
23          Colonel                   COL
```

In an Arma 3 SF unit, active operators will be E-5 through W-5 in practice. Include all ranks for completeness.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `zod` adapter | `zod4` adapter (from sveltekit-superforms/adapters) | Superforms v2.26.0 | `z.email()` is now a standalone function in Zod v4, not `.string().email()` |
| `tailwind.config.ts` + `darkMode: 'class'` | `@custom-variant dark` in CSS | Tailwind v4 | No config file; dark mode is a CSS concern |
| `<svelte:self>` for recursion | Import component by filename | Svelte 5 | `svelte:self` is deprecated in runes mode |
| `getSession()` for auth | `getClaims()` | Current Supabase SSR | `getSession()` trusts unvalidated cookie; `getClaims()` validates JWT (already implemented in hooks.server.ts) |

**Deprecated/outdated:**
- `tailwind.config.ts` with `darkMode: 'class'`: No longer used in v4. Replace with `@custom-variant dark` in CSS.
- `<svelte:self>`: Works in compatibility mode but not in runes mode. Use named self-import.
- `zod` adapter with Zod v4: May work but is not the intended path. Use `zod4` adapter.

---

## Open Questions

1. **Events table schema**
   - What we know: `operations` table in the legacy `database.ts` type file has fields like `operation_date`, `operation_type`, `status`, `name`, `description`
   - What's unclear: Whether to reuse the `operations` table name/schema exactly, or create a simpler `events` table for Phase 2
   - Recommendation: Create a minimal `events` table (id, title, description, event_date, event_type, status) in the Phase 2 migration rather than the full `operations` schema. The full operational management system is likely a later phase.

2. **Insignia images for rank chart**
   - What we know: `ranks.insignia_url` is nullable — images not yet uploaded
   - What's unclear: Will Phase 2 need to populate insignia images?
   - Recommendation: Render ranks without insignia images for Phase 2. Use text abbreviations and rank names only. Add a note in the rank chart: "insignia images pending." This is design content, not blocking functionality.

3. **Leadership page data source**
   - What we know: `soldiers` has `display_name`, `rank_id`, `unit_id`, `callsign`, `mos`. There is no explicit "leadership" flag on soldiers.
   - What's unclear: How to identify leadership positions without a `billets` or leadership flag.
   - Recommendation: For Phase 2, filter soldiers by `unit_id` of the top-level unit AND by rank (e.g., WO1+ or SFC+). Alternatively, add a `is_leadership` boolean to soldiers (one-field migration). Document this ambiguity for the planner.

4. **Root +page.svelte conflict**
   - What we know: `src/routes/+page.svelte` exists. `src/routes/(site)/+page.svelte` would also map to `/`.
   - What's unclear: Plan 02-01 will need to decide whether to replace or remove the root page.
   - Recommendation: Replace (delete) `src/routes/+page.svelte` and create `src/routes/(site)/+page.svelte` as the new landing page. The existing root page appears to be a placeholder stub.

---

## Sources

### Primary (HIGH confidence)
- `src/hooks.server.ts` — existing Supabase server client pattern
- `supabase/migrations/20260211000000_initial_schema.sql` — actual table definitions (5 tables)
- `supabase/migrations/20260211000001_rls_policies.sql` — existing policies (authenticated only)
- `src/lib/types/database.ts` — full generated type file (contains legacy tables NOT in migrations)
- `tailwindcss.com/docs/theme` — @theme directive, CSS custom properties (verified 2026-02-11)
- `tailwindcss.com/docs/dark-mode` — @custom-variant dark syntax (verified 2026-02-11)
- `superforms.rocks/get-started/zod4` — zod4 adapter, full server + client pattern (verified 2026-02-11)

### Secondary (MEDIUM confidence)
- GitHub: `ciscoheat/sveltekit-superforms/releases` — v2.26.0 added zod4 adapter, latest is v2.29.1
- `svelte.dev/docs/svelte/legacy-overview` — svelte:self is deprecated in runes mode
- `svelte.dev/docs/svelte/v5-migration-guide` — named self-import as recursive component pattern
- `supabase.com/docs/guides/database/postgres/row-level-security` — anon role policies

### Tertiary (LOW confidence — needs validation)
- Rank seed data sort order: derived from Army.mil + standard knowledge; verify with unit leadership that the rank list is complete and correct for their context
- Leadership page filter strategy: no official source — derived from schema analysis

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified packages, versions from npm/releases page
- Architecture: HIGH — route groups verified against SvelteKit docs, Supabase patterns verified against existing codebase
- Pitfalls: HIGH (anon RLS, missing tables) verified against actual migration SQL; MEDIUM (superforms stores behavior) from docs
- SF rank data: MEDIUM — from army.mil and combatoperators.com, verified as standard Army ranks

**Research date:** 2026-02-11
**Valid until:** 2026-03-13 (30 days — stable libraries; Superforms/Zod are active but not breaking-change-prone)
