# Architecture specification

## Purpose and scope

Max Finder Mobile is a lost-pet recovery application for a first release limited to one neighborhood or community. Authenticated users register pets, create Lost Pet Reports, search active reports, review deterministic matches, communicate with other users, and view contact information for third-party pet organizations.

The architecture favors clear ownership, maintainability, privacy, and reliable persistence over distributed-system complexity.

## Architectural pattern

The application is a **layered modular monolith**.

Supabase provides managed infrastructure, but "serverless" or "Supabase-backed" is not the architectural pattern. The application still has explicit presentation, domain, persistence/integration, and infrastructure boundaries.

### Presentation layer

**Web Application, current**

- Next.js
- React
- TypeScript
- Current user-facing client
- Does not own business rules, authorization, database access, or provider-specific behavior
- Uses the shared Application API / Server Interface for backend work

**Mobile Application, planned**

- React Native
- TypeScript
- Expo
- Reuses the same backend and domain rules
- Does not introduce a second business-logic implementation
- A mobile admin interface is not part of Version 1

### Application / Domain layer

**Application API / Server Interface**

Single backend entry point for the current Web client and planned Mobile client. It receives HTTPS/TLS requests, carries authenticated context into the backend, performs boundary validation, and routes work to the appropriate domain component.

**Identity & Account Management**

Owns the Max Finder application profile, the `USER` or `ADMIN` role, and the link to the Supabase Auth identity.

**Pet Management**

Owns private Pet Profiles, ownership checks, Pet Profile lifecycle, and Pet Profile media coordination.

**Lost Pet Report Management**

Owns creation, editing, visibility, contact choices, last-known pet information, and lifecycle state for Lost Pet Reports.

`FOUND` and `REMOVED` are states of the same Lost Pet Report. They are not separate report types.

**Search & Filtering**

Lets authenticated users browse/filter reports with `status = LOST`. Reads only approved report data. May use temporary current/search location through the location integration. Sends candidate reports to the matching engine.

**Deterministic Matching Engine**

Stateless rule-based ranking using available factors such as species, breed, color, size, location, and time. It returns ranked candidates and the factors that contributed to the result. It does not access PostgreSQL or external services directly.

**Communication**

Owns Conversations and Messages associated with one Lost Pet Report. Only authenticated conversation participants may access the conversation.

**Help / FAQ**

Static guidance and frequently asked questions. It does not own third-party organization records.

**Third-Party Organization Directory**

Owns application behavior for shelters, rescues, and animal hospitals. Version 1 reads application-owned directory records from PostgreSQL. Nearby lookup may use optional device location, with manual location as a fallback.

**Administration**

Web-only privileged capability. Confirms the caller has the `ADMIN` role, then coordinates account-deletion workflows, administrative changes that mark a Lost Pet Report `REMOVED`, and the controlled Lost Pet Report CSV export. It does not bypass the domain components that own the affected data.

### Data & Integration layer

**Persistence / Repository Layer**

Prisma-backed boundary used by domain components for application-owned relational data. Domain code should not scatter direct Prisma/PostgreSQL access throughout the application.

**Authentication Integration**

Isolates Supabase Auth session and identity operations.

**Media Storage Integration**

Isolates Supabase Storage behavior for Pet Profile images.

**Device Location Integration**

Wraps browser/mobile current-location capability. Location access is optional, requires permission, and has a manual-input fallback.

### External infrastructure

- Supabase Auth: credentials and authenticated sessions
- Supabase PostgreSQL: application-owned relational data and RLS defense in depth
- Supabase Storage: Pet Profile media
- Platform Geolocation API: optional current device coordinates

## Dependency rules

The important dependency direction is:

```text
Web / planned Mobile
        |
        v
Application API / Server Interface
        |
        v
Application / Domain components
        |
        +--> Persistence / Repository --> Supabase PostgreSQL
        +--> Authentication Integration --> Supabase Auth
        +--> Media Storage Integration --> Supabase Storage
        +--> Device Location Integration --> Platform Geolocation API
```

Specific domain dependencies:

- Pet Management depends on Identity & Account Management, Persistence / Repository, and Media Storage Integration.
- Lost Pet Report Management depends on Identity & Account Management, Pet Management, and Persistence / Repository.
- Search & Filtering depends on Persistence / Repository, the Deterministic Matching Engine, and optionally Device Location Integration.
- Communication depends on Identity & Account Management, Lost Pet Report Management, and Persistence / Repository.
- Third-Party Organization Directory depends on Persistence / Repository and optionally Device Location Integration.
- Administration depends on Identity & Account Management and Lost Pet Report Management.

## Required boundaries

Implementation must preserve these rules:

- Presentation code does not directly manipulate application tables.
- Presentation code does not become the source of authorization truth.
- Business rules live in domain modules, not duplicated across screens.
- The matching engine stays stateless and receives candidate data from Search & Filtering.
- Current device/search location is not written into a Lost Pet Report as the pet's last-known location unless the user is explicitly supplying it for that report.
- Admin operations follow domain ownership rules instead of creating a privileged direct-database shortcut.
- Provider-specific code stays behind integration components.

## Version 1 non-goals

Do not introduce these as required architecture:

- microservices
- a separate found-pet report type
- direct client CRUD against PostgreSQL
- a live external shelter-data provider
- AI-assisted matching as a dependency
- report-specific image storage
- mobile administration
- blocking/reporting/abuse-review subsystems unless later approved
