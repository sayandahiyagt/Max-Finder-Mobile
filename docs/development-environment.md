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
and configure the app with local-only keys. Use the platform-specific container
setup below before running the Supabase commands:

```bash
npm ci
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

On macOS, run the local Supabase stack with the `maxfinder-local` Colima
profile and select the `colima-maxfinder-local` Docker context:

```bash
colima start --profile maxfinder-local
docker context use colima-maxfinder-local
```

On Windows, use Podman Desktop. Start its Podman machine, then make sure the
Docker CLI context named `podman-maxfinder-local` points to the Podman machine's
named pipe. If Podman Desktop has not created that context, create it from the
machine's reported pipe in PowerShell:

```powershell
podman machine start
$podmanPipe = podman machine inspect --format '{{.ConnectionInfo.PodmanPipe.Path}}'
$podmanEndpoint = "npipe://" + ($podmanPipe -replace '\\', '/')
docker context create podman-maxfinder-local --docker "host=$podmanEndpoint"
docker context use podman-maxfinder-local
docker --context podman-maxfinder-local info
```

The final command must connect and show Podman in its Server section. The
Supabase scripts verify `podman-maxfinder-local` on Windows and
`colima-maxfinder-local` on macOS. They do not target Docker Desktop or a hosted
project. The database test, media audit, migration-upgrade, and local-auth
smoke scripts still enforce the macOS Colima context. The regular app stack,
reset, status, migration listing/application, and local configuration scripts
support the Windows Podman context.

### Podman API pipe troubleshooting (Windows)

Podman 6.1.4 has a reported Windows issue where `podman machine start` succeeds
and `podman info` works, but the Docker API named pipe is missing. If
`docker --context podman-maxfinder-local info` reports that
`podman-machine-default` cannot be found, stop the machine and remove only its
stale temporary API socket file if present, then start it again:

```powershell
podman machine stop
$proxySock = Join-Path $env:TEMP 'podman\podman-machine-default-api.sock'
if (Test-Path -LiteralPath $proxySock) {
    Remove-Item -LiteralPath $proxySock -Force
}
podman machine start
docker --context podman-maxfinder-local info
```

This workaround is documented in the [Podman Windows API pipe issue](https://github.com/podman-container-tools/podman/issues/29971). Do not remove
other files from the temporary directory.

`db:reset` replaces the local database contents, applies the repository SQL
migrations and synthetic `supabase/seed.sql` data, then uploads eight openly
licensed pet-photo examples to local Storage. It uses them for public Spotting
images and keeps private Pet Profile images for the original and neighborhood-cluster examples. The high-volume national grid intentionally omits private pet-image objects.
The seed includes three original Pet
Profiles and four additional demo pets, five nearby LOST reports, five nearby
spottings, and FOUND and REMOVED reports. After the image setup, reset adds 1,200 synthetic LOST reports and 800
synthetic spottings across U.S. cities and towns, 2,000 regional cluster
points (500 of each activity type), a 600-point Duluth, Georgia cluster (300
LOST reports and 300 spottings), and 12,000 nationwide coverage points by
default (6,000 LOST reports and 6,000 spottings). Duluth points use public
parks and landmarks rather than residential addresses. Generated map records
use curated city-center or public-landmark coordinates directly; coordinates
are not randomly jittered into oceans or lakes. Multiple records can share an
anchor coordinate. Lost-pet records in this high-volume batch have no private profile
image, while Spotting records reuse the local public demo-photo catalog. The
local Supabase reset wrapper runs
`node scripts/seed-map-cluster-demo-data.mjs --points 2000` as one of its seed
steps. Reset output prints that command and reports the inserted report and
Spotting counts when it completes.
It places 70% of both report and Spotting points across 14 southern states,
with the rest spread across nine western and twelve northeastern states. Every
record remains an individual red or blue dot at every zoom level. The 2,000 records use unique coordinates around 250 curated city and landmark anchors across 222 cities, with red and blue counts balanced in every covered state.
The base map seed
keeps wider city and rural coverage elsewhere.

To preview the exact 1,000/1,000 activity split, state coverage, and distinct
coordinates without connecting to PostgreSQL, run
`node scripts/seed-map-cluster-demo-data.mjs --points 2000 --dry-run --json`.
The seeder reads `DATABASE_URL` from ignored `.env.local` and accepts only the
local Supabase PostgreSQL endpoint.

To add only the national coverage grid to an existing local database, run:

~~~powershell
npm run db:seed:map:density
~~~

The national seeder is additive and repeatable. Preview or change its size
without touching the database:

~~~powershell
npm run db:seed:map:density -- --points 16000 --dry-run
~~~

To add the Duluth cluster to an already-running local database without
resetting its existing data, run:

~~~powershell
npm run db:seed:map:duluth
~~~

It uploads the bundled demo-photo catalog to local Storage, adds synthetic
activity near Duluth Town Green, Bunten Road Park, and McDaniel Farm Park, and
prepares local pet photos. It does not delete existing demo media. Re-running
the command does not duplicate these points. Preview the planned data with
`node scripts/seed-map-duluth-demo-data.mjs --dry-run`.

The map seeders use stable IDs to skip records already added and preserve
canonical seed records. The regional cluster seeder replaces only its own
marked demo batch when run directly; use `npm run db:seed:map:clusters` to
refresh its default 2,000 points without resetting the database. The nationwide
density seeder is additive: changing its point count can add another batch.
The regional batch defaults to 2,000 points during reset. Set
`MAXFINDER_DULUTH_DEMO_POINTS` to an even number from
100 to 2,000 before `db:reset` to change the Duluth batch size. The local smoke
verifies the found report appears in the reunion API and removed reports stay
off public detail and map results. The reset is safe to rerun.
`db:configure` only writes local
loopback keys and `DATABASE_URL` to the ignored `.env.local` file; it does not
reset or seed the database. When that
file already exists, the script adds only a missing local database URL. It
refuses to edit settings that point to another Supabase project. The
`local-supabase.mjs` wrapper permits local stack start/stop/status, the normal
seeded local reset, migration listing/application, and the exact historical
reset required by `test:migration-upgrade`. It rejects other CLI commands even
if Supabase CLI metadata names a hosted project. Status output shows loopback
endpoints and does not print local keys. These guards protect the documented
npm scripts; do not run raw Supabase CLI commands during this local-only
refactor.

The regular reset loads the map demo data, including the 2,000-point cluster
seeder invocation shown above, so no extra seed command is needed after a
reset. `db:configure` can safely run before or after reset and does not modify
database contents. These changes add no schema migration. The dataset is
synthetic and local; it is not pushed to hosted Supabase projects.

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
