# Decisions and open questions

This file exists so an agent can tell the difference between an approved decision and a genuine unresolved point.

If an open question matters to the current task, ask the team. Do not silently turn an assumption into product behavior.

## Approved decisions

### Product and scope

- Version 1 targets one neighborhood or community.
- The current implementation client is Web.
- Mobile is planned later.
- Administration is Web-only.
- Deterministic matching is the required matching approach for Version 1.
- AI-assisted matching is not required for the MVP.

### Architecture

- Layered modular monolith.
- Shared Application API / Server Interface.
- Application/domain components own business rules and authorization.
- Prisma-backed Persistence / Repository Layer.
- Supabase PostgreSQL stores application relational data.
- Supabase Auth owns credentials and sessions.
- Supabase Storage stores Pet Profile media.
- Device geolocation is optional and permission-controlled.
- RLS is defense in depth, not a replacement for application checks.

### Reports

- One `Lost Pet Report` object.
- `LOST`, `FOUND`, and `REMOVED` are statuses.
- Search considers `LOST` reports.
- No `is_active` field.
- `REMOVED` is not physical deletion.
- Reports reuse Pet Profile images.
- No `report_images` table.

### Communication

- Conversations are tied to one Lost Pet Report.
- A conversation has exactly two distinct user participants.
- Messages are private to those participants.
- `last_message_at` is derived from messages.
- Version 1 does not promise blocking, user-reporting, abuse-review, or message-limit features.

### Third-party organizations

- Shelters, rescues, and animal hospitals are stored as application-owned PostgreSQL records in Version 1.
- There is no required live shelter-data provider.
- Optional nearby lookup may use current location or manual location input.

### Administration and export

- Admin capability requires `users.role = ADMIN`.
- Admin report removal changes status to `REMOVED`.
- Account deletion is a separate workflow.
- Lost Pet Report CSV export is administrative-only.
- Export columns are limited to the documented Lost Pet Report table fields.

## Earlier planning language that is superseded

Older iteration/milestone language should not be implemented literally where the current Detailed Design refined it.

| Earlier shorthand/uncertainty | Current Version 1 decision |
| --- | --- |
| "lost/found reports" | One Lost Pet Report with `LOST`, `FOUND`, `REMOVED` lifecycle |
| public report search | authenticated search/filtering |
| possible live shelter provider | application-owned third-party organization table |
| separate report image concepts | reuse Pet Profile image |
| moderation/block/report promises | not part of current Version 1 |
| Prisma treated as optional in early scaffold notes | current architecture specifies a Prisma-backed repository |

## Open questions that must not be invented

### Fixed retention periods

Version 1 defines deletion relationships but does not define exact time-based retention durations.

Do not invent "delete after 30 days" or similar behavior.

### Exact location precision shown in the UI

The design requires least exposure and separation between last-known pet location and current device location, but it does not define an exact decimal/place precision for display.

Do not expose more precision than needed. Ask the team if the current task needs a fixed UI rule.

### Password composition policy

Supabase Auth owns credential storage and hashing. The current design does not specify a project-specific password composition rule beyond using the provider securely.

Do not invent special complexity rules unless the team approves them.

### Full visual design system

The repository handoff defines functional screens and flows, not complete visual tokens.

Use an approved prototype/Figma reference when provided. Do not create a new brand/design system as part of infrastructure work.

### Exact route naming

The interface contracts are approved. Exact Next.js route paths/server-action names are a lower-level implementation convention unless the team supplies a route map.

Keep them consistent and avoid exposing provider-specific concerns to the client.

## How to handle a new ambiguity

Ask:

1. Does it change persisted data?
2. Does it change authorization, privacy, or security?
3. Does it change a user-visible workflow or acceptance criterion?
4. Does it change a boundary in `architecture.md`?

If yes to any of these, stop and ask the team before making the decision.
