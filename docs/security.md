# Max Finder Mobile security and privacy

## Identity and access

- Supabase Auth is the only password and session authority.
- Protected pages may redirect unauthenticated users, but server/database authorization
  is mandatory even when a page is hidden.
- Pet ownership, report ownership, conversation participation, and admin role checks
  must be enforced by RLS and/or server-side checks.
- Admin role assignment is an operationally controlled action, not a client-provided
  field.

## Credentials and secrets

Only public Supabase URL/anon values may be used by browser code. Service-role and
external-provider keys are server-only Vercel variables. `.env.local` is ignored and
`.env.example` contains names only. Rotate any credential that is accidentally exposed.

## Sensitive data

Pet photos, exact last-seen locations, contact details, and messages are sensitive.
Public reports expose only the approved contact method and data needed to identify a
lost pet. Do not expose account email, private pets, precise owner location, or unrelated
messages.

Location permission must be optional. When denied, the app must continue with manual
location entry and must not store current device location unless the workflow requires
it and the user understands it.

## Input and abuse controls

Validate and normalize email, password, pet fields, coordinates, dates, message text,
URLs, and uploaded files at trust boundaries. Limit upload type/size and use safe image
handling. Do not interpolate user input into SQL or HTML. Add rate limiting/abuse
controls for authentication, messaging, and public search before production.

Users must be able to report or block inappropriate conversations. Admin deletion must
be auditable. Account/post deletion must remove public access immediately and follow the
approved retention policy.

## Verification requirements

Security-sensitive tests must prove that an unauthenticated user, a different user, and
a non-admin cannot perform each protected operation. CI must run linting, type checking,
tests, and a production build. Never use real client data in fixtures or screenshots.
