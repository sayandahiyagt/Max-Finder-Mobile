# Max Finder Mobile data model

This is the logical model derived from the approved iteration plan. Exact SQL types,
indexes, and Prisma usage are implementation details to be reviewed with the first
database migration.

## Entities

### User/profile

Supabase Auth owns credentials and identity. An application profile may store display
information, role (`user` or `admin`), and moderation/account status. Passwords are
never stored in application tables.

### Pet

A pet belongs to exactly one user. It stores the pet's name, species, breed, color, size,
estimated weight where collected, photo reference, and timestamps. A pet may be private
or have an active lost report. Only its owner can view, edit, or delete the registration.

### Lost pet report

A report belongs to one pet and is created/updated only by that pet's owner. It stores
status (`active`, `found`, or removed), last known location, last-seen date/time,
approved contact method, and timestamps. Public search includes only active reports and
does not expose private account data.

### Conversation and message

A conversation connects a finder and the owner through one active lost report. Messages
store sender, conversation, text content, sent time, and moderation/report state. Only
the two participants can read or send messages. Deleted/unavailable reports cannot
start new conversations.

### Shelter

A shelter record stores approved public name, address, phone, website/contact method, and
location data used for proximity ordering. The source and freshness policy for shelter
data must be approved before the external integration is selected.

### FAQ

Approved question/answer content is public and available without authentication. It may
be static content or a database-backed record; the first implementation should not
introduce an admin content editor unless that is approved.

## Relationships and constraints

- `profile.id` maps to `auth.users.id`.
- One profile has many pets; one pet has zero or one active lost report.
- One lost report can have many conversations; one conversation has many messages.
- Foreign-key deletes must follow the approved account/post deletion policy and remove
  public views and dependent private data consistently.
- Ownership and participant checks must be enforced in RLS/server code, not only in UI.
- Add indexes for active report status, search/filter fields, and conversation
  participant lookups after query shapes are finalized.

## Privacy and retention decisions

The team must approve exact location precision, message retention, photo retention after
deletion, and account-deletion behavior before production. Until then, use the minimum
data needed, avoid exposing precise owner location, and make deletion behavior explicit
in migrations/tests.
