# Max Finder Mobile user flows

## Account

1. A visitor opens sign up or sign in.
2. Sign up validates email and the approved password policy.
3. Successful sign up signs the user in and preserves the session between pages.
4. Sign out ends the session and returns the user to sign in.
5. Protected features redirect or show an authentication prompt when unauthenticated.

## Register and report a pet

1. An authenticated owner adds a pet with identifying information and an optional photo.
2. The owner can edit or delete the registration after confirmation.
3. The owner marks a registered pet lost and confirms last-seen time/location and an
   approved contact method.
4. The report is visibly active and searchable.
5. The owner marks the pet found; the report leaves active public results.

## Find and contact

1. A user browses active lost reports and applies filters.
2. The matching view ranks likely matches and explains relevant factors.
3. A user opens a report, reviews the available identifying details/contact method, and
   starts a conversation.
4. Both participants see timestamped messages and unread state.
5. Participants can report or block unwanted conversation activity.

## Help and shelters

1. Any visitor opens Help/FAQ, expands questions, and searches FAQ text.
2. A user grants location permission or enters a location manually.
3. The app lists approved shelters by proximity with contact details.
4. Permission denial, unavailable data, and no matches produce clear alternatives/empty
   states.

## Administration

1. An authorized admin opens the moderation interface.
2. The admin removes a user or post/report after reviewing the action.
3. The removed account/report disappears from all public views and dependent data follows
   the approved retention policy.
4. Non-admin callers receive an authorization failure and see no moderation data.
