# Max Finder Mobile agent instructions

## Read specifications before coding

The authoritative repository specifications are under `docs/`.

Read the files relevant to the task before changing code:

- `docs/architecture.md` for application boundaries and dependency rules
- `docs/data-model.md` for relational entities, fields, relationships, and integrity constraints
- `docs/interfaces.md` for behavior at the shared application interface
- `docs/security.md` for authentication, authorization, privacy, and sensitive-data rules
- `docs/design/user-flows.md` for expected user behavior
- `docs/design/ui-spec.md` for screen-level constraints
- `docs/development-environment.md` for setup and verification
- `docs/decisions-and-open-questions.md` for decisions that must not be silently reinterpreted
- `docs/first-implementation-task.md` when working on the first approved implementation task

Do not copy these specifications into this file. This file describes how to work within them.

## Architectural constraints

Max Finder Mobile is a layered modular monolith.

The current client is a Next.js, React, and TypeScript web application. A React Native and Expo mobile client is planned later. Both clients must use the shared Application API / Server Interface. Do not make presentation code the owner of business rules, authorization, or persistence.

The approved persistence boundary is Prisma-backed and stores application-owned data in Supabase PostgreSQL. Supabase Auth is the identity and credential authority. Supabase Storage holds Pet Profile media. Platform geolocation is optional and permission-controlled.

Do not create direct client-to-database access. Do not create a second password store. Do not use client-side checks as the only authorization control.

## Data and product constraints

Keep these decisions intact unless the team changes the specification first:

- `Lost Pet Report` is the only report object. `LOST`, `FOUND`, and `REMOVED` are lifecycle states.
- Search and filtering of Lost Pet Reports require authentication.
- Lost Pet Reports reuse the associated Pet Profile image. Do not add a `report_images` table.
- Do not add `is_active` to Lost Pet Reports. Status is the authoritative activity state.
- Do not add `last_message_at` to conversations. Derive it from messages.
- Third-party shelters, rescues, and animal hospitals are application-owned directory records in PostgreSQL for Version 1.
- Current device/search location is temporary input and is different from the persisted last-known pet location.
- Application/domain authorization is primary. RLS is defense in depth.
- Administration is web-only in the current scope.
- Version 1 does not include user blocking, user-reporting, abuse-review workflows, or message-limit promises unless a later approved specification adds them.
- AI-assisted matching is not part of the required MVP.

## How to approach a nontrivial task

1. Read the relevant specifications.
2. Inspect the existing repository before proposing changes.
3. State any conflict between the repository and the specification.
4. Propose the smallest complete implementation that satisfies the documented behavior.
5. Identify security, migration, and test implications before coding.
6. If an unresolved decision affects user-visible behavior, data shape, security, or privacy, stop and ask the team.
7. After implementation is explicitly approved, add or update tests and run the repository verification commands.

Do not silently resolve a documented open question by inventing product behavior.

## Verification

For code changes, use the narrowest useful test first, then run the full repository gates when the change is ready:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Database work must also validate the Prisma schema and prove migrations are reproducible before it is considered complete.

Security-sensitive work needs negative tests, not only happy-path tests. At minimum, test unauthenticated access, wrong-user access where ownership matters, and non-admin access to administrative behavior.

## First-task stop rule

For `docs/first-implementation-task.md`, the readiness assignment requires investigation and a proposed plan before implementation.

Unless the team explicitly says the plan has been reviewed and approved, do this:

1. inspect the repository;
2. compare it with the task and specifications;
3. propose the implementation plan;
4. report assumptions and risks;
5. stop.

Do not implement the first task during the planning-only handoff step.

## Git and secrets

Use a feature branch and pull request. Do not push implementation directly to `main`.

Never commit `.env.local`, database credentials, the Supabase service-role key, passwords, real user data, or generated build output. `.env.example` should contain variable names only.

Next.js in this repository is version 16. When framework behavior is uncertain, check the installed Next.js documentation and current project patterns rather than relying on older conventions.
