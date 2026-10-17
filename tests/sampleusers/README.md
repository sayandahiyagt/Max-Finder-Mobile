# Sample test accounts

Documentation of the Supabase Auth field set used by `accounts.json` in this
directory. These are **fixture records only** — they hold no real passwords
and no real user PII. They exist so migration/seed tests and reviews can refer
to a single, concrete auth-field reference (see `accounts.test.ts`).

## Auth field set

This mission targets the **actual committed schema**, not the aspirational
`users` table in `docs/data-model.md`. Identity is split across two records:

| Field             | Lives in (actual schema)                         | Notes                                                                 |
| ----------------- | ------------------------------------------------ | --------------------------------------------------------------------- |
| `id`              | `auth.users.id` **and** `profiles.id`            | UUID. `profiles.id` references `auth.users(id)` (1:1, cascade delete). A `handle_new_user()` trigger auto-creates the profile on auth user insert. |
| `email`           | `auth.users.email`                               | Not present in `profiles`. Lives only in Supabase Auth.               |
| `display_name`    | `profiles.display_name`                          | Defaults to `'MaxFinder member'` (set by the trigger from `raw_user_meta_data.display_name`). |
| `created_at`      | `auth.users.created_at` and `profiles.created_at`| Auth creation and profile creation are separate timestamps.        |
| `role`            | *(absent from the committed schema)*             | See "Schema decision & drift" below.                                  |

### Source citations (actual schema)

- `auth.users` columns (`id`, `email`, `created_at`, `raw_user_meta_data`) are
  owned by Supabase Auth — see `README.md` ("Never commit ... Supabase
  service-role keys") and `AGENTS.md` ("Supabase Auth is the identity and
  credential authority").
- `profiles` columns (`id`, `display_name`, `created_at`) are defined in
  `supabase/migrations/202610150001_initial_maxfinder.sql`.
- The 1:1 link and auto-profile creation are implemented by the
  `handle_new_user()` trigger + `on_auth_user_created` trigger in the same
  migration.

## Schema decision & drift (not silently picked)

Decision required by the ONBOARD step: which schema defines "auth fields",
real accounts or fixtures. This executor chose the conservative path and is
documenting it explicitly rather than assuming it:

1. The 5 accounts are **fixture records** (no real passwords committed),
   matching `AGENTS.md`'s prohibition on committing passwords/real user data
   and `.gitignore`'s exclusion of `.env*`.
2. The fixtures target the **actual committed `profiles` + `auth.users`
   schema**. `docs/data-model.md` instead defines a `users` table with
   `user_id`, `auth_provider_id`, `email`, `role`, etc. The committed
   migration does **not** implement `users`, `pets`, `pet_images`, or a
   `lost_pet_reports.report_id`/`pet_id` foreign key — it uses the legacy
   layout (`profiles`, `lost_pet_reports` with embedded pet fields).
3. Source code already accounts for this drift: `src/app/lost-pets/actions.ts`
   branches on a `usesLegacySchema` flag by probing for a `pets` table. On
   the committed schema `pets` does not exist, so the legacy path runs.

If the team decides the **spec `users` schema** is authoritative for "auth
fields", that requires a separate migration to introduce `users` (with
`role`/`email`) — do **not** invent that column here. Until then, fixtures are
documented against the schema the migration actually creates.

## ADMIN / role semantics

`docs/decisions-and-open-questions.md` records an approved decision: **"Admin
capability requires `users.role = ADMIN`."** The committed `profiles`
migration has **no `role` column**, so ADMIN is not representable in the
application schema as shipped. Account `maxfinder-test-05` is marked
`admin_intended: true` in the fixtures, but `accounts.test.ts` makes no claim
that it is an admin against the DB — real admin status must come from either
the spec `users.role` column (a future migration) or
`auth.users.app_metadata.role` (Supabase Auth). This executor did **not**
invent a `role` column or a new migration, per the open-questions rule.

## Credential policy

- No `password` field is stored in `accounts.json` or anywhere under
  `tests/sampleusers/`. The field is intentionally omitted (not a placeholder
  string), so there is nothing for an attacker to find in the repository.
- Real accounts are created by an **operator** only, against a linked Supabase
  dev project, using the Admin Auth API with `SUPABASE_SERVICE_ROLE_KEY`.
  That key is server-only and must live in `.env.local` (gitignored), never in
  the repo.

## accounts.json shape

A JSON array of exactly 5 accounts. Each object has:

- `id` — sample UUID (UUIDv4) of the auth identity / profile.
- `email` — a clearly-fake `@example.invalid` address (the `.invalid` TLD is
  reserved per RFC 2606 for non-routable test domains).
- `display_name` — profile display name.
- `auth_created_at` / `profile_created_at` — ISO-8601 sample timestamps.
- `profile` — sub-object mirroring the `profiles` columns (`id`,
  `display_name`, `created_at`).
- `admin_intended` — boolean; `true` for exactly one account (index 4) to
  exercise admin-only logic, with `admin_note` documenting the schema gap.

## Migrating the database ("Then migrate the database")

The repository already contains the authoritative migration:
`supabase/migrations/202610150001_initial_maxfinder.sql`
(`profiles`, `lost_pet_reports`, `spottings`, `conversations`, `messages`,
RLS policies, and the `handle_new_user()` trigger), plus
`202610150002_storage.sql` (the `lost-pet-images` and `spotting-images`
storage buckets and policies). **No new migration is added by this mission** —
the conservative path adds no schema and does not introduce `role`/`email`.

"Migrate the database" therefore means applying the **existing** migrations
and seeding the 5 sample profiles. This requires the Supabase CLI, a linked
project, and the service-role key — none of which are present in the build
container for this run (see "Why this run can't run the migration" below).
An operator runs:

```bash
# Local (needs Docker Desktop / daemon — not available in this container):
npm i
npm run supabase:dev     # if defined; otherwise:
supabase start
supabase db reset        # applies supabase/migrations against local Postgres

# Shared dev project (ref documented in README):
supabase link --project-ref vkdfgxvdbhmymjkrycif
supabase db push --linked --dry-run   # preview the plan, do not apply
supabase db push --linked             # apply migrations
supabase migration list --linked       # confirm applied version
```

### Seeding the 5 accounts (operator, out-of-repo)

Seeding writes to `auth.users` (and the trigger writes `profiles`) via the
Admin Auth API. It requires `SUPABASE_SERVICE_ROLE_KEY` and must NOT be
committed. A minimal operator script (kept in `.env.local`-driven, untracked
space) would call the Supabase JS admin client:

```ts
import { createClient } from "@supabase/supabase-js";
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY come from .env.local only.
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
for (const a of sampleAccounts) {
  await admin.auth.admin.createUser({
    email: a.email,
    password: "<out-of-repo, operator-supplied>",
    user_metadata: { display_name: a.display_name },
  });
  // The handle_new_user() trigger inserts the matching profiles row.
}
```

## Why this run can't run the migration

This build container has:

- no `supabase` CLI (`command -v supabase` → not found; `npx supabase` is not
  installed and not pinned in `package.json`),
- no `.env.local` and no `SUPABASE_SERVICE_ROLE_KEY` /
  `NEXT_PUBLIC_SUPABASE_URL` environment variables,
- only rootless podman `docker` with no reachable daemon (`supabase start`
  needs Docker Desktop / a daemon),
- no `node_modules` (must `npm ci` first to run any npm script).

So real account creation and applying the migration are credential- and
infrastructure-gated. The deliverable here is the in-repo fixture artifact plus
this operator guidance; executing the migration itself is deferred to an
operator with a linked project + service key.

## Verification

`tests/sampleusers/accounts.test.ts` is a dependency-free Jest test that:

- asserts exactly 5 accounts,
- asserts each account against the real `profiles`/`auth.users` field shape,
- asserts every `id` is a valid UUIDv4 and every `email` is a
  `@example.invalid` address (no real PII committed),
- **negatively** asserts no account carries a `password` field (security
  regression guard),
- asserts exactly one account is `admin_intended`.

Run it with: `npm test tests/sampleusers/accounts.test.ts` (after `npm ci`).
