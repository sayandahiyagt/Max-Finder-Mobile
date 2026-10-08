# UI specification

## Status

The current Detailed Design Document does not define a complete visual design system. Earlier project work includes a mid-fidelity prototype, but the repository handoff should not cause an agent to invent a new brand, component library, color system, or navigation structure merely to fill that gap.

Use this file as the functional screen contract. If the team supplies a Figma/prototype link, that prototype becomes the visual reference for layout and interaction details.

## Client scope

Current implementation target:

- Next.js / React / TypeScript Web Application

Planned later:

- React Native / Expo Mobile Application

Do not implement a second mobile UI during the Web foundation task.

Administration is Web-only in Version 1.

## Required functional screen areas

### Authentication

Needs:

- registration
- sign-in
- sign-out action
- clear validation/error states
- protected-route behavior

Do not surface provider internals or secret configuration values.

### Pet Profiles

Needs:

- list of the authenticated user's pets
- create Pet Profile
- view Pet Profile
- edit owned Pet Profile
- delete flow with clear consequences
- Pet Profile image upload/replace

Private Pet Profile data must not be exposed as a public profile page.

### Lost Pet Reports

Needs:

- create from an existing owned Pet Profile
- edit owned report
- display `LOST`, `FOUND`, or `REMOVED` state appropriately
- mark found
- show only approved report/contact information to other authenticated users

Do not present FOUND as a different object type.

### Search and matching

Needs:

- filter controls appropriate to approved report fields
- location input with permission-based device option plus manual fallback
- results limited to `LOST` reports
- deterministic ranking output
- explanation of contributing match factors
- clear empty/no-result state

### Conversation

Needs:

- report context
- two-participant message history
- message composition and send
- private access failure state

Do not add user-block/report controls unless they are re-approved.

### Help / FAQ

Needs:

- readable static guidance
- simple navigation within FAQ content

A database-backed FAQ editor is not part of Version 1.

### Organization directory

Needs:

- shelter/rescue/animal-hospital entries
- contact information
- optional nearby lookup
- manual location fallback

The UI should not imply that the directory is live-synced from an external provider.

### Administration

Needs:

- Web-only access
- explicit ADMIN authorization
- account-deletion workflow initiation
- administrative report change to `REMOVED`
- controlled CSV export request
- clear confirmation for destructive/privileged actions

## UI state requirements

Every network-backed screen should account for:

- loading
- success
- empty result where applicable
- invalid input
- authentication failure
- authorization failure
- provider/storage/location failure where applicable

Do not reveal protected data in error messages.

## Accessibility and responsive behavior

Use semantic HTML, labeled form controls, keyboard-accessible interactions, and meaningful status/error text.

The Web application should be responsive enough to support the project's accessibility goal and later mobile reuse, but do not redesign the domain model around screen size.
