# User-flow specification

These flows describe functional behavior, not final visual styling.

## 1. Account and session

1. A visitor opens the Web application.
2. The user registers or signs in through the application backend.
3. Supabase Auth validates credentials and establishes the authenticated identity.
4. Max Finder associates that identity with the application `users` profile.
5. Authenticated state is available across protected navigation.
6. Signing out ends the session.
7. A protected feature requested without authentication returns the user to the authentication flow or presents an equivalent access prompt.

## 2. Register a pet

1. An authenticated owner creates a Pet Profile.
2. The owner enters the approved identifying fields.
3. The owner may add the current Pet Profile image.
4. The backend verifies identity and writes the profile through Pet Management and the repository layer.
5. Only the owner may edit or delete the private Pet Profile.
6. A pet cannot be physically deleted while a Lost Pet Report row still references it.

## 3. Report a pet lost

1. The owner selects an existing registered pet.
2. The owner creates a Lost Pet Report.
3. The owner chooses the last-seen location on the map or explicitly requests device location; no default coordinates are submitted without that choice.
4. The report records the pet's last-seen time and location, description, and report-level contact choice.
5. The report begins in `LOST` status.
6. Search can now include the approved report fields for authenticated users.
7. The report reuses the Pet Profile image.

There is no separate "found report" object.

## 4. Search and review likely matches

An unauthenticated visitor may browse and filter bounded report and Spotting pins by activity, species, breed, time, and radius, then open their detail pages. Anonymous report details omit contact choices and private account data. Full report search remains authenticated.

1. An authenticated user opens search.
2. The user applies available filters.
3. If location-based search is used, the user can grant device location permission or enter a location manually.
4. Search retrieves only approved reports with `status = LOST`.
5. Candidate reports may be ranked by the Deterministic Matching Engine.
6. The UI shows the candidate report information and the factors that contributed to ranking.
7. A no-result state is clear and does not expose private account data.

### Submit an anonymous Spotting

1. A visitor selects a species and image.
2. The visitor confirms the date and time, which initially use the current time.
3. The visitor chooses a location on the map or explicitly requests device location. No default coordinates are submitted without that choice.
4. The visitor may add breed, estimated weight, description, and distinguishing characteristics.
5. The backend validates the location and publishes the Spotting without account or contact information.

## 5. Contact the owner

A report supports its approved report-level contact method.

If the user uses in-app communication:

1. the backend creates or retrieves a Conversation tied to that Lost Pet Report and the two participants;
2. only those participants can open its history;
3. either participant may send a message;
4. messages remain private even though the report itself is searchable.

Version 1 does not add blocking/reporting/moderation flows unless a later approved specification restores them.

## 6. Mark a pet found

1. The authenticated owner opens the Lost Pet Report.
2. The backend verifies ownership through the associated Pet Profile.
3. The report status changes from `LOST` to `FOUND`.
4. It no longer appears in LOST search results.
5. The report remains the same persisted report object.

## 7. Help / FAQ

1. The user opens Help / FAQ.
2. The application displays static guidance and frequently asked questions.
3. No dedicated FAQ database or content-management subsystem is required in Version 1.

## 8. Third-party organization lookup

1. The user opens the organization directory.
2. The app reads stored shelter, rescue, and animal-hospital records.
3. For nearby ordering/filtering, the user may grant current-location permission or enter a location manually.
4. The UI displays approved directory contact information.
5. Failure to obtain device location does not block manual lookup.

The Version 1 flow does not depend on a live shelter-data provider.

## 9. Administration

1. An authenticated Web user enters the administrative area.
2. Identity & Account Management verifies `ADMIN`.
3. The admin may initiate an account-deletion workflow, mark a Lost Pet Report `REMOVED`, or request the controlled Lost Pet Report CSV export.
4. Report state changes still go through Lost Pet Report Management.
5. Non-admin callers receive no privileged data or capability.
