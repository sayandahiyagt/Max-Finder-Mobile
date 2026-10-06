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
Never commit that file or any service-role key.

## Verification

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

The first task document describes the remaining authentication, migration, and CI work.
