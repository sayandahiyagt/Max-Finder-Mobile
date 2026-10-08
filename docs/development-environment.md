# Development environment and verification

## Repository state inspected for this handoff

The repository already has the basic development scaffold.

Observed stack:

- Next.js `16.3.8`
- React `19.2.8`
- React DOM `19.2.8`
- TypeScript `5.x`
- `@supabase/ssr`
- `@supabase/supabase-js`
- Jest `30.5.2`
- `ts-jest`
- ESLint `9`
- npm lockfile
- GitHub Actions CI
- Vercel-oriented Next.js build

The repository contains:

- `src/app/` with the default Next.js page/layout
- `src/lib/supabase/browser.ts`
- `src/lib/supabase/server.ts`
- `src/lib/supabase/config.ts`
- one Supabase configuration test
- `.github/workflows/ci.yml`
- `.env.example`

The latest inspected CI run on `main` completed successfully.

## Important gaps relative to the current design

These are not hidden assumptions. They are known remaining implementation work:

- Prisma is required by the approved Detailed Design, but Prisma packages/configuration are not present yet.
- No application database migration exists yet.
- The approved `users`, `pets`, `pet_images`, `lost_pet_reports`, `conversations`, `messages`, and `third_party_organizations` schema has not been created in the repository.
- Authentication pages/actions are not implemented.
- Session refresh/protected-route behavior is not implemented.
- The home page is still the create-next-app starter page.
- No feature-level domain/repository modules exist yet.
- `src/lib/supabase/browser.ts` exists, but future use must respect the architecture rule that backend/domain operations do not bypass the shared server boundary.

## Local prerequisites

Use Node.js 20 to match CI.

Recommended:

```bash
node --version
npm --version
```

Then:

```bash
npm ci
cp .env.example .env.local
```

On PowerShell:

```powershell
npm ci
Copy-Item .env.example .env.local
```

Populate `.env.local` only with authorized development values.

## Current environment variables

The repository currently declares:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

The first Prisma-backed database task will also need a server-only PostgreSQL connection variable such as:

```text
DATABASE_URL
```

Add the variable name to `.env.example` when Prisma is introduced, but never commit its value.

Do not put `SUPABASE_SERVICE_ROLE_KEY` or `DATABASE_URL` in browser code.

## Run the application

```bash
npm run dev
```

The current scaffold should start the Next.js development server.

## Verification commands

The repository defines:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

These map to:

- ESLint
- `tsc --noEmit`
- Jest in run-in-band mode
- production Next.js build

For database changes, also add and run the relevant Prisma validation/generation/migration checks once Prisma is installed.

## Continuous integration

`.github/workflows/ci.yml` runs on pull requests and pushes to `main`.

It:

1. checks out the repository;
2. uses Node.js 20;
3. runs `npm ci`;
4. runs lint;
5. runs type checking;
6. runs tests;
7. runs the production build.

Do not weaken CI to make a change pass. Fix the implementation or update the documented verification contract through team review.

## What "ready for development" means here

A developer or agent can determine:

- how to install dependencies;
- which Node version CI uses;
- how to configure local environment variables without committing secrets;
- how to run the app;
- how to lint, type-check, test, and build;
- which missing pieces are feature/foundation work rather than undocumented setup.

That is enough to begin the approved first implementation task without the agent inventing a toolchain.
