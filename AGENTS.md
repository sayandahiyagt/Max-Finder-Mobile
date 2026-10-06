<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ
from older Next.js versions. Read the relevant guide in
`node_modules/next/dist/docs/` before writing code and heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# Max Finder Mobile agent instructions

## Source of truth

Read the documents in `docs/` before making non-trivial changes:

- `docs/architecture.md` — application boundaries and deployment model
- `docs/data-model.md` — domain entities and privacy rules
- `docs/api.md` — required interfaces and response behavior
- `docs/security.md` — authentication, authorization, privacy, and moderation constraints
- `docs/design/user-flows.md` — user-visible workflows
- `docs/first-implementation-task.md` — current first task and proposed plan

The approved iteration plan is the basis for these documents. If a requirement conflicts
with an approved design or client decision, stop and ask the team rather than silently
choosing an implementation.

## Development constraints

- The product is Max Finder Mobile, a Next.js application deployed to Vercel.
- Use TypeScript and the App Router. Keep server-only code, service-role credentials,
  and database access on the server.
- Use the shared Supabase project for development. Never commit `.env.local`, service
  role keys, passwords, or real user data. Use `.env.example` for variable names only.
- Supabase Auth is the identity authority. Do not create a second password store.
- Enforce ownership and admin authorization on the server/database boundary; UI checks
  are not security controls.
- Public views must contain only active lost-pet reports and approved contact data.
- Treat location and direct messages as sensitive data. Collect and expose only what
  the relevant workflow requires.
- Do not add product features or change matching, retention, contact, or moderation
  behavior without updating the authoritative specification and getting team approval.

## Task workflow

1. Read the relevant specification and inspect existing code, migrations, and tests.
2. State assumptions and surface ambiguity before coding. Ask one focused question when
   an unresolved decision affects data, security, or user-visible behavior.
3. Make the smallest complete change, following existing patterns.
4. Add or update automated tests for behavior and authorization boundaries.
5. Run the narrowest applicable checks, then `npm run lint`, `npm run typecheck`,
   `npm test`, and `npm run build` when the change crosses those surfaces.
6. Report changed files, verification commands, failures, and any remaining decision.

## Git and review

- Work in a feature branch and use pull requests; do not push directly to `main`.
- Do not commit secrets or generated build output.
- Keep schema changes versioned and reviewable.
- Do not implement the plan in `docs/first-implementation-task.md` until the team has
  reviewed and approved that plan.
