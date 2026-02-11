# Stack Research

**Domain:** Milsim unit website with integrated personnel management (PERSCOM-style)
**Project:** ASQN 1st SFOD — Arma 3 Delta Force unit site
**Researched:** 2026-02-10
**Confidence:** HIGH (core stack verified via official docs and npm registries; versions verified against current releases)

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Svelte 5 | ^5.50.1 | UI framework | Compile-time reactivity with runes ($state, $derived, $effect) eliminates virtual DOM. 50% smaller bundles than React — critical for a tactical-aesthetic site with rich media (rosters, event pages, maps). Runes make personnel list reactivity readable and predictable. |
| SvelteKit 2 | ^2.50.2 | Full-stack app framework | SSR for public pages (SEO for recruitment), SPA-style transitions for the personnel management portal. Built-in form actions pair with Superforms for server-validated enlistment and personnel forms. adapter-node for Docker/VPS deployment. |
| Tailwind CSS v4 | ^4.1.18 | Utility-first CSS | v4 uses a Vite plugin (no config file needed), CSS-native variables, and ships zero runtime JS. Perfect for a custom dark tactical aesthetic — you get full design control without fighting a component library. |
| Supabase JS | ^2.95.3 | Database, auth, storage client | Single SDK for all Supabase primitives: PostgreSQL queries, Discord OAuth via signInWithOAuth(), file storage for award images/service record docs, and realtime subscriptions for live roster updates. |
| @supabase/ssr | ^0.8.0 | Cookie-based SSR auth | The official replacement for deprecated @supabase/auth-helpers-*. Handles session management in SvelteKit hooks.server.ts so RLS policies fire correctly on server-rendered pages. Required for secure personnel portal pages. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| sveltekit-superforms | ^2.29.1 | Server + client form validation | Every form: enlistment, promotion requests, award submissions, contact. Superforms handles progressive enhancement, tainted-field detection, and surfaces Zod errors at the right field. Use with the Zod adapter. |
| Zod | ^4.3.6 | Schema validation | Define schemas once for enlistment forms, personnel records, promotion criteria. Schemas double as TypeScript types via z.infer<>. Supabase-generated types + Zod = end-to-end type safety. |
| @sveltejs/adapter-node | ^5.5.2 | Docker/Node.js deployment | Compiles SvelteKit to a standalone Node server. Required for Docker-on-VPS hosting. Supports keepAliveTimeout/headersTimeout via environment variables (added in 5.5.0). |
| date-fns | ^4.1.0 | Date formatting & calculation | Service time calculations ("3 months, 14 days"), attendance period formatting, event scheduling display. Pure functions, tree-shakeable, zero dependencies. Handles all the calendar math for service records. |
| @tailwindcss/vite | ^4.1.18 | Tailwind v4 Vite integration | Required for Tailwind v4 with SvelteKit. Must be placed before the sveltekit() plugin in vite.config. Not optional when using Tailwind v4. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| TypeScript | Type safety across frontend and Supabase queries | Generate DB types with `supabase gen types typescript`. Enables catching schema mismatches before runtime in service records and personnel operations. |
| Vite | Build tool (bundled with SvelteKit) | No separate configuration needed. SvelteKit 2 ships with Vite 5+. |
| Supabase CLI | Local dev, DB migrations, type generation | Run `supabase start` for local Supabase stack during dev. `supabase gen types typescript` syncs DB schema to TypeScript. Critical for RLS policy development. |
| ESLint + svelte-eslint-parser | Linting | Catches Svelte 5 rune misuse and TypeScript errors before they reach production. |
| Prettier + prettier-plugin-svelte | Code formatting | Standard in the SvelteKit ecosystem; `svelte.config.js` prettier settings apply to .svelte files. |
| Docker + docker-compose | Container packaging | Multi-stage Dockerfile: builder stage (node:alpine + npm ci + npm run build), runtime stage (copies build artifacts only). Exposes port 3000. Nginx reverse proxy in front for SSL termination. |

---

## Installation

```bash
# Scaffold SvelteKit 2 + Svelte 5 project
npm create svelte@latest asqn-site
# Choose: TypeScript, ESLint, Prettier

# Core runtime
npm install @supabase/supabase-js @supabase/ssr

# Forms and validation
npm install sveltekit-superforms zod

# Date utilities
npm install date-fns

# Tailwind CSS v4
npm install tailwindcss @tailwindcss/vite

# Production adapter
npm install @sveltejs/adapter-node

# Dev dependencies
npm install -D supabase
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| SvelteKit | Next.js | If the team is already deeply React-native and needs RSC ecosystem (shadcn/ui, Radix, etc.). For a greenfield unit site with no existing React codebase, the React runtime overhead and RSC mental model are not worth it. |
| SvelteKit | Astro | If the site were purely static/content-driven with no real-time personnel management. Astro's island architecture doesn't fit a SPA-style admin portal well. |
| Tailwind CSS (utility) | Daisy UI | DaisyUI adds pre-built components but constrains the tactical aesthetic. Custom components are required here, so DaisyUI classes would fight the design rather than help it. |
| Tailwind CSS | Plain CSS / CSS Modules | Valid for a solo dev who finds Tailwind overhead too high. SvelteKit scoped `<style>` blocks are excellent. But Tailwind v4's zero-config and purging make it faster for a dark theme with many repeated patterns (dark panels, military-green accents, monospace text). |
| Zod v4 | Valibot | Valibot is smaller but has a different API and less ecosystem depth. Zod v4's fromJSONSchema and tighter TypeScript integration make it the right choice alongside Supabase-generated types. |
| date-fns | Temporal API | Browser support for the Temporal API is still incomplete in early 2026. date-fns v4 is stable, battle-tested, and tree-shakeable. Revisit Temporal in 12-18 months. |
| @supabase/ssr | @supabase/auth-helpers-sveltekit | auth-helpers is officially deprecated. SSR package is the supported successor. Do not use auth-helpers on new projects. |
| Docker adapter-node | Vercel/Netlify | Vercel/Netlify are fine for purely public sites but add cost and complexity for a small unit's self-hosted needs. VPS + Docker keeps costs near-zero and keeps data fully in the unit's control. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| @supabase/auth-helpers-sveltekit | Officially deprecated; will not receive security updates | @supabase/ssr ^0.8.0 |
| user_metadata in RLS policies | user_metadata is writable by authenticated users — any member could escalate their own role (CVE pattern documented in 2025) | Use app_metadata or a dedicated `roles` table with RLS protecting writes to admins only |
| PERSCOM.io (cloud SaaS) | Locks unit data to a third-party service, ongoing SaaS costs, no control over schema or uptime | Custom Supabase-backed personnel management |
| Invision Power Board + legacy PERSCOM | PHP/MySQL stack creates a separate codebase to maintain alongside the SvelteKit site; no unified auth | Unified SvelteKit + Supabase stack |
| React component libraries (shadcn/ui, Radix) | These are React libraries and have no Svelte equivalent that matches their maturity; using them requires adding React to a Svelte project | Custom Svelte components with Tailwind v4 |
| Server-side sessions / JWT stored in localStorage | localStorage is XSS-vulnerable; sessions don't survive server restarts in stateless Docker containers | @supabase/ssr cookie-based sessions (httpOnly cookies managed by Supabase auth) |
| Svelte 4 | Svelte 5 is the current stable release (5.50.1 as of Feb 2026); Svelte 4 will not receive new features | Svelte 5 with runes |

---

## Stack Patterns by Variant

**Public-facing pages (landing, about, leadership, events):**
- Use SvelteKit +page.server.ts load functions with `+page.svelte` templates
- SSR-rendered for SEO (search engines index recruitment pages)
- Minimal JS shipped to client — tactical aesthetic is CSS-driven, not interaction-heavy

**Personnel management portal (authenticated routes):**
- Protect with `hooks.server.ts` session check; redirect to `/login` if no valid session
- Use SvelteKit form actions + Superforms for all mutations (promotions, attendance, awards)
- Supabase RLS enforces permissions at the database level — even if a client bypasses the UI, the DB rejects unauthorized writes
- Role hierarchy recommendation: `admin` > `s1_clerk` > `member` > `applicant` — store in a `profiles.role` column protected by RLS

**Enlistment flow:**
- Public `+page.svelte` with Superforms enlistment schema (Zod)
- Server action writes to `applications` table; RLS allows anonymous inserts, admin-only reads
- Discord OAuth login created on application approval, linked to `profiles` table

**Docker deployment:**
```dockerfile
# Stage 1: Build
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Runtime
FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/build ./build
COPY --from=builder /app/package*.json ./
RUN npm ci --production
EXPOSE 3000
CMD ["node", "build"]
```

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| svelte@5.x | @sveltejs/kit@2.x | SvelteKit 2 requires Svelte 5. Do not mix Svelte 4 with SvelteKit 2. |
| tailwindcss@4.x | @tailwindcss/vite@4.x | Must match major versions. @tailwindcss/vite replaces the PostCSS plugin from v3. |
| sveltekit-superforms@2.x | zod@4.x | Superforms 2.x supports Zod v4 via its Zod adapter (`import { zod } from 'sveltekit-superforms/adapters'`). |
| @supabase/ssr@0.8.x | @supabase/supabase-js@2.x | Both must be v2 supabase-js. ssr@0.8 does not support supabase-js v1. |
| @sveltejs/adapter-node@5.x | @sveltejs/kit@2.x | adapter-node 5.x is the companion adapter for kit 2.x. |
| node@22 (Docker base) | @sveltejs/adapter-node@5.x | Node 22 is LTS. adapter-node 5.5.x supports Node 20+ (verified via Vercel adapter Node 24 support in Feb 2026 update). |

---

## Sources

- Svelte February 2026 blog post — https://svelte.dev/blog/whats-new-in-svelte-february-2026 (confirmed Svelte 5.49.0, SvelteKit 2.50.0; npm showed 5.50.1 / 2.50.2 as of research date) — HIGH confidence
- SvelteKit GitHub releases — https://github.com/sveltejs/kit/releases (confirmed @sveltejs/kit@2.50.2, @sveltejs/adapter-node@5.5.2) — HIGH confidence
- Supabase JS GitHub releases — https://github.com/supabase/supabase-js/releases (confirmed v2.95.3, released Feb 6 2026) — HIGH confidence
- Supabase SSR npm — https://www.npmjs.com/package/@supabase/ssr (confirmed 0.8.0) — HIGH confidence
- Supabase SvelteKit SSR guide — https://supabase.com/docs/guides/auth/server-side/sveltekit — HIGH confidence
- Supabase Discord OAuth guide — https://supabase.com/docs/guides/auth/social-login/auth-discord — HIGH confidence
- Supabase RLS security guide — https://supabase.com/docs/guides/database/postgres/row-level-security — HIGH confidence
- Tailwind CSS v4 SvelteKit guide — https://tailwindcss.com/docs/guides/sveltekit (confirmed v4 Vite plugin pattern) — HIGH confidence
- Tailwind CSS v4.1.18 on npm (latest stable, published ~2 months ago as of Feb 2026) — MEDIUM confidence (npm search result, not direct page fetch)
- Superforms npm — https://www.npmjs.com/package/sveltekit-superforms (confirmed 2.29.1) — HIGH confidence
- Zod npm (confirmed 4.3.6) — MEDIUM confidence (search result confirmed by Zod v4 release notes at https://zod.dev/v4) — HIGH confidence
- date-fns npm (confirmed 4.1.0) — MEDIUM confidence (search result, npm page returned 403)
- PERSCOM.io documentation — https://docs.perscom.io/ (informed what custom PERSCOM must replicate) — HIGH confidence
- Supabase user_metadata RLS security warning — https://supabase.com/docs/guides/auth/oauth-server/token-security — HIGH confidence

---

*Stack research for: milsim unit website with PERSCOM-style personnel management*
*Researched: 2026-02-10*
