# Max Finder Mobile architecture

## Product goal

Max Finder Mobile helps people report lost pets, find likely matches, and contact the
owner or a local shelter. The approved feature areas are account creation, pet
registration, lost-pet reporting, lost-pet search/matching, direct messaging, help/FAQ,
shelter information, and admin moderation.

## Runtime components

| Component | Responsibility |
| --- | --- |
| Next.js App Router | Web application UI, route handlers, server-rendered pages, and server actions where appropriate |
| TypeScript | Application and interface type safety |
| Supabase Auth | Email/password identity, sessions, and authenticated user identity |
| Supabase Postgres | Versioned relational data for profiles, pets, lost reports, conversations, messages, shelters, and moderation state |
| Supabase Storage | Pet photos, subject to approved bucket policies and access rules |
| Supabase Row Level Security | Database-side ownership and role boundaries |
| Vercel | Production hosting and pull-request preview deployments |
| CI | Lint, type check, tests, and production build validation |

The iteration plan mentions Prisma alongside Supabase/Postgres. This repository treats
Supabase as the required database platform and Auth authority. Whether Prisma is retained
as an additional typed data-access layer must be explicitly approved before migrations or
repositories are written; it is not assumed by the scaffold.

## Request/data flow

1. A browser loads a Next.js page or calls a route handler.
2. The Supabase browser client uses the public URL and anon key only.
3. Server code obtains the authenticated Supabase session and validates ownership/role.
4. Server-side database operations use the authenticated context or narrowly scoped
   service operations. The service-role key is never sent to the browser.
5. Public search returns only active lost reports and approved contact fields.
6. Vercel deploys from the repository; CI must pass before merging.

## Environments

- Local development uses the shared Supabase development project through variables in
  `.env.local`; each developer must receive access through the team/client, not by
  copying credentials into Git.
- Preview and production use separate Vercel environment variable values where the
  client provides them.
- Schema changes are reviewed as migrations and applied consistently across environments.

## Repository conventions

The application uses `src/app` for routes and `src/` for shared code. Keep server-only
Supabase utilities separate from browser utilities. Put tests near the behavior they
verify or in the repository's chosen test directory once testing is initialized.
