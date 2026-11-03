# Max Finder Mobile

Max Finder helps people report lost pets, share sightings, and find recovery information. The current client is a Next.js web app. The repository uses Supabase for Auth, Storage, and PostgreSQL. Prisma provides application data access; the Supabase CLI applies SQL migrations.

## Development stages

| Stage | App uses | Intended use |
| --- | --- | --- |
| Local development | Local Supabase | Day-to-day coding and testing with disposable local data. |
| Hosted development | Supabase development project | Vercel Preview deployments for reviewing pull requests. |
| Production | Supabase production project | The live app for users. Changes deploy when a reviewed change is merged to `main`. |

The local app connects only to local Supabase. Do not point local development at either hosted database.

## Prerequisites

- Git, Node.js 24, npm, Docker, and the Supabase CLI (the project scripts can invoke it through `npm exec`).
- Local database setup is supported on macOS with Colima. Install Colima if it is not already available. The repository does not currently provide a supported Windows local database workflow.
- Access to the GitHub repository and Supabase CLI login is needed for hosted migrations.

Use the Node version recorded in `.nvmrc`:

```sh
nvm install
nvm use
npm ci
```

If you do not use `nvm`, install Node.js 24 yourself. Vercel currently selects Node.js 26 because `package.json` permits `>=22`; CI and local development use Node.js 24.

## Local development

Start the isolated local Supabase stack. On macOS with Colima:

```sh
colima start --profile maxfinder-local
docker context use colima-maxfinder-local
npm run db:start
```

Initialize or reset the local database and apply its migrations and synthetic seed data:

```sh
npm run db:reset
npm run db:configure
npm run db:migrations
npm run db:prisma:validate
npm run db:prisma:generate
```

`db:reset` deletes and recreates the **local** database. It may be run again to return to a clean sample dataset. It must not be used with hosted projects.

Configure the app with keys from the local Supabase stack, then start it:

```sh
npm run db:configure
npm run dev
```

`db:configure` creates or updates the ignored `.env.local` with loopback URLs and local keys. Do not copy `.env.example` over it. Check `docs/development-environment.md` if setup needs troubleshooting. Open <http://localhost:3000> to use the app. In a second terminal, the local auth smoke check can be run with:

```sh
npm run smoke:local-auth
```

Useful local database commands:

```sh
npm run db:start
npm run db:reset
npm run db:migrations
npm run test:db
npm run test:migration-upgrade
npm run db:media-audit
npm run db:stop
```

When finished, stop the stack. Colima can also be stopped if nothing else is using it:

```sh
npm run db:stop
colima stop --profile maxfinder-local
```

## Hosted development and pull request previews

Create a feature branch and open a pull request. Vercel automatically creates a Preview deployment for the pull request; Preview uses the hosted **development** Supabase project. Reviewers should use the Preview URL. Local development remains connected to local Supabase.

Vercel Preview needs these project environment variables:

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Hosted development project's API URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Hosted development project's publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Hosted development project's service role key; keep secret |
| `DATABASE_URL` | Hosted development PostgreSQL transaction-pooler URL |
| `SUPABASE_DB_CA_CERT_BASE64` | Base64-encoded CA certificate matching that database connection |

Set these in Vercel's **Preview** environment, not in tracked files or `.env.local`. Use the development project's values, never production values.

### Apply migrations to hosted development

Log in to the Supabase CLI if needed:

```sh
npm exec -- supabase login
```

List the remote migration state and preview pending changes:

```sh
npm run db:dev:migrations
npm run db:dev:plan
```

Review the SQL changes and dry-run output. To apply the repository migrations to the hosted development project:

```sh
npm exec -- supabase db push --skip-vault --project-ref vkdfgxvdbhmymjkrycif
npm run db:dev:migrations
```

The project reference is for the hosted development project. The command targets that project explicitly; it does not use the local database. `--skip-vault` avoids applying Supabase Vault changes through this workflow.

If hosted development's Pet Profile images still need the legacy media transfer, the project provides:

```sh
npm run db:dev:media-configure
npm run db:dev:media
```

These commands affect hosted development media. Review their output and use them only when that migration is needed.

## Production

Production uses its own Vercel Production environment variables and hosted production Supabase project. Configure the same five variable names listed above with **production** values. Keep the service role key secret and the CA certificate server-side. Do not use production credentials for local development or Preview.

Production migrations are a release operation. Before applying them, coordinate with the team, confirm the production backup/recovery point, review every pending migration for data loss and compatibility with the currently deployed app, and run the dry-run. In particular, schema changes that drop legacy columns can break the currently deployed version if applied before compatible code is live.

```sh
npm exec -- supabase login
npm exec -- supabase migration list --project-ref zbxnmkeolrcpadwzkuhp
npm exec -- supabase db push --dry-run --skip-vault --project-ref zbxnmkeolrcpadwzkuhp
```

After reviewing the migration plan and release timing, apply and verify:

```sh
npm exec -- supabase db push --skip-vault --project-ref zbxnmkeolrcpadwzkuhp
npm exec -- supabase migration list --project-ref zbxnmkeolrcpadwzkuhp
```

Merging an approved pull request to `main` triggers the Vercel Production deployment. Do not routinely run a manual `vercel deploy --prod`; use the repository's GitHub-to-Vercel deployment flow. After deployment, a basic read-only availability check is:

```sh
curl -fsS https://max-finder-mobile.vercel.app/api/stats
```

Never run `db:reset` or hosted-development media commands against production.

## Checks before opening a pull request

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

For database changes, also validate Prisma and verify the migration against a fresh local database before requesting review:

```sh
npm run db:reset
npm run db:prisma:validate
npm run db:prisma:generate
npm run test:db
npm run test:migration-upgrade
```

See [`docs/development-environment.md`](docs/development-environment.md), [`docs/hosted-development-transition.md`](docs/hosted-development-transition.md), and the other specifications under [`docs/`](docs/) for detailed setup and architecture decisions.
