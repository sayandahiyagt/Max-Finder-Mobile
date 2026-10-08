# First implementation task: authentication and application identity foundation

## Why this is the first task

The iteration plan puts repository setup, authentication, database work, and workflow in the first foundation stage.

The repository already has the Next.js scaffold, Supabase helper code, npm verification scripts, and CI. The first meaningful remaining foundation task is therefore to connect authenticated identity to the application data model without jumping ahead into pets or Lost Pet Reports.

This task is intentionally smaller than "build the whole database" and large enough to prove the architecture.

## Task objective

Implement the first vertical foundation for identity:

```text
Web client
  -> Application API / Server Interface
  -> Identity & Account Management
  -> Authentication Integration -> Supabase Auth
  -> Persistence / Repository -> Prisma -> Supabase PostgreSQL
```

At the end of the task, a user can authenticate and have a valid application `users` profile, while the repository demonstrates the approved Prisma-backed persistence boundary.

## In scope

- add Prisma and the minimum Prisma configuration required for Supabase PostgreSQL;
- add the first versioned migration for the application `users` table;
- model `USER` and `ADMIN` as controlled application roles;
- keep `auth_provider_id` and `email` unique;
- add a repository boundary for application user/profile persistence;
- implement registration/sign-in/sign-out through the shared server boundary;
- establish session handling needed by protected backend behavior;
- create a minimal protected smoke-test page or endpoint;
- create/update the application profile for a successfully authenticated identity;
- add tests for authentication and authorization boundaries;
- update `.env.example` with any new variable names, never values;
- keep CI green.

## Explicitly out of scope

Do not implement:

- Pet Profiles
- Lost Pet Reports
- search/filtering
- matching
- conversations/messages
- third-party organization screens
- admin UI
- CSV export
- the rest of the relational schema
- AI matching

Those have specifications already, but they are later tasks.

## Acceptance criteria

The task is complete only when all of the following are true.

1. Prisma is present and the Prisma schema validates.
2. A versioned/reproducible migration creates the application `users` table with:
   - `user_id`
   - unique `auth_provider_id`
   - unique `email`
   - required `display_name`
   - controlled `role` with normal registrations defaulting to `USER`
   - timestamps
3. No application table contains a password or password hash.
4. A normal client cannot assign itself `ADMIN`.
5. Registration/sign-in/sign-out work through the approved server/application boundary.
6. Authenticated identity is available to backend domain code.
7. A successful application registration creates or links exactly one application user profile to the Supabase Auth identity.
8. An unauthenticated user cannot access the protected smoke-test capability.
9. Application profile reads/writes use the repository boundary instead of direct client database access.
10. Secrets remain server-only and `.env.example` contains names only.
11. Tests cover:
    - successful authentication/profile linkage;
    - missing/invalid configuration;
    - unauthenticated access rejection;
    - prevention of client-selected ADMIN role.
12. `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` pass.
13. The migration can be reproduced against the authorized development database using documented commands.

## Repository investigation already completed for planning

The current repository was inspected before writing this task.

Observed:

- Next.js 16.3.8 / React 19.2.8 / TypeScript
- Supabase SSR and JS packages are installed
- `src/lib/supabase/browser.ts`, `server.ts`, and `config.ts` exist
- `.env.example` currently declares public Supabase values and the service-role key
- Jest, ESLint, TypeScript checks, and build scripts exist
- GitHub Actions runs the four verification commands on Node 20
- the latest inspected CI run passed
- the main page is still the create-next-app starter
- there is no Prisma dependency/configuration
- there are no application migrations
- there is no authentication UI/route flow
- there is no protected route
- there is no application `users` persistence layer

This means the task is not hypothetical. It is based on a known gap between the current repository and the approved architecture.

## Proposed implementation plan for team review

The agent should propose a plan equivalent in intent to the following, but it should confirm repository details before implementation.

1. **Re-read the identity, persistence, and security specs.**
   Confirm the approved `users` fields, role rules, server boundary, and secret handling.

2. **Add Prisma as the persistence tool.**
   Add the dependencies/configuration and a server-only `DATABASE_URL`. Do not expose the connection string to the client.

3. **Create the first Prisma model and migration.**
   Add only the application user/profile model for this task. Use the approved field names/constraints. Do not add password columns.

4. **Create the repository boundary.**
   Add a small application-user repository used by Identity & Account Management. Do not let UI components call Prisma directly.

5. **Finish server-side authentication/session plumbing.**
   Reuse the existing Supabase server helper where possible. Keep provider calls behind Authentication Integration and the shared server boundary.

6. **Add minimal auth behavior.**
   Add registration, sign-in, sign-out, and one protected smoke-test route/page. Collect the required application profile information without inventing unrelated profile fields.

7. **Link Supabase identity to the application profile.**
   Ensure one application user row corresponds to the authenticated provider identity and normal signup produces `USER`.

8. **Add tests.**
   Cover the acceptance criteria, especially unauthenticated access and role escalation prevention.

9. **Run all verification.**
   Run Prisma validation/generation/migration checks plus lint, typecheck, test, and build.

10. **Report the result.**
    List changed files, migration behavior, test results, and any remaining issue. Do not expand into Pet Profile work.

## Required stop point for the readiness assignment

For the assignment's plan-review stage, the local agent must stop **before implementing**.

The agent's immediate job is:

1. read this task;
2. inspect the repository itself;
3. compare what it finds with this task and the specifications;
4. propose a concrete file-by-file implementation plan;
5. identify any assumption or concern;
6. stop.

## Team review record

To receive full credit for the "First Implementation Task & Agent Plan" rubric item, the team should fill this in before implementation.

**Reviewers:**  
`[team names]`

**Date:**  
`[date]`

**Decision:**  
`[approved / approved with changes / rejected]`

**What the plan got right:**  
`[team-written explanation]`

**What should change before implementation:**  
`[team-written explanation]`

**Permission to implement after review:**  
`[yes / no]`
