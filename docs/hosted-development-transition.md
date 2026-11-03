# Hosted development transition

Target: `sayandahiyagt's Project`, reference `vkdfgxvdbhmymjkrycif`.
Production (`zbxnmkeolrcpadwzkuhp`) is excluded from this transition.

The application uses three stages: local development runs against local
Supabase; Vercel Preview deployments from pull requests use hosted development;
Vercel Production deployments from `main` use hosted production. Do not run the
local app against hosted development. Prisma owns application queries;
Supabase CLI owns migrations. Keep the isolated local database for resettable
synthetic integration tests.

## Inspected state

Inspection before migration on 2026-11-01 confirmed:

- Development has the legacy pet-linked reports, `profiles`, conversation
  participant columns, and both message content columns.
- Its migration history recorded only `202610150001` and `202610150002`.
  The ten October 7 migrations were not recorded, although their schema existed.
- Existing data: 2 Auth accounts, 3 pets, 1 report, 2 spottings,
  1 conversation, and 3 messages. The initial inspection printed only aggregate
  counts; a protected local backup was made before migration below.
- The report has location fields and conversation duplicate fields agree.
- `pet-images` was private; `lost-pet-images` and `spotting-images` were public.
- The refactor branch's HEAD matches `origin/main`; work is uncommitted.

Additional checks found no ownership, pet-detail, image-path, message-content,
or contact-value conflicts in the existing development records. A schema-only
export was restored to an isolated scratch database, populated with synthetic
legacy fixtures, and all eleven alignment migrations applied successfully.
Ownership mapping, report locations/contact values, images, and message history
passed the shared migration assertions. The scratch database was removed.
This verifies schema compatibility with synthetic data, not a restore of real
development records.

Auth settings confirm password signup is enabled and email auto-confirm is on.
The current password actions do not use an Auth redirect URL. The dashboard
allowlist does not include localhost:3001, so add it before introducing OAuth,
email confirmation, or another redirect-based flow. Read-only Storage checks
found an object for every Pet Profile and Spotting image reference. Existing
profile display names fit the new application-user field limit.

## Development database transition completed

Before writing to development, a data-only backup of the `public`, `auth`, and
`storage` schemas was saved under ignored `tmp/cloud-development-audit/` with
file mode `0600`. It is sensitive and must not be committed or shared.

The ten October 7 entries were added to development migration history as
already applied after checking their schema effects. The eleven October 31
alignment migrations were then applied to development. No migration files were
rewritten, and the hosted database was not reset. The final CLI migration list
matches all local migrations and the dry run reports no pending migrations.

Post-migration verification retained the same counts: 2 Auth users, 2
application users, 3 pets, 3 Pet Profile images, 1 report, 2 spottings, 1
conversation, and 3 messages. Ownership, pet/report/conversation/message
relationships all resolve. All 3 Pet Profile image objects now exist in the
private `pet-images` bucket; both Spotting images remain in `spotting-images`.
The two legacy Pet Profile objects were moved with Supabase Storage's API,
without changing their database paths or bytes.

The Prisma connection uses the hosted `postgres` role. It is not a superuser,
but it has `BYPASSRLS`; server-side application authorization must therefore
remain mandatory, and the connection string must never leave the server. The
Supabase service-role key is also server-only.

Use `npm run db:dev:migrations` to inspect history and `npm run db:dev:plan` for
a dry run. Both commands explicitly target development. For the one-off Storage
migration, run `npm run db:dev:media-configure` to fetch a narrowly scoped key
into ignored `.env.development-media`, then run `npm run db:dev:media`. The
media command checks and moves referenced legacy Pet Profile objects within
development. It does not target production, reset the database, or seed hosted
data.

## Vercel Preview status

Pull requests create Vercel Preview deployments for team review. Configure the
Preview environment variables to use the hosted development project. At the
latest check, Preview was missing `DATABASE_URL`; it must use the development
project's transaction pooler. The Preview database connection and certificate
setup are not yet verified. Production remains separate and is not part of this
transition.

The repository no longer runs the application locally against hosted
development. Use the local Supabase stack for local app development and
synthetic tests. The development CLI commands above remain for reviewed shared
database and one-off Storage maintenance tasks.

To repeat the schema rehearsal, export only development's schema to ignored
`tmp/cloud-development-audit/schema.sql`, then run
`node scripts/rehearse-cloud-schema.mjs`. It requires the dedicated local Docker
context and loopback database, creates a new scratch database, and removes it
in a `finally` path. It never resets the canonical local database or connects to
hosted PostgreSQL. The exported schema is an external prerequisite, not a
committed repository artifact.

Do not copy the local seed accounts or images into the shared project.

For code review, push the verified work on a feature branch and open a pull
request. Include team setup instructions and reviewed migration steps.
Do not push directly to main or add credentials, backup files, or build output.
