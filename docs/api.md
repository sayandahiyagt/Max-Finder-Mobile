# Max Finder Mobile interfaces

The initial API is implemented through Next.js route handlers or server actions. Names
below describe required behavior, not a commitment to a specific URL shape.

## Authentication

- Sign up with email/password and immediately establish a session.
- Sign in and sign out.
- Reject duplicate email, invalid email, and passwords that fail the approved policy.
- Preserve the authenticated session across protected routes.
- Return clear, non-sensitive errors; never return password material.

Supabase Auth owns password hashing and session tokens. The application must not hash or
persist a second copy of the password.

## Pet registration

Authenticated users can create, list, update, and delete only their own pets. Required
pet fields and photo upload behavior must be validated. Deletion requires confirmation
in the UI and removes the record only after an authorized server request.

## Lost-pet reports

Authenticated owners can create an active report for their registered pet, update
last-seen location/time and approved contact method, and mark the pet found. Invalid pet
IDs, missing fields, non-owners, duplicate active reports, and unauthenticated requests
must receive appropriate error responses.

## Search and matching

Public or authenticated search returns active lost reports only. It supports filters and
ranked potential matches using available species, breed, color, size, location, and time
signals. Incomplete data must not fail the search. Results explain contributing factors
and match percentage when a recommendation is shown. No-results responses use a clear
empty state such as “No Matches Detected.”

## Messaging

A finder can start a conversation from an active report. The owner can reply, both
participants can reopen history, and unread state can be surfaced. Only participants can
read/send. New messages are rejected after the report is unavailable. Report/block
actions must be supported before messaging is considered complete.

## Help and shelters

FAQ content is readable without authentication, expandable, and searchable. Shelter
search requests location permission first, supports manual location entry when denied,
orders results by proximity, and returns a useful empty state. The provider must be
approved before credentials or integration code is added.

## Administration

Admin-only operations can remove user accounts and posts/reports. Account removal must
remove the user's posts and profile attributes according to the approved retention
policy. Post removal must remove it from all public-facing views. Every admin endpoint
must reject unauthenticated and non-admin callers.

## Error and validation contract

All interfaces should return a predictable success/error shape, validate at the boundary,
use appropriate HTTP status codes, and avoid leaking whether protected records belong to
another user. Tests must cover success, invalid input, authentication, authorization,
not-found, and unavailable-resource cases.
