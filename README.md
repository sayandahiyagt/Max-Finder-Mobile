# MaxFinder Mobile

MaxFinder is a lost-pet reporting and community spotting application built with
Next.js, Supabase, and Leaflet/OpenStreetMap.

## Three application stages

- **Local development:** run the app with local Supabase and synthetic data.
- **Team review:** pull requests create Vercel Preview deployments. Configure
  Preview environment variables to use the hosted development Supabase project.
- **Production:** Vercel deploys `main` with the production Supabase project.

Vercel's Development environment is not part of this workflow. Do not run the
app locally against hosted development. See the
[environment and verification guide](docs/development-environment.md) for
local setup and the
[hosted development transition record](docs/hosted-development-transition.md)
for shared-project status.

The public map's zoom-scaled individual dots and synthetic demo dataset are
documented in the [map dots and demo data guide](docs/map-clustering-readme.md).

Install dependencies:

```bash
npm ci
```

Local Supabase development uses an isolated container engine: Colima on macOS
or Podman Desktop on Windows. On macOS, start the `maxfinder-local` Colima
profile and select `colima-maxfinder-local`. On Windows, start the Podman
machine and select the `podman-maxfinder-local` Docker context. The local
Supabase scripts verify the platform-specific context before operating. See
[`docs/development-environment.md`](docs/development-environment.md) for the
Windows context setup and Podman API troubleshooting steps. Prisma schema
validation and client generation do not contact a database.

Start the local stack, apply the repository migrations, and load synthetic
records with:

```bash
npm run db:start
npm run db:reset
npm run db:migrations
npm run db:configure
npm run db:prisma:validate
npm run db:prisma:generate
npm run test:db
npm run db:media-audit
npm run test:migration-upgrade
npm run dev
```

The reset command replaces only the local database contents, reapplies its
migrations, loads canonical synthetic records and local demo photos, then adds
1,200 synthetic LOST reports, 800 spottings, 2,000 regional cluster points, a 600-point Duluth cluster, and 12,000 nationwide coverage points by
default. The reset runs the cluster seeder as
`node scripts/seed-map-cluster-demo-data.mjs --points 2000`. The national
points form a jittered oval grid about 15 to 20 miles apart across the
contiguous U.S.

To add the national grid to an existing local database without resetting it,
run:

~~~powershell
npm run db:seed:map:density
~~~

Preview a different size before inserting:

~~~powershell
npm run db:seed:map:density -- --points 16000 --dry-run
~~~

The density command is additive and repeatable. Seed accounts use the
password local-only-test-password and .test email addresses. Stop the local
stack with npm run db:stop.

To refresh only the 2,000-point regional cluster batch in an already-running
local database, run:

```powershell
npm run db:seed:map:clusters
```

This command runs the cluster seeder and prepares its private pet photos.
The database integration, media audit, migration-upgrade, and local-auth smoke
scripts currently require macOS with the Colima context. Windows with Podman
supports the local app stack, reset, configuration, status, and migration
commands.

`npm run test:migration-upgrade` temporarily resets the local database to the
legacy schema, checks synthetic rows through the alignment migrations, and
restores the regular synthetic seed, including map-demo data. Run it only when
no local data beyond the repository seed needs to be retained.

`npm run db:media-audit` lists local Storage objects without a matching Pet
Profile or Spotting image path. It runs read-only and never removes objects.

`db:configure` creates or updates the ignored `.env.local` file with local
Supabase keys and `DATABASE_URL`; it does not reset or seed the database.
`db:reset` is the command that replaces local database contents and runs the
seeders. `db:configure` rejects nonlocal values. Do not copy
`.env.example` to `.env.local`.

The synthetic seed includes ordinary users and an admin account. Seed passwords
work only in the local Supabase Auth stack.

With the app running, use a second terminal to check the seeded sign-in and
session flow:

```bash
npm run smoke:local-auth
```

The tracked environment variable names are:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `SUPABASE_DB_CA_CERT_BASE64` (Vercel Preview and Production only)

Keep `SUPABASE_SERVICE_ROLE_KEY` and `DATABASE_URL` server-side. Never commit
`.env.local` or secret values.

Supabase CLI owns the SQL migration history. Prisma provides the typed
application database client. Do not use Prisma Migrate for this repository.

## Supabase database workflow

The repository migrations are in [`supabase/migrations`](./supabase/migrations).
Development and production use separate shared Supabase projects. Local app
development always uses the local Supabase stack. Vercel Preview uses hosted
development, and Vercel Production uses hosted production.

### Apply migrations to shared Supabase development

This workflow changes a hosted database. Use it only after local verification
and explicit team approval.

Link the CLI to the shared development project, then push the migrations:

```powershell
supabase link --project-ref vkdfgxvdbhmymjkrycif
supabase db push --linked
supabase migration list --linked
```

### Apply migrations to shared Supabase production

Production migrations must be reviewed and tested against development first:

```powershell
supabase link --project-ref zbxnmkeolrcpadwzkuhp
supabase db push --linked --dry-run
supabase db push --linked
supabase migration list --linked
```

The CLI is linked to one Supabase project at a time. Re-run `supabase link`
before switching between the shared development and production projects.

The one-off Pet Profile Storage migration is separate from app development. Run
`npm run db:dev:media-configure` to prepare its ignored development-only key
file, then `npm run db:dev:media`. The command only targets the hosted
development project.

## Vercel deployment workflow

Link the repository to the existing Vercel project once:

```powershell
npx vercel link --yes --project max-finder-mobile
```

Configure these variables separately in Vercel Preview and Production. Preview
uses the hosted development project; Production uses the production project.
Use the matching project's transaction-pooler connection string for
`DATABASE_URL`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (store as a hidden secret)
- `DATABASE_URL` (store as a hidden secret)
- `SUPABASE_DB_CA_CERT_BASE64` (server-only TLS certificate setting)

For each Vercel environment, get the PostgreSQL root CA certificate from that
Supabase project's database settings and encode the PEM file as one base64
value. Add it as `SUPABASE_DB_CA_CERT_BASE64` in the matching Vercel scope.
This is certificate material, not an API key. Keep it server-only alongside
the database URL. Local development does not need it. The app verifies the
certificate when Prisma connects to hosted PostgreSQL. A successful Vercel
build alone does not prove database-backed features can connect.

Deploy a production build:

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npx vercel deploy --prod --yes
```

Verify the deployment:

```powershell
npx vercel inspect https://max-finder-mobile.vercel.app --wait
npx vercel curl https://max-finder-mobile.vercel.app
```

Never commit `.env.local`, `.vercel`, database credentials, or Supabase
service-role keys.

## Verification

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npm run test:db
npm run db:media-audit
npm run test:migration-upgrade
```
