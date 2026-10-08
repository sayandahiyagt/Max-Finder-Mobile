# Data model specification

## Source of truth

The Version 1 relational model is the schema represented by the current Detailed Design Document ERD. The table and field names below are implementation requirements for the first schema unless the team updates the design.

Supabase Auth owns credentials. The application database stores an application user/profile record and its link to the Supabase identity. No application table stores a password or password hash.

## `users`

Application-owned account/profile data.

| Field | Type | Rules |
| --- | --- | --- |
| `user_id` | UUID | Primary key |
| `auth_provider_id` | UUID | Unique; links the application profile to the Supabase Auth identity |
| `email` | VARCHAR(255) | Unique |
| `display_name` | VARCHAR(100) | Required |
| `role` | VARCHAR(20) | Controlled value: `USER` or `ADMIN` |
| `created_at` | TIMESTAMPTZ | Required |
| `updated_at` | TIMESTAMPTZ | Required |

Important rules:

- A normal client must never be able to choose `ADMIN` during registration.
- Credential material stays in Supabase Auth.
- `auth_provider_id` and `email` are unique.

## `pets`

Private registered Pet Profiles.

| Field | Type | Rules |
| --- | --- | --- |
| `pet_id` | UUID | Primary key |
| `owner_id` | UUID | Foreign key to `users.user_id` |
| `name` | VARCHAR(100) | Required |
| `species` | VARCHAR(50) | Required |
| `breed` | VARCHAR(100) | Nullable |
| `color` | VARCHAR(50) | Required |
| `size` | VARCHAR(50) | Required |
| `description` | TEXT | Nullable |
| `date_of_birth` | DATE | Nullable |
| `created_at` | TIMESTAMPTZ | Required |
| `updated_at` | TIMESTAMPTZ | Required |

A user owns zero or more pets. Pet Profile access is owner-restricted except for the subset of pet information intentionally exposed through an active Lost Pet Report.

## `pet_images`

Stores the Supabase Storage reference for the current Pet Profile image.

| Field | Type | Rules |
| --- | --- | --- |
| `image_id` | UUID | Primary key |
| `pet_id` | UUID | Foreign key to `pets.pet_id`; unique |
| `storage_path` | TEXT | Unique |
| `caption` | VARCHAR(255) | Nullable |
| `created_at` | TIMESTAMPTZ | Required |

`pet_id` is unique, so a pet has at most one current profile image in Version 1.

Lost Pet Reports reuse this image through their pet relationship. There is no `report_images` table.

## `lost_pet_reports`

The only report object for a missing pet.

| Field | Type | Rules |
| --- | --- | --- |
| `report_id` | UUID | Primary key |
| `pet_id` | UUID | Foreign key to `pets.pet_id` |
| `status` | VARCHAR(20) | Controlled value: `LOST`, `FOUND`, or `REMOVED` |
| `last_seen_at` | TIMESTAMPTZ | Required |
| `last_seen_lat` | DECIMAL(9,6) | Required |
| `last_seen_lng` | DECIMAL(9,6) | Required |
| `last_seen_address` | VARCHAR(255) | Required |
| `description` | TEXT | Nullable |
| `contact_method` | VARCHAR(20) | Controlled report-level contact choice |
| `contact_value` | VARCHAR(255) | Nullable for `IN_APP`; required for `EMAIL` or `PHONE` |
| `contact_instructions` | TEXT | Nullable |
| `created_at` | TIMESTAMPTZ | Required |
| `updated_at` | TIMESTAMPTZ | Required |

Rules:

- `status` is the authoritative lifecycle state.
- Do not add `is_active`.
- Search/filtering returns reports with `status = LOST`.
- `FOUND` means the pet was found. It is not a separate report.
- `REMOVED` is a lifecycle state. It is not the same operation as physical row deletion.
- Normal user create/change operations require ownership of the associated pet.
- Report contact data is report-level data; account contact data does not automatically become report-visible.

## `conversations`

A private conversation scoped to one Lost Pet Report.

| Field | Type | Rules |
| --- | --- | --- |
| `conversation_id` | UUID | Primary key |
| `report_id` | UUID | Foreign key to `lost_pet_reports.report_id` |
| `user_1_id` | UUID | Foreign key to `users.user_id` |
| `user_2_id` | UUID | Foreign key to `users.user_id` |
| `created_at` | TIMESTAMPTZ | Required |
| `updated_at` | TIMESTAMPTZ | Required |

Rules:

- The two participant IDs must be different.
- Canonicalize the participant pair and make it unique per report so the same pair does not create duplicate conversations for one report.
- Do not add `last_message_at`; derive latest activity from `messages`.

## `messages`

Messages inside a Conversation.

| Field | Type | Rules |
| --- | --- | --- |
| `message_id` | UUID | Primary key |
| `conversation_id` | UUID | Foreign key to `conversations.conversation_id` |
| `sender_id` | UUID | Foreign key to `users.user_id` |
| `content` | TEXT | Required |
| `created_at` | TIMESTAMPTZ | Required |
| `updated_at` | TIMESTAMPTZ | Required |

A sender must be one of the two participants in the referenced conversation. Enforce this in application/domain authorization and, where practical, database policy.

## `third_party_organizations`

Application-owned directory data for shelters, rescues, and animal hospitals.

| Field | Type | Rules |
| --- | --- | --- |
| `organization_id` | UUID | Primary key |
| `name` | VARCHAR(150) | Required |
| `organization_type` | VARCHAR(30) | Controlled value: `SHELTER`, `RESCUE`, or `ANIMAL_HOSPITAL` |
| `phone` | VARCHAR(50) | Nullable |
| `email` | VARCHAR(255) | Nullable |
| `website` | VARCHAR(255) | Nullable |
| `address` | VARCHAR(255) | Required |
| `latitude` | DECIMAL(9,6) | Nullable |
| `longitude` | DECIMAL(9,6) | Nullable |
| `description` | TEXT | Nullable |
| `created_at` | TIMESTAMPTZ | Required |
| `updated_at` | TIMESTAMPTZ | Required |

Version 1 does not depend on a live external shelter provider. These are independent application records.

## Relationship summary

```text
users 1 ------ * pets
pets 1 ------- 0..1 pet_images
pets 1 ------- * lost_pet_reports
lost_pet_reports 1 --- * conversations
conversations 1 ------- * messages

users 1 ------- * conversations as user_1
users 1 ------- * conversations as user_2
users 1 ------- * messages as sender

third_party_organizations are independent directory records
```

## Delete behavior

Approved referential behavior:

- `users -> pets`: cascade as part of physical account deletion
- `users -> conversations`: cascade as part of physical account deletion
- `pets -> pet_images`: cascade
- `pets -> lost_pet_reports`: restrict while report rows still reference the pet
- `lost_pet_reports -> conversations`: cascade
- `conversations -> messages`: cascade
- `third_party_organizations`: independent

A normal "mark report removed" action changes report status to `REMOVED`; it does not physically delete the row.

Physical deletion must respect these relationships and the retention rules in `security.md`.

## Authorization model

The database schema does not replace domain authorization.

Primary checks occur in the application/domain component that owns the resource. Supabase RLS is defense in depth. Tests must prove that a different authenticated user cannot modify another user's private Pet Profile, report, or conversation.
