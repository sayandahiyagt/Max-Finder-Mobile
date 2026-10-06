# First implementation task: development foundation and authentication

## Status

**Proposed; implementation intentionally not started.** The team should review the
agent plan below before asking an agent to implement it.

## Scope

Prepare the shared foundation needed by every feature:

- Initialize the Next.js App Router TypeScript application for Vercel.
- Add environment-safe Supabase browser/server client setup.
- Establish the first versioned database migration for the application profile/role
  boundary, while keeping credentials in Supabase Auth.
- Add the sign-up, sign-in, sign-out, protected-route/session behavior required by the
  account story.
- Establish lint, type-check, test, and production-build commands and CI checks.
- Document local setup against the shared Supabase development project.

This task does not implement pets, reports, matching, messaging, shelters, admin UI, or
the final Prisma decision. It must not invent unresolved retention, location precision,
provider, or password-policy details.

## Acceptance criteria

1. A developer can clone the repository, copy `.env.example` to `.env.local`, provide
   authorized shared Supabase development values, install dependencies, and run the app.
2. The app starts without build or configuration errors and has a documented Vercel
   deployment path.
3. A user can sign up, is signed in after success, sign in again, and sign out.
4. Duplicate/invalid email and invalid password input produce clear errors without
   exposing secrets.
5. Authenticated session state survives navigation; unauthenticated users cannot access
   the protected test route.
6. No application table stores a password, and browser bundles contain no service-role
   key.
7. Supabase schema/configuration changes are versioned and reproducible.
8. Automated linting, type checking, tests, and a production build pass locally and in
   pull-request CI.
9. The implementation includes tests for successful auth and unauthenticated/
   unauthorized access boundaries.

## Agent investigation and proposed plan

The agent inspected the repository: it contained only the initial README and no
application scaffold, dependency manifest, migrations, tests, or CI configuration. The
iteration plan requires Next.js/TypeScript, Supabase/Postgres, testing, and Vercel
checks.

Proposed sequence:

1. Confirm the Supabase project URL/anon key workflow and whether the team wants the
   official Supabase CLI migrations in this repository.
2. Create the Next.js App Router TypeScript scaffold and standard scripts.
3. Add typed Supabase browser and server clients, session refresh/middleware, and
   `.env.example` without credentials.
4. Add the minimal profile/role migration and RLS policy; use Supabase Auth for
   credentials and do not add a password table.
5. Build the smallest sign-up/sign-in/sign-out pages and one protected smoke-test route.
6. Add unit/integration tests using repository-approved Supabase test strategy, plus
   lint/typecheck/build scripts.
7. Add CI that runs those checks and document local setup and Vercel variables.
8. Run all acceptance checks, inspect the browser/session behavior, and stop for team
   review before expanding into pet features.

## Team review record

Before implementation, the team should record:

- reviewers and date;
- whether Supabase CLI migrations are approved;
- whether Prisma is required or deferred;
- approved password policy wording (Supabase Auth remains the password store);
- approved protected-route and profile-role approach;
- changes requested to this plan.
