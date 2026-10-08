# Application interfaces specification

## Boundary

The current Web client and planned Mobile client use the shared **Application API / Server Interface** for backend operations.

The browser must not directly manipulate Max Finder application tables. Provider-specific behavior stays behind the appropriate integration component.

The contracts below describe required behavior. They do not require a particular URL naming scheme. Route names and whether a specific operation is implemented as a Next.js route handler or server action may follow repository conventions as long as the boundary and behavior stay the same.

## Transport

Client/backend requests use HTTPS/TLS.

Structured request and response data uses JSON unless the operation is explicitly binary media or the administrative CSV export.

Internal calls from the Application API / Server Interface to domain components are in-process calls inside the modular monolith. They are not separate network services.

## Authentication and session operations

Flow:

```text
Web / planned Mobile
    -> Application API / Server Interface
    -> Identity & Account Management
    -> Authentication Integration
    -> Supabase Auth
```

Required behavior:

- register an account through Supabase Auth
- sign in
- sign out
- preserve authenticated session state
- make authenticated identity available to backend domain code
- reject invalid credentials without exposing sensitive provider details
- never create or return an application-managed password hash
- never allow a normal registration request to select the `ADMIN` role

Application profile creation/update belongs to Identity & Account Management and the repository layer.

## Pet Profile operations

Authentication is required.

Supported behavior:

- create a Pet Profile owned by the authenticated user
- list/view the authenticated user's Pet Profiles
- update an owned Pet Profile
- delete an owned Pet Profile only when referential constraints allow it
- upload/replace the current Pet Profile image through Media Storage Integration

Ownership must be verified in the backend. Hiding an edit button is not authorization.

## Lost Pet Report operations

Authentication is required.

Supported behavior:

- create a Lost Pet Report for a Pet Profile owned by the caller
- view approved report data
- edit an owned report
- change report status among allowed lifecycle transitions
- mark the report `FOUND`
- administrative path may mark a report `REMOVED`
- store/update last-seen time, last-seen location, description, and report-level contact choices

A report always references an existing registered pet.

Do not create a separate found-pet object or separate report image.

## Search and filtering

Authentication is required.

Input may include:

- species
- breed
- color
- size
- time-related criteria
- location criteria
- optional current device/search location
- manually entered location when device permission is denied or not used

Behavior:

1. read only approved Lost Pet Report data with `status = LOST`;
2. apply filtering;
3. pass candidate reports to the Deterministic Matching Engine when ranking is requested;
4. return ranked results and the factors that contributed to the ranking.

The matching engine is stateless and does not access the database itself.

Current device/search location is temporary input. Do not overwrite a report's persisted last-known pet location with it.

## Conversation and message operations

Authentication is required.

Supported behavior:

- create or retrieve a conversation tied to one Lost Pet Report
- read conversation history if the caller is one of the two participants
- send a message if the caller is one of the participants

Conversation history is private. A report being discoverable does not make its conversations discoverable.

Version 1 does not require blocking, user-reporting, abuse-review, or message-limit behavior unless a later specification adds it.

## Third-party organization directory

The directory uses records stored in `third_party_organizations`.

Supported behavior:

- return shelter, rescue, and animal-hospital contact information
- filter/order using stored location data when appropriate
- optionally use current device location after permission
- accept manually entered location when device location is unavailable or denied

Do not add an external shelter API as a Version 1 runtime dependency.

## Help / FAQ

Help / FAQ is static guidance in Version 1. It does not require a database table or external provider.

Do not introduce an FAQ content-management subsystem unless the team approves one later.

## Administration

Administration is available through the Web application only in Version 1.

Every administrative request requires an authenticated application user whose `users.role` is `ADMIN`.

Supported behavior:

- initiate the approved account-deletion workflow
- mark a Lost Pet Report `REMOVED` for administrative reasons
- request the controlled Lost Pet Report CSV export

Administrative operations still pass through the domain component that owns the affected resource. They do not get a direct-database bypass.

## CSV export contract

The Version 1 administrative Lost Pet Report CSV export contains only these `lost_pet_reports` columns:

- `report_id`
- `pet_id`
- `status`
- `last_seen_at`
- `last_seen_lat`
- `last_seen_lng`
- `last_seen_address`
- `description`
- `contact_method`
- `contact_value`
- `contact_instructions`
- `created_at`
- `updated_at`

Do not add account credentials, `auth_provider_id`, user profile fields, Pet Profile fields, conversations, or messages.

The resulting file is sensitive administrative data because it can contain precise last-seen location and report-level contact values.

## Validation and errors

Validate input at the Application API / Server Interface before domain logic accepts it.

Reject:

- missing required fields
- invalid controlled values
- malformed coordinates or dates
- unsupported image type/size
- unauthenticated protected requests
- wrong-owner operations
- non-admin administrative operations
- conversation access by nonparticipants

Do not reveal sensitive protected-record details merely to explain an authorization failure.
