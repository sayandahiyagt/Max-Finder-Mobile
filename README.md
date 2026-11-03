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

Install dependencies:

```bash
npm ci
```

Local Supabase development runs in the dedicated `maxfinder-local` Colima
profile. Start Colima with `colima start --profile maxfinder-local`, then select
its Docker context with `docker context use colima-maxfinder-local`. Supabase
stack, migration, seed, and local-auth smoke commands require this context.
The local database workflow supports macOS with Colima. It does not support
Windows. Prisma schema validation and client generation do not contact a
database.

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

The reset command targets only the local database and seeds two synthetic PNGs
in local Supabase Storage for the seeded Pet Profile and Spotting. Seed accounts
use the password `local-only-test-password` and `.test` email addresses. Stop
the local stack with `npm run db:stop`.

`npm run test:migration-upgrade` temporarily resets the local database to the
legacy schema, checks synthetic rows through the alignment migrations, and
restores the canonical seed. Run it only when no local data beyond the
repository seed needs to be retained.

`npm run db:media-audit` lists local Storage objects without a matching Pet
Profile or Spotting image path. It runs read-only and never removes objects.

`db:configure` creates or updates the ignored `.env.local` file with local
Supabase keys and `DATABASE_URL`. It rejects nonlocal values. Do not copy
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
