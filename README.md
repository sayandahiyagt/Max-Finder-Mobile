# MaxFinder Mobile

MaxFinder is a lost-pet reporting and community spotting application built with
Next.js, Supabase, and Leaflet/OpenStreetMap.

## Development setup

The hosted development transition is in progress. Its target is
`sayandahiyagt's Project` (`vkdfgxvdbhmymjkrycif`); see
[transition status and prerequisites](docs/hosted-development-transition.md)
before connecting the refactored app. Production is excluded from this work.

After the development schema has been aligned, teammates can run the app
without local Docker services:

1. Run `npm ci` with Node.js 24.
2. Put the development PostgreSQL connection string in the ignored
   `.env.cloud-development` file as `DATABASE_URL=...`.
3. Download the development project's root CA from **Project Settings →
   Database → SSL Configuration** to `.supabase/development-ca.crt`.
4. Log into Supabase CLI with access to the development project and run
   `npm run cloud:configure` to fetch its Auth/Storage keys securely.
5. Run `npm run dev:cloud` and open `http://127.0.0.1:3001`.

`npm run db:dev:migrations` inspects development migration history;
`npm run db:dev:plan` previews pending migrations without applying them.
Keep the resettable local stack below for synthetic database tests.

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

Keep `SUPABASE_SERVICE_ROLE_KEY` and `DATABASE_URL` server-side. Never commit
`.env.local` or secret values.

Supabase CLI owns the SQL migration history. Prisma provides the typed
application database client. Do not use Prisma Migrate for this repository.

## Supabase database workflow

The repository migrations are in [`supabase/migrations`](./supabase/migrations).
Development and production use separate shared Supabase projects. The Next.js
app connects to whichever project is selected by the environment variables; it
does not require a database service running on the developer's machine.

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

## Vercel deployment workflow

Link the repository to the existing Vercel project once:

```powershell
npx vercel link --yes --project max-finder-mobile
```

Configure these variables in the Vercel Production environment. Use the
production Supabase URL and keys for production deployments:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (store as a hidden secret)
- `DATABASE_URL` (store as a hidden secret)

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
