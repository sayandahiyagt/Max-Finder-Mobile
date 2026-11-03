# Development environment and verification

## Current repository state

The repository is a layered Next.js modular monolith with local-only Supabase
development and Prisma-backed application repositories.

Use three app stages: local development runs against local Supabase; Vercel
Preview deployments from pull requests use hosted development; Vercel Production
deployments from `main` use hosted production. Do not run the local app against
the hosted development project. Vercel's Development environment is not part
of this workflow.

Observed stack:

- Next.js `16.4.3`
- React `19.2.8`
- React DOM `19.2.8`
- TypeScript `5.x`
- `@supabase/ssr`
- `@supabase/supabase-js`
- Prisma 7 with the PostgreSQL driver adapter
- Supabase CLI SQL migrations
- Jest `30.5.2`
- `ts-jest`
- ESLint `9`
- npm lockfile
- GitHub Actions CI
- Vercel-oriented Next.js build

The repository contains:

- Next.js pages, route handlers, and server actions under `src/app/`
- `src/lib/supabase/browser.ts`
- `src/lib/supabase/server.ts`
- `src/lib/supabase/config.ts`
- Prisma models and repositories for application users, Pet / Lost Pet Report writes, messaging, spotting, and map search
- a local Supabase seed with synthetic accounts and feature records
- `.github/workflows/ci.yml`
- `.env.example`

## Remaining implementation work

- The SQL history includes legacy migrations and additive alignment migrations.
  It replays against the isolated local stack, but no hosted schema or data was
  inspected. The coordinate migration intentionally stops when existing
  reports need location repair.
- Prisma repositories own application table reads and writes for identity,
  pets, Lost Pet Reports, messaging, spottings, and search. Organization
  directory and administration modules are not implemented.
- Public map filters run on the server and preserve anonymous report and
  Spotting pins, clickable detail pages, and anonymous contact-data omission.
- Supabase Auth owns credentials and sessions. The local smoke rejects a
  corrupted session cookie and forces a valid session cookie's stored expiry
  into the past to verify proxy refresh and reuse of the returned cookies.
  Cryptographically expired JWT and email-confirmation journeys still need
  end-to-end coverage; integration tests treat a provider-rejected expired
  session as anonymous.
- Report and Spotting date/time forms submit the browser's offset for the
  selected wall-clock time; server actions convert that value to a UTC instant.
- Local database tests cover synthetic Auth signup/sign-in/sign-out and default
  role assignment, identity linkage, pet/report ownership,
  conversation participants, and RLS defenses. Broader browser journeys and
  administrative authorization remain unverified or unimplemented.

## Local prerequisites

Use Node.js 24 to match CI and the supported Supabase JavaScript runtime. The
repository's `.nvmrc` selects this major version; run `nvm use` when using nvm.

Recommended:

```bash
node --version
npm --version
```

Install dependencies, start the isolated local Supabase stack, replay migrations,
and configure the app with local-only keys:

```bash
npm ci
colima start --profile maxfinder-local
docker context use colima-maxfinder-local
npm run db:start
npm run db:reset
npm run db:configure
npm run db:migrations
npm run db:prisma:validate
npm run db:prisma:generate
npm run test:db
npm run db:media-audit
npm run test:migration-upgrade
npm run dev
```

Run the local Supabase stack on macOS with Colima. The scripts require the
Docker context `colima-maxfinder-local`. The repository has no supported
Windows setup for local database work. Do not use Docker Desktop or a hosted
project with these commands. The guards reject other contexts and nonlocal
database URLs.

`db:reset` applies the repository SQL migrations and synthetic
`supabase/seed.sql` data to the local database, then upserts two PNGs to the
local Pet Profile and Spotting buckets. The seed includes three owned Pet
Profiles and LOST, FOUND, and REMOVED reports. The local smoke verifies the
found report appears in the reunion API and removed reports stay off public
detail and map results. The reset is safe to rerun.
`db:configure` writes local
loopback keys and `DATABASE_URL` to the ignored `.env.local` file. When that
file already exists, the script adds only a missing local database URL. It
refuses to edit settings that point to another Supabase project. The
`local-supabase.mjs` wrapper permits local stack start/stop/status, the normal
seeded local reset, migration listing/application, and the exact historical
reset required by `test:migration-upgrade`. It rejects other CLI commands even
if Supabase CLI metadata names a hosted project. Status output shows loopback
endpoints and does not print local keys. These guards protect the documented
npm scripts; do not run raw Supabase CLI commands during this local-only
refactor.

## Current environment variables

The repository currently declares:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL
SUPABASE_DB_CA_CERT_BASE64
```

During local development, `db:configure` sets these variables from the local
Supabase stack. Vercel Preview variables must point to the hosted development
project; Vercel Production variables must point to production. Keep those
credentials in their Vercel environment scopes and do not copy them into
`.env.local`.

`DATABASE_URL` points Prisma at the local Supabase PostgreSQL service during
local development. Supabase CLI owns the SQL migration history. Prisma Migrate
is not used in this repository.

`SUPABASE_DB_CA_CERT_BASE64` is required only in Vercel Preview and Production.
Set it to the base64-encoded PEM root CA certificate downloaded from the
matching Supabase project's database settings. It is certificate material, not
an API key. The database URL and service-role key are secrets; the CA
certificate does not grant access, but keep this server-only variable out of
browser code. Local Supabase uses its loopback connection and does not need it.

Use the Preview scope for the hosted development project's URL, publishable
key, service-role key, transaction-pooler `DATABASE_URL`, and CA certificate.
Use the Production scope for the corresponding production project's values.
Do not configure the Vercel Development scope; local app development uses
`.env.local` with the local Supabase stack.

Do not put `SUPABASE_SERVICE_ROLE_KEY` or `DATABASE_URL` in browser code.

## Run the application

```bash
npm run dev
```

The Next.js development server uses the local Supabase URL and database URL
from `.env.local`. It writes development state to `.next-dev`, separate from
the `.next` production build output, so building while the dev server is active
does not replace its files.

## Verification commands

The repository defines:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run db:prisma:validate
npm run db:prisma:generate
npm run test:db
npm run db:media-audit
npm run test:migration-upgrade
npm run smoke:local-auth
```

These map to:

- ESLint
- `tsc --noEmit`
- Jest in run-in-band mode
- production Next.js build

ESLint also enforces the module boundaries: pages and components cannot import
Prisma or the database client directly, and feature modules cannot import
feature repositories directly. Feature logic cannot import Next.js or Supabase
adapters, and feature application modules must call their repositories rather
than Prisma directly.

`npm run test:db` runs a synthetic Auth lifecycle journey and identity,
Pet / Lost Pet Report, and messaging repository integration tests against local
Supabase. The tests use synthetic seeded Auth users and remove their generated
rows afterward. The script requires the
dedicated Docker context and rejects any database URL outside `localhost:54322`.
It includes a Storage reconciliation check that uploads synthetic objects to
local buckets, verifies the read-only audit reports them, and removes those
test objects afterward. It does not run in the standard CI test command.

`npm run db:media-audit` compares local Storage object names with Pet Profile
and Spotting image paths. It requires the dedicated Docker context and local
loopback URLs. The audit reports candidates for review; it does not prove that
an object is safe to delete and never changes database or Storage data.

`npm run test:migration-upgrade` resets only the isolated local database to the
legacy migration point, inserts synthetic Auth, pet, report, conversation, and
message rows, applies the remaining migrations, verifies ownership and fields,
then resets to the canonical synthetic seed in a `finally` path. It requires
the dedicated Docker context and loopback PostgreSQL URL. Do not run it while
depending on local database contents beyond the repository seed.

With the app running, execute `npm run smoke:local-auth` in a second terminal.
The command checks anonymous denial for identity lookup and protected pages,
then signs in with the synthetic owner account and checks that the Next proxy
forwards its session to the Prisma identity endpoint. It then sets the stored
expiry on a copy of that valid local cookie into the past, verifies the proxy
returns refreshed cookies, and confirms they work on a subsequent request. It
loads Pet Profile and report pages and images, messaging pages, public map
pins, report and spotting routes and images, statistics, and reunion routes.
It also verifies rendered image sources point directly at local Supabase
Storage. The script requires the local Supabase ports and the dedicated Docker
context.

## Continuous integration

`.github/workflows/ci.yml` runs on pull requests and pushes to `main`.

It:

1. checks out the repository;
2. uses Node.js 24;
3. runs `npm ci`;
4. runs lint;
5. probes architectural module boundaries;
6. validates the Prisma schema;
7. runs type checking;
8. runs tests;
9. runs the production build.

Do not weaken CI to make a change pass. Fix the implementation or update the documented verification contract through team review.

## What "ready for development" means here

A developer or agent can determine:

- how to install dependencies;
- which Node version CI uses;
- how to configure local environment variables without committing secrets;
- how to run the app;
- how to lint, type-check, test, and build;
- which missing pieces are feature/foundation work rather than undocumented setup.

The local setup, verification commands, and remaining architecture work are documented here.
