# MaxFinder Mobile

MaxFinder is a lost-pet reporting and community spotting application built with
Next.js, Supabase, and Leaflet/OpenStreetMap.

## Local setup

Install dependencies and create a local environment file:

```powershell
npm install
Copy-Item .env.example .env.local -ErrorAction SilentlyContinue
npm run dev
```

Populate `.env.local` with the authorized Supabase development values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Never commit that file or any service-role key.

## Local development data

After starting local Supabase and applying the repository migrations, run:

```powershell
npm run seed:dev
```

The command creates two passwordless development identities, two related pets, three lost-pet reports including two reunited pets, and two spottings. It uploads the bundled WebP images to deterministic paths and upserts fixed record IDs, so repeated runs do not create duplicates.

The script accepts only `localhost`, `127.0.0.1`, or `::1` Supabase URLs. It refuses hosted and production projects and never deletes existing records.

## Supabase database workflow

The repository migrations are in [`supabase/migrations`](./supabase/migrations).
The local Supabase CLI uses Docker Desktop.

### Start the local database

Run these commands once after installing the Supabase CLI:

```powershell
supabase init
supabase start
supabase db reset
```

`supabase db reset` recreates the local database from the repository migrations.
It is appropriate for local development only and removes local database data.

Check local service status or stop the local services with:

```powershell
supabase status
supabase stop
```

### Apply database changes locally

After adding or changing a migration:

```powershell
supabase db reset
```

To preview the migration plan without applying it:

```powershell
supabase db push --local --dry-run
```

### Apply migrations to Supabase development

Link the CLI to the shared development project, then push the migrations:

```powershell
supabase link --project-ref vkdfgxvdbhmymjkrycif
supabase db push --linked
supabase migration list --linked
```

### Apply migrations to Supabase production

Production migrations must be reviewed and tested against development first:

```powershell
supabase link --project-ref zbxnmkeolrcpadwzkuhp
supabase db push --linked --dry-run
supabase db push --linked
supabase migration list --linked
```

The CLI is linked to one Supabase project at a time. Re-run `supabase link`
before switching between development and production.

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
```
