# MaxFinder Mobile

MaxFinder is a lost-pet reporting and community spotting application built with
Next.js, Supabase, and Leaflet/OpenStreetMap.

## Development setup

Install dependencies and create an environment file:

```powershell
npm install
Copy-Item .env.example .env.local -ErrorAction SilentlyContinue
npm run dev
```

Populate `.env.local` with the authorized shared Supabase development values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Never commit that file or any service-role key.

## Supabase database workflow

The repository migrations are in [`supabase/migrations`](./supabase/migrations).
Development and production use separate shared Supabase projects. The Next.js
app connects to whichever project is selected by the environment variables; it
does not require a database service running on the developer's machine.

### Apply migrations to shared Supabase development

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
