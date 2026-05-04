# ADR 0001: Monorepo with npm workspaces

- **Status:** Accepted
- **Date:** 2026-05-04
- **Deciders:** Stephen

## Context

We need to host a React Native mobile app, a Supabase project (SQL + Edge Functions), and — at Phase 3 — a venue admin web app. The mobile and admin apps will share types generated from the database, plus a small amount of shared business logic (formatting, school-term lookup).

## Options

1. **Three separate repos** (mobile / supabase / admin).
   - Pros: Independent CI, cleaner permissions per repo.
   - Cons: Cross-repo type generation is painful; shared code requires publishing private packages.
2. **Single monorepo with npm workspaces.**
   - Pros: One source of truth, easy shared types, atomic PRs across surfaces, simpler dev setup.
   - Cons: Bigger checkout, CI needs to be selective about what it builds.
3. **Single monorepo with Turborepo / Nx.**
   - Pros: All of (2) plus build caching.
   - Cons: Extra tooling complexity at this stage.

## Decision

Go with option 2 — monorepo, npm workspaces, no Turborepo yet. Add Turborepo only if CI times become painful.

## Consequences

- Repo layout: `apps/mobile`, `apps/admin` (later), `supabase/`, `docs/`, `scripts/`.
- `supabase/` is not an npm workspace; it's managed by the Supabase CLI directly.
- A single root `package.json` declares workspaces and proxy scripts.
- Shared TypeScript types (e.g. the generated `Database` type) currently live duplicated in `apps/mobile/types/`. When the admin app arrives, factor them out into `packages/types/`.
