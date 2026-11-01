# Hosted development transition

Target: `sayandahiyagt's Project`, reference `vkdfgxvdbhmymjkrycif`.
Production (`zbxnmkeolrcpadwzkuhp`) is excluded from this transition.

The Next.js application runs locally against hosted development PostgreSQL,
Auth, and Storage. Prisma owns application queries; Supabase CLI owns migrations.
Keep the isolated local database for resettable synthetic integration tests.

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
a dry run. Both commands explicitly target development. `npm run db:dev:media`
performs an idempotent, development-only check/move for legacy Pet Profile
objects. None of these commands target production, reset a database, or seed
hosted data.

## App configuration and verification

Store the persistent development database connection in ignored
`.env.cloud-development` as `DATABASE_URL=...`. Obtain the connection string from
the development project's Connect panel; never put credentials in chat or Git.
Download the development project's root certificate from **Project Settings →
Database → SSL Configuration** to `.supabase/development-ca.crt`. Runtime
connections require `sslmode=verify-full` and this CA, so both encryption and
server identity are checked. The four runtime settings must all belong to this
same development project. The local environment must remain available for
synthetic tests.

After adding `DATABASE_URL`, run `npm run cloud:configure`. It fetches only the
approved development project's API keys into the ignored environment file with
owner-only permissions. `npm run dev:cloud` runs on `http://127.0.0.1:3001`;
`build:cloud` and `start:cloud` use a separate production build directory.
Cloud settings are passed only to that app process, leaving `.env.local` intact.
The schema alignment is complete. The cloud CA is present at the required
ignored path. The cloud build passed and the app is running at
`http://127.0.0.1:3001`. Smoke checks returned 200 for the home/sign-in pages,
public map, public report and Spotting detail pages, reunion and stats endpoints,
and both image URLs. The map returned one report and two Spottings while omitting
contact/account fields. Anonymous `/api/auth/me` correctly returned 401. The
reunion endpoint returned zero items because development has no eligible reunion.

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
