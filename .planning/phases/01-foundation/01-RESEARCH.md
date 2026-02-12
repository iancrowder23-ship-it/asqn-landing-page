# Phase 1: Foundation - Research

**Researched:** 2026-02-11
**Domain:** SvelteKit project scaffolding, Supabase Discord OAuth, @supabase/ssr session management, Custom Access Token Hook, RLS schema design, adapter-node + Docker
**Confidence:** HIGH

---

## Summary

Phase 1 delivers the complete infrastructure that every subsequent phase depends on: a working SvelteKit 2 + Svelte 5 project, Discord OAuth via Supabase, cookie-based session management in `hooks.server.ts`, the core database schema with RLS enabled on every table, and the Custom Access Token Hook that injects `user_role` into the JWT for zero-round-trip RLS policy evaluation.

The four sub-plans (01-01 through 01-04) must be executed in order. Scaffolding establishes the project structure and toolchain. Discord OAuth and session management establish the auth primitives that every protected route needs. The database schema and RLS policies must be locked before any feature queries run — changing RLS mid-feature breaks queries silently and without error. The Custom Access Token Hook is the keystone: without it, RLS policies have no `user_role` claim to evaluate and every policy that checks role requires an additional DB round-trip.

The two irreversible decisions made in this phase are: (1) the `user_roles` table structure and `app_role` enum — these are referenced in the JWT and in every RLS policy — and (2) the `soldiers` / `service_records` schema where service records are append-only from day one. Once data exists in these tables, changing the schema is a data migration, not a code change.

**Primary recommendation:** Build 01-01 → 01-02 → 01-03 → 01-04 in strict order. Never test RLS via the Supabase SQL Editor. Verify every table has RLS enabled after every migration with `SELECT tablename FROM pg_tables WHERE schemaname = 'public'` cross-referenced against `pg_policies`.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| SvelteKit | ^2.50.2 | Full-stack app framework with SSR | SSR for public pages, form actions for mutations, `hooks.server.ts` for auth middleware |
| Svelte | ^5.50.1 | UI framework with runes | Compile-time reactivity, no VDOM, `$state`/`$derived`/`$effect` runes replace stores |
| @supabase/supabase-js | ^2.95.3 | Supabase SDK | Single SDK for Postgres queries, Discord OAuth, file storage |
| @supabase/ssr | ^0.8.0 | Cookie-based SSR session management | Official successor to deprecated `auth-helpers`; required for RLS to fire on server-rendered pages |
| Tailwind CSS | ^4.1.18 | Utility-first CSS | v4 uses Vite plugin, no config file, CSS-native variables, zero runtime JS |
| @tailwindcss/vite | ^4.1.18 | Tailwind v4 Vite integration | Required; must be placed BEFORE `sveltekit()` in `vite.config.ts` plugins array |
| @sveltejs/adapter-node | ^5.5.2 | Node.js/Docker deployment adapter | Compiles to standalone Node server; Docker-on-VPS deployment |
| TypeScript | ^5.x | Type safety | Generate DB types with `supabase gen types typescript`; catches schema mismatches at compile time |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| supabase (CLI) | latest | Local dev stack, migrations, type generation | `supabase start` for local dev; `supabase gen types typescript` after schema changes |
| ESLint + svelte-eslint-parser | latest | Linting | Catches Svelte 5 rune misuse and TypeScript errors |
| Prettier + prettier-plugin-svelte | latest | Code formatting | Standard in SvelteKit ecosystem |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @supabase/ssr | @supabase/auth-helpers-sveltekit | auth-helpers is officially deprecated — do not use on new projects |
| adapter-node | adapter-vercel / adapter-netlify | Valid for hosted deployment but VPS + Docker keeps costs near-zero and data sovereign |
| Tailwind v4 | Tailwind v3 with PostCSS | v3 works but requires `tailwind.config.js` and PostCSS setup; v4 is zero-config with Vite plugin |

### Installation

```bash
# Scaffold SvelteKit 2 + Svelte 5 project
npx sv create asqn-site
# Choose: TypeScript, ESLint, Prettier, adapter-node

# Auth and Supabase
npm install @supabase/supabase-js @supabase/ssr

# Tailwind CSS v4
npm install tailwindcss @tailwindcss/vite

# Dev tools
npm install -D supabase
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── lib/
│   ├── supabase/
│   │   ├── client.ts          # createBrowserClient — browser-only
│   │   └── server.ts          # createServerClient factory — server-only
│   ├── auth/
│   │   └── roles.ts           # app_role enum constants + role hierarchy helpers
│   └── types/
│       └── database.ts        # supabase gen types output — never hand-edit
├── routes/
│   ├── auth/
│   │   ├── callback/
│   │   │   └── +server.ts     # OAuth code exchange handler
│   │   └── login/
│   │       └── +page.svelte   # Discord login button
│   ├── (app)/                 # Auth-required route group
│   │   ├── +layout.server.ts  # Session guard — redirects to /auth/login if no session
│   │   └── dashboard/
│   │       └── +page.svelte   # Post-login landing (stub in Phase 1)
│   └── +layout.svelte         # Root layout — imports app.css
├── app.css                    # @import "tailwindcss";
├── app.d.ts                   # Supabase locals type declarations
└── hooks.server.ts            # Supabase client + session + role on every request
```

### Pattern 1: hooks.server.ts — Supabase Client Attached to Every Request

**What:** `hooks.server.ts` runs before every route. It creates a request-scoped Supabase server client with cookie handling, attaches it to `event.locals`, and exposes a `getSession()` helper. The `handle` function also calls session refresh so tokens stay alive across browser refreshes.

**When to use:** This is the foundation of all auth in SvelteKit. Every subsequent page's `+page.server.ts` load function accesses `event.locals.supabase` instead of creating its own client.

**Example:**
```typescript
// Source: https://github.com/j4w8n/sveltekit-supabase-ssr + official Supabase SSR docs
// src/hooks.server.ts
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY } from '$env/static/public'
import { createServerClient } from '@supabase/ssr'
import type { Handle } from '@sveltejs/kit'

export const handle: Handle = async ({ event, resolve }) => {
  event.locals.supabase = createServerClient(
    PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => event.cookies.getAll(),
        setAll: (cookies) => {
          cookies.forEach(({ name, value, options }) => {
            event.cookies.set(name, value, { ...options, path: '/' })
          })
        }
      }
    }
  )

  // IMPORTANT: Use getClaims(), NOT getSession() — getSession() trusts
  // unvalidated cookie data; getClaims() validates the JWT signature.
  event.locals.getClaims = async () => {
    const { data: { claims } } = await event.locals.supabase.auth.getClaims()
    return claims
  }

  return resolve(event, {
    filterSerializedResponseHeaders(name) {
      return name === 'content-range' || name === 'x-supabase-api-version'
    }
  })
}
```

**Required `app.d.ts` declaration:**
```typescript
// src/app.d.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '$lib/types/database'

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient<Database>
      getClaims: () => Promise<Record<string, unknown> | null>
    }
  }
}
export {}
```

### Pattern 2: Auth Callback Route — Discord OAuth Code Exchange

**What:** Discord OAuth redirects back to `/auth/callback?code=...`. This server route exchanges the code for a session, sets the auth cookies, and redirects to the protected area.

**When to use:** Required for any OAuth provider. This route must be registered as the redirect URL in both the Discord Developer Portal and in Supabase Auth settings.

**Example:**
```typescript
// Source: Supabase Discord OAuth docs + official SSR pattern
// src/routes/auth/callback/+server.ts
import { redirect } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

export const GET: RequestHandler = async ({ url, locals: { supabase } }) => {
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next') ?? '/dashboard'

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      redirect(303, `/${next.slice(1)}`)
    }
  }

  // Auth failed — redirect to login with error indicator
  redirect(303, '/auth/login?error=auth_failed')
}
```

### Pattern 3: Discord OAuth Sign-In Button

**What:** The browser-side sign-in call that redirects to Discord for authorization.

**Example:**
```typescript
// Source: https://supabase.com/docs/guides/auth/social-login/auth-discord
// src/routes/auth/login/+page.server.ts
import { createBrowserClient } from '@supabase/ssr'
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY } from '$env/static/public'

// In the component action or a +page.server.ts action:
export const actions = {
  login: async ({ url }) => {
    const supabase = createBrowserClient(
      PUBLIC_SUPABASE_URL,
      PUBLIC_SUPABASE_PUBLISHABLE_KEY
    )
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: `${url.origin}/auth/callback`,
      }
    })
    // data.url is the Discord OAuth URL — redirect the browser to it
    return { url: data.url }
  }
}
```

### Pattern 4: Session-Gated Route Layout

**What:** `(app)/+layout.server.ts` verifies the session on every request to the authenticated route group. Missing session redirects to login before the page loads.

**Example:**
```typescript
// src/routes/(app)/+layout.server.ts
import { redirect } from '@sveltejs/kit'
import type { LayoutServerLoad } from './$types'

export const load: LayoutServerLoad = async ({ locals: { getClaims, supabase } }) => {
  const claims = await getClaims()

  if (!claims) {
    redirect(303, '/auth/login')
  }

  return {
    claims,
    // Pass role from JWT claim — no DB query needed
    userRole: claims['user_role'] as string | null
  }
}
```

### Pattern 5: Custom Access Token Hook — Role Injection into JWT

**What:** A PostgreSQL function that Supabase Auth calls every time it issues a JWT. Reads the user's role from `user_roles` table and adds it as `user_role` claim. After this hook is active, RLS policies can read `auth.jwt() ->> 'user_role'` without a DB round-trip.

**When to use:** Must be registered in Supabase Dashboard → Authentication → Hooks before any RLS policy that references `user_role` is tested.

**Example:**
```sql
-- Source: https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac

-- Step 1: Define the role enum (4-tier hierarchy for this project)
create type public.app_role as enum ('admin', 'command', 'nco', 'member');

-- Step 2: Create user_roles table
create table public.user_roles (
  id        bigint generated by default as identity primary key,
  user_id   uuid references auth.users on delete cascade not null,
  role      app_role not null,
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

-- Step 3: The hook function
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
  declare
    claims jsonb;
    user_role public.app_role;
  begin
    select role into user_role
    from public.user_roles
    where user_id = (event->>'user_id')::uuid;

    claims := event->'claims';

    if user_role is not null then
      claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
    else
      claims := jsonb_set(claims, '{user_role}', 'null');
    end if;

    event := jsonb_set(event, '{claims}', claims);
    return event;
  end;
$$;

-- Step 4: Grant permissions to supabase_auth_admin
grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;
grant all on table public.user_roles to supabase_auth_admin;
revoke all on table public.user_roles from authenticated, anon, public;

create policy "Allow auth admin to read user roles"
  on public.user_roles
  as permissive for select
  to supabase_auth_admin
  using (true);
```

**Step 5 (Dashboard):** Go to Authentication → Hooks → Custom Access Token Hook → Add hook → select `public.custom_access_token_hook`. This cannot be done via SQL migration alone.

### Pattern 6: RLS Policies Using the JWT Claim

**What:** After the hook is active, every RLS policy reads the role from the JWT — no second DB query.

**Example:**
```sql
-- Source: https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac

-- Helper: wrap in SELECT to allow query planner to cache the result per statement
-- This avoids per-row function call overhead

-- Example: only admin/command/nco can update soldier records
create policy "NCO+ can update soldier records"
  on public.soldiers
  for update
  to authenticated
  using (
    (select (auth.jwt() ->> 'user_role')::public.app_role)
      in ('nco', 'command', 'admin')
  );

-- Example: authenticated members can read their own soldier record
create policy "Members can read own soldier record"
  on public.soldiers
  for select
  to authenticated
  using (user_id = (select auth.uid()));
```

### Pattern 7: Role Constants and Hierarchy Helpers

**What:** TypeScript constants mirroring the `app_role` enum, with a hierarchy check helper used in SvelteKit load functions for additional UI-layer checks.

**Example:**
```typescript
// src/lib/auth/roles.ts
export const APP_ROLES = ['admin', 'command', 'nco', 'member'] as const
export type AppRole = typeof APP_ROLES[number]

const ROLE_HIERARCHY: Record<AppRole, number> = {
  admin:   4,
  command: 3,
  nco:     2,
  member:  1,
}

/**
 * Returns true if `userRole` meets or exceeds `requiredRole`.
 * Use for UI-layer checks only — RLS is the enforcement layer.
 */
export function hasRole(userRole: AppRole | null, requiredRole: AppRole): boolean {
  if (!userRole) return false
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole]
}
```

### Pattern 8: Database Schema for Phase 1

**What:** The core tables needed for auth and role enforcement. All tables have RLS enabled at creation.

```sql
-- Core schema for Phase 1
-- Source: Supabase RBAC docs + project architecture decisions

-- soldiers: the primary personnel record
create table public.soldiers (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users on delete set null unique,
  discord_id    text unique,               -- Discord snowflake — separate from internal UUID
  display_name  text not null,
  status        text not null default 'active'
                  check (status in ('active', 'inactive', 'loa', 'awol', 'discharged')),
  rank_id       uuid references public.ranks,
  unit_id       uuid references public.units,
  joined_at     timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
alter table public.soldiers enable row level security;

-- ranks reference table
create table public.ranks (
  id            uuid primary key default gen_random_uuid(),
  name          text not null unique,
  abbreviation  text not null,
  sort_order    int not null,              -- lower sort_order = lower rank
  insignia_url  text
);
alter table public.ranks enable row level security;

-- units reference table
create table public.units (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  abbreviation    text,
  parent_unit_id  uuid references public.units   -- self-referential for ORBAT tree
);
alter table public.units enable row level security;

-- service_records: append-only event log — no UPDATE ever
create table public.service_records (
  id            uuid primary key default gen_random_uuid(),
  soldier_id    uuid not null references public.soldiers on delete cascade,
  action_type   text not null
                  check (action_type in (
                    'rank_change', 'award', 'qualification',
                    'transfer', 'status_change', 'enlistment', 'note'
                  )),
  payload       jsonb not null default '{}',
  performed_by  uuid references auth.users,
  visibility    text not null default 'public'
                  check (visibility in ('public', 'leadership_only')),
  occurred_at   timestamptz not null default now()
);
alter table public.service_records enable row level security;

-- user_roles: drives the Custom Access Token Hook
-- (already shown above in Pattern 5)
```

### Anti-Patterns to Avoid

- **Using `getSession()` in server code:** `getSession()` reads unvalidated cookie data. Always use `getClaims()` on the server — it validates the JWT signature against Supabase's public keys.
- **Using `user_metadata` for role storage:** `user_metadata` is writable by authenticated users via `supabase.auth.updateUser()`. Any member can promote themselves. Roles live in `user_roles` only.
- **Testing RLS in the Supabase SQL Editor:** The SQL Editor runs as the `postgres` superuser, which bypasses all RLS. Every RLS test must be done through the Supabase JS client with a real authenticated session.
- **Placing `@tailwindcss/vite` AFTER `sveltekit()` in vite plugins:** Must come first — `tailwindcss()` before `sveltekit()`.
- **Hardcoding Discord redirect URIs:** Register both `http://localhost:5173/auth/callback` AND the production URL in the Discord Developer Portal before first test.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session management in SvelteKit | Custom cookie serialization/parsing | `@supabase/ssr createServerClient` with `setAll/getAll` | Token rotation, httpOnly cookies, PKCE code exchange — all handled by the library |
| Role checks in RLS | Custom PostgreSQL functions to check role | `(select (auth.jwt() ->> 'user_role')::app_role)` in `USING` clause | JWT reading is built into Postgres; wrapping in `SELECT` caches the result per statement |
| OAuth code exchange | Manual `fetch()` to Discord token endpoint | `supabase.auth.exchangeCodeForSession(code)` | PKCE verification, token storage, cookie setting — all in one call |
| CSS configuration | `tailwind.config.js`, PostCSS config | `@import "tailwindcss"` in `app.css` + `tailwindcss()` in vite plugins | Tailwind v4 is zero-config by design |
| TypeScript DB types | Hand-written Supabase query types | `supabase gen types typescript > src/lib/types/database.ts` | Regenerate after every schema change; eliminates column-name typos |
| Role hierarchy comparisons | `switch` statements on role strings | `hasRole(userRole, 'nco')` from `$lib/auth/roles.ts` | Single source of truth for hierarchy; easy to update if roles change |

**Key insight:** The Supabase auth + RLS stack has dozens of edge cases in session management, token refresh, and cookie hygiene. Custom implementations reliably miss 3-5 of these. Use the official patterns exactly.

---

## Common Pitfalls

### Pitfall 1: RLS Disabled on New Tables

**What goes wrong:** SQL migrations do not enable RLS by default. Every row in a new table is publicly readable through the anon key with no error message. This is the #1 data exposure pattern in Supabase deployments (CVE-2025-48757: 170+ apps exposed in January 2025).

**Why it happens:** Supabase Dashboard Table Editor enables RLS by default; SQL migrations do not. Developers forget `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`.

**How to avoid:** Add `alter table public.[name] enable row level security;` immediately after every `CREATE TABLE` statement — no exceptions. Add a deny-all placeholder policy while real policies are being written: `create policy "deny all" on public.[name] using (false);`.

**Warning signs:** Supabase Dashboard shows "RLS disabled" badge on a table. Running `SELECT tablename FROM pg_tables WHERE schemaname = 'public'` and cross-referencing with `SELECT tablename FROM pg_policies` reveals tables with no policies.

### Pitfall 2: getClaims vs getSession Confusion

**What goes wrong:** Using `supabase.auth.getSession()` in server-side code (`hooks.server.ts`, `+page.server.ts` load functions). `getSession()` returns whatever is in the cookie without validating the JWT signature — it can be spoofed.

**Why it happens:** `getSession()` is the older API and appears in many community tutorials. `getClaims()` is the newer, secure replacement.

**How to avoid:** Always use `getClaims()` in server code. Reserve `getSession()` for client-side code only where the browser has no incentive to forge tokens against itself.

**Warning signs:** Any call to `supabase.auth.getSession()` inside `hooks.server.ts`, `+page.server.ts`, or `+layout.server.ts`.

### Pitfall 3: Custom Access Token Hook Not Registered in Dashboard

**What goes wrong:** The SQL function `custom_access_token_hook` is created and permissions are granted, but the hook is never registered in the Supabase Dashboard. The function exists but is never called. JWTs have no `user_role` claim. All RLS policies that reference `user_role` evaluate it as `null`, which usually means access denied for every query.

**Why it happens:** The hook registration step cannot be done via SQL migration — it requires a manual Dashboard action. It's easy to miss when working from migration scripts.

**How to avoid:** After running the SQL migration for the hook function, go to Supabase Dashboard → Authentication → Hooks → Custom Access Token Hook and register `public.custom_access_token_hook`. Verify by logging in, fetching the session, and checking that the JWT payload contains `user_role`.

**Warning signs:** All authenticated queries return empty results even though RLS policies look correct. Decoding the JWT (via jwt.io) shows no `user_role` claim in the payload.

### Pitfall 4: JWT Staleness After Role Changes

**What goes wrong:** A member's role is changed in `user_roles`. The next JWT is issued with the new role, but the user's current JWT (up to 1 hour old) still carries the old role. RLS policies enforce the stale role.

**Why it happens:** JWTs are immutable after issuance. The Custom Access Token Hook only runs when a new JWT is issued, not when `user_roles` is updated.

**How to avoid:** Keep the default Supabase token TTL at 3600 seconds (1 hour) — do not increase it. For security-critical revocations (bans, demotions), force a session invalidation via the Supabase Admin API. For promotions, the 1-hour window is acceptable — document this as known behavior and show a UI prompt after promotion ("New permissions are active after your next login").

**Warning signs:** A just-promoted member still can't access NCO-gated pages. A just-kicked member can still log in for up to an hour.

### Pitfall 5: Discord Redirect URI Mismatch

**What goes wrong:** The redirect URI in the `signInWithOAuth` call doesn't match one of the registered URIs in the Discord Developer Portal. Discord returns an error instead of redirecting to the callback route. The error message ("Invalid redirect_uri") often doesn't appear in SvelteKit — the user just sees a blank Discord error page.

**Why it happens:** Developers register `http://localhost:5173/auth/callback` during development and forget to add the production URL before deploying.

**How to avoid:** Register both the local dev URI and the production URI in the Discord Developer Portal before the first test. Use the exact URL including protocol and path. Keep the registered URIs list in the project's deployment checklist.

**Warning signs:** OAuth redirect works in dev but fails in production. Discord shows "error=invalid_request" in the redirect URL.

### Pitfall 6: `path: '/'` Missing from Cookie Options

**What goes wrong:** Session cookies are set without `path: '/'`. The cookie is scoped to the current path, so it doesn't persist across route navigation. The user appears logged in on one page and logged out on another.

**Why it happens:** SvelteKit's `event.cookies.set()` requires an explicit `path` option — unlike most cookie libraries that default to `/`. `@supabase/ssr`'s `setAll` callback receives options from the library that may not include path.

**How to avoid:** In the `setAll` cookie handler in `hooks.server.ts`, always spread options and force `path: '/'`:
```typescript
setAll: (cookies) => {
  cookies.forEach(({ name, value, options }) => {
    event.cookies.set(name, value, { ...options, path: '/' })  // path: '/' is REQUIRED
  })
}
```

**Warning signs:** Login works but the session disappears when navigating to a different route. No session on page reload.

---

## Code Examples

Verified patterns from official sources:

### Tailwind v4 Setup

```typescript
// Source: https://tailwindcss.com/docs/guides/sveltekit
// vite.config.ts — tailwindcss() MUST come before sveltekit()
import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tailwindcss(),   // first
    sveltekit(),     // second
  ],
})
```

```css
/* src/app.css — entire Tailwind v4 config */
@import "tailwindcss";
```

```svelte
<!-- src/routes/+layout.svelte -->
<script>
  import '../app.css'
  let { children } = $props()
</script>

{@render children()}
```

### Browser-Side Supabase Client

```typescript
// Source: official @supabase/ssr docs
// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY } from '$env/static/public'
import type { Database } from '$lib/types/database'

export function createClient() {
  return createBrowserClient<Database>(
    PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_PUBLISHABLE_KEY
  )
}
```

### Environment Variables

```bash
# .env — note SvelteKit uses PUBLIC_ prefix for browser-accessible vars
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-key

# Private vars (not exposed to browser — no PUBLIC_ prefix)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # server-only, never VITE_ or PUBLIC_
```

### RLS Policy — Verify by User Role

```sql
-- Source: https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac

-- Wrap auth.jwt() in SELECT to cache result per statement (performance)
-- Without SELECT wrapper: function called once per row
-- With SELECT wrapper: called once per statement, cached

-- Authenticated users can read all active soldiers
create policy "Authenticated can read active soldiers"
  on public.soldiers
  for select
  to authenticated
  using (status = 'active');

-- Only NCO+ can insert service records
create policy "NCO+ can insert service records"
  on public.service_records
  for insert
  to authenticated
  with check (
    (select (auth.jwt() ->> 'user_role')::public.app_role)
      in ('nco', 'command', 'admin')
  );

-- Service records: no UPDATE or DELETE for anyone (append-only enforced at DB level)
-- Simply omit UPDATE and DELETE policies — no policy = deny by default when RLS is enabled
```

### Verifying RLS Coverage (Run After Every Migration)

```sql
-- Source: Supabase Database Advisor pattern
-- Lists all public tables and their policy count
select
  t.tablename,
  count(p.policyname) as policy_count,
  obj_description(
    (quote_ident(t.schemaname) || '.' || quote_ident(t.tablename))::regclass,
    'pg_class'
  ) as description
from pg_tables t
left join pg_policies p
  on t.tablename = p.tablename and t.schemaname = p.schemaname
where t.schemaname = 'public'
group by t.tablename, t.schemaname
having count(p.policyname) = 0;
-- Zero rows = all tables have at least one policy. Any rows = missing policies.
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@supabase/auth-helpers-sveltekit` | `@supabase/ssr` ^0.8.0 | 2023-2024 | auth-helpers is deprecated; ssr is the only supported package |
| `supabase.auth.getSession()` on server | `supabase.auth.getClaims()` on server | ~2024 | getSession() trusts cookie data without JWT validation; getClaims() validates signature |
| Tailwind v3 with PostCSS config | Tailwind v4 with `@tailwindcss/vite` | v4.0.0 (Jan 2025) | No `tailwind.config.js`, no PostCSS; single `@import "tailwindcss"` in CSS |
| `npm create svelte@latest` | `npx sv create` | SvelteKit 2.x | `sv` is the new official CLI; `create svelte` still works but `sv create` is canonical |
| Svelte 4 stores (`writable`, `readable`) | Svelte 5 runes (`$state`, `$derived`, `$effect`) | Svelte 5.0 (Oct 2024) | Runes replace all store primitives; stores still work but runes are the idiomatic Svelte 5 pattern |

**Deprecated/outdated:**
- `@supabase/auth-helpers-sveltekit`: Will not receive security updates. Do not use.
- `supabase.auth.getSession()` in server code: Insecure — trusts unvalidated cookie data.
- Tailwind v3 PostCSS integration: Still works but v4 Vite plugin is zero-config and faster.

---

## Open Questions

1. **`getClaims()` exact API signature**
   - What we know: Official Supabase docs and community patterns confirm `getClaims()` validates JWT signature on the server. The return type includes a `claims` object.
   - What's unclear: The exact return type shape `{ data: { claims: Record<string, unknown> } }` — the API was recently added and the exact TypeScript types may need verification against `@supabase/supabase-js` v2.95.3 type definitions.
   - Recommendation: After installing, run `tsc --noEmit` and let the type checker confirm the exact shape. Alternatively, use `getUser()` as a fallback — it's slightly more expensive (round-trip to Auth server) but has stable types.

2. **Local Supabase CLI vs. cloud for development**
   - What we know: `supabase start` runs a full local Supabase stack (Postgres + Auth + Storage + Studio). The Custom Access Token Hook can be tested locally.
   - What's unclear: Whether the local Supabase stack's Auth Hooks dashboard (for registering the hook) works identically to the cloud dashboard or requires a different registration method.
   - Recommendation: Use the cloud Supabase project for Phase 1 development to avoid any local-vs-cloud discrepancy with the hook registration. Add local dev setup in a later phase.

3. **Discord OAuth scopes**
   - What we know: The `identify` scope provides basic Discord user info (id, username, avatar). The docs don't specify what scopes Supabase requests by default.
   - What's unclear: Whether Supabase automatically requests the minimal correct scopes for Discord, or whether additional scope configuration is needed for future features (e.g., guild membership verification).
   - Recommendation: For Phase 1, the default scopes (`identify`, `email`) are sufficient — Discord user ID and email are all that's needed for auth. Guild membership verification is a Phase 7 concern.

---

## Sources

### Primary (HIGH confidence)
- Supabase Custom Claims & RBAC — https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac — complete SQL examples verified
- Supabase Discord OAuth — https://supabase.com/docs/guides/auth/social-login/auth-discord — signInWithOAuth pattern verified
- Supabase SSR for SvelteKit — https://supabase.com/docs/guides/auth/server-side/sveltekit — createServerClient cookie pattern verified
- Tailwind CSS v4 SvelteKit guide — https://tailwindcss.com/docs/guides/sveltekit — vite config and CSS import verified
- j4w8n/sveltekit-supabase-ssr GitHub — https://github.com/j4w8n/sveltekit-supabase-ssr — hooks.server.ts implementation with getClaims verified
- Project STACK.md (2026-02-10) — all library versions verified against npm
- Project ARCHITECTURE.md (2026-02-10) — SQL patterns and build order
- Project PITFALLS.md (2026-02-10) — RLS pitfalls with CVE-2025-48757 reference

### Secondary (MEDIUM confidence)
- Supabase GitHub discussion #22353 — getSession() insecurity with SvelteKit — https://github.com/orgs/supabase/discussions/22353
- Supabase GitHub issue #40985 — getClaims vs getUser vs getSession clarification — https://github.com/supabase/supabase/issues/40985
- SvelteKit adapter-node official docs — https://svelte.dev/docs/kit/adapter-node — BODY_SIZE_LIMIT env var

### Tertiary (LOW confidence)
- WebSearch results for `supabase ssr SvelteKit hooks.server.ts getClaims getUser 2026` — community patterns consistent with official docs

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified against npm registry in project STACK.md (2026-02-10)
- Architecture patterns: HIGH — hooks.server.ts pattern from official @supabase/ssr docs + working community example; Custom Access Token Hook SQL from official Supabase RBAC docs
- Pitfalls: HIGH — RLS pitfalls from official Supabase docs + CVE-2025-48757; getClaims/getSession from official GitHub discussion; cookie path issue from multiple community sources

**Research date:** 2026-02-11
**Valid until:** 2026-03-11 (30 days — these APIs are stable; Supabase SSR is post-beta)
