# Security and privacy specification

## Authentication

Supabase Auth is the credential and session authority.

Max Finder application tables must not store plaintext passwords or application-managed password hashes. The application should treat the provider identity as trusted only after Supabase Auth has validated the session.

Authentication is required before protected application behavior such as Pet Profile management, Lost Pet Report management, full report search, messaging, and administration. Preserve the existing public map browsing and its activity/species/breed/time/radius filters, Lost Pet Report detail, and Spotting detail flows. Anonymous responses may contain only approved recovery information and must omit contact choices and private account data.

## Authorization

The domain component that owns a resource performs the primary ownership or role check.

Examples:

- Pet Management verifies Pet Profile ownership.
- Lost Pet Report Management verifies ownership of the associated pet for normal create/change operations.
- Communication verifies that the caller is one of the two conversation participants.
- Administration verifies `users.role = ADMIN`.

Supabase RLS can provide a second database-level safeguard when the database role and request identity used by the query cause the policies to run as intended. A direct Prisma connection does not automatically inherit the caller's Supabase JWT; owner and `BYPASSRLS` roles can bypass policies. The application must enforce authorization regardless, and the chosen Prisma role/RLS contract must be verified before hosted use. RLS does not replace application/domain authorization.

Client-side visibility is never sufficient authorization.

## Credentials and environment secrets

Browser code may use only values intentionally safe for the browser, such as the public Supabase project URL and anon key when required by the chosen SSR/session setup.

Server-only secrets include:

- `SUPABASE_SERVICE_ROLE_KEY`
- database connection credentials used by Prisma
- any future privileged provider credential

Do not commit `.env.local` or real secret values.

Use the service-role key only for narrowly justified server-side operations. Do not use it as a shortcut that bypasses ordinary ownership and authorization rules.

## Personally identifiable and sensitive data

Treat these as sensitive:

- private account/profile data
- report-level email or phone values
- precise last-seen pet coordinates
- current device/search location
- Pet Profile photos
- private conversations and messages
- generated administrative CSV exports

A Lost Pet Report may expose only the fields approved for the recovery workflow.

Account email or other private profile information does not automatically become visible merely because a user created a Lost Pet Report.

## Location privacy

There are two different location concepts.

**Persisted last-known pet location**

Belongs to a Lost Pet Report and is used for recovery/search.

**Current device or search location**

Temporary input used by location-dependent search or organization lookup. It requires permission when obtained from the platform.

Do not treat the current device location as the pet's last-known location.

If device location is denied or unavailable, the user must be able to enter a location manually.

Public recovery map and report-detail pins preserve the exact stored coordinates for Lost Pet Reports and Spottings. Do not add rounding to those pins during refactoring. Keep coordinates limited to the existing recovery map/detail projections; do not add them to unrelated public responses.

## Pet image handling

Supported Version 1 image formats are JPEG, PNG, and WebP.

Before storage:

- validate the declared type and actual upload metadata as practical;
- apply reasonable file-size limits;
- treat uploaded content as untrusted data;
- never execute uploaded content.

Supabase Storage access control must prevent unauthorized modification or retrieval of protected media.

Lost Pet Reports reuse the Pet Profile image and do not create separate report-specific storage state.

Pet Profile images use private storage and signed display access. Spotting images are publicly readable to support the existing anonymous Spotting detail and map flows. Keep Spotting uploads separate from private Pet Profile media and do not associate them with contributor account or contact data.

## Conversation privacy

A Conversation is private to its two authenticated participants and is tied to one Lost Pet Report.

The fact that a report can be searched does not make the associated conversation public.

A sender must be a participant in the conversation.

## Input and output safety

Validate user-provided descriptions, names, contact values, coordinates, dates, messages, URLs, and uploaded files at trust boundaries.

Database access goes through the repository/Prisma boundary. Do not construct unsafe SQL by concatenating user input.

Render user-provided text as data rather than executable markup/script.

## Network security

Client/backend traffic uses HTTPS/TLS.

Connections to managed Supabase services use encrypted transport.

Do not knowingly send credentials, reports, locations, messages, or media metadata over unencrypted channels.

## Administrative security

Only authenticated `ADMIN` users can initiate:

- account-deletion workflows
- administrative report changes to `REMOVED`
- Lost Pet Report CSV export

Administrative UI is web-only in Version 1.

Admin actions still use normal domain boundaries.

## CSV export security

The export is available only after authenticated ADMIN authorization.

It contains only the allowed Lost Pet Report columns listed in `interfaces.md`.

Because it may contain precise location and approved contact values, treat it as sensitive administrative data. Do not leave generated export files in public/static directories.

## Retention and deletion

Version 1 does not define a fixed retention duration.

`REMOVED` is a report lifecycle state and is not physical deletion.

Physical deletion must respect the referential rules in `data-model.md`. Sensitive generated exports should be removed when no longer needed.

Do not invent fixed retention periods without team approval.

## Minimum security test set

For every protected operation, include negative tests appropriate to the resource:

- unauthenticated caller
- authenticated caller who is not the owner/participant
- non-admin caller for administrative behavior
- malformed input
- missing resource
- controlled-value violations

Security tests should prove that data is not returned or changed, not merely that a button is hidden.
