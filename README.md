# Max Finder Mobile

Max Finder Mobile is Team 6329's lost-pet reporting and connection application for
CX 3803. The planned deployment target is Vercel, with a shared Supabase development
project.

## Development readiness

- [Project architecture](./docs/architecture.md)
- [Data model](./docs/data-model.md)
- [API and interfaces](./docs/api.md)
- [Security and privacy](./docs/security.md)
- [User flows](./docs/design/user-flows.md)
- [First implementation task and proposed agent plan](./docs/first-implementation-task.md)
- [Agent instructions](./AGENTS.md)

## Local setup

Install dependencies and create a local environment file:

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Populate `.env.local` with the team's authorized shared Supabase development values.
Use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for current Supabase projects; the app
also accepts `NEXT_PUBLIC_SUPABASE_ANON_KEY` for older projects.
Never commit that file or any service-role key.

## Account flow

- `/` starts at sign in when there is no active session.
- `/sign-up` creates an account with email, password, display name, and an optional
  phone number, then opens the profile page.
- A successful sign-in opens `/home`.
- The profile icon on the home page opens `/profile`, where display name and phone
  number can be edited and the user can log out.

For sign-up to create a session immediately, email confirmation must be disabled in
the development Supabase project's Auth settings. If email confirmation is enabled,
the app tells the user to confirm their email before signing in.

## Pet profiles

Apply the migration in `supabase/migrations/20261007000000_create_pets.sql` to the
development Supabase project before creating pet profiles. It creates the owner-scoped
`pets` table, the private `pet-images` Storage bucket, and policies that restrict pet
records and images to their owner.

### Supabase CLI migrations

The repository uses the [Supabase CLI](https://supabase.com/docs/guides/cli) to apply
versioned database migrations. Install the CLI, authenticate with your Supabase account,
and run these commands from the repository root:

```powershell
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

`supabase db push` applies any pending files in `supabase/migrations` to the linked
project. Verify that the remote database is current by running the command again; it
should report `Remote database is up to date.` Do not put database passwords or access
tokens in the repository or in `.env.local`.

## Verification

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

The first task document describes the remaining authentication, migration, and CI work.
