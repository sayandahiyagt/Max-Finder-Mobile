# Public map dots and demo data

This guide describes the public map's individual activity dots and the local
synthetic data used to explore the map. The map continues to read public,
viewport-bounded activity through the existing `/api/map` route. This display
change adds no tables, columns, or SQL migrations.

## What the map shows

Lost Pet Reports appear as red dots and Spottings as blue dots. Each record
remains an individual clickable marker at every zoom level. Dots shrink when
the map is zoomed out and grow as visitors zoom in. Leaflet's canvas renderer
keeps a few thousand points responsive.

## How dot sizing works

`MapPointLayer` renders one marker per map record and updates marker size as
the zoom changes. Individual dot radius tiers are 1.1 pixels at zoom 3 or lower,
1.5 through zoom 4, 2.2 through zoom 6, 2.8 through zoom 8, 3.5 through zoom
10, 4.25 through zoom 12, and 5 pixels when zoomed further in.

## Load the larger local demo dataset

The standard local reset loads the canonical fixture, local media, and map demo
data in order, including the 2,000-point regional cluster batch:

```powershell
npm.cmd run db:start
npm.cmd run db:reset
npm.cmd run db:configure
npm.cmd run dev
```

Open `http://localhost:3000`; the map starts zoomed out over the contiguous
United States so the broad red and blue patterns are visible immediately.
`db:reset` replaces local database contents and reapplies migrations, so use it
when you want a clean local setup. It does not affect a hosted Supabase project.
No migration is required for these map changes.

The regular reset creates 1,200 synthetic LOST reports and 800 synthetic
Spottings across U.S. cities and towns. It then adds 2,000 more cluster points
by default, split evenly between Lost Pet Reports and Spottings. Each report gets
its own synthetic Pet Profile because the data model requires that relationship.
The broad dataset is weighted toward larger metro areas, while smaller towns
provide lower-density coverage. In the busiest 16 metros, points are placed near
named neighborhoods and public park or landmark addresses.

The cluster batch spreads 70% of both red Lost Pet Reports and blue Spottings
across hubs in 14 southern states. It distributes the remaining points evenly
across nine western states and twelve northeastern states. The 2,000-point batch
contains exactly 1,000 records of each activity type. It draws from 250 distinct curated city and landmark anchors across 222 cities. State-balanced allocation
puts both activity types in every covered state (50 of each activity in each
Southern state at the default size). Half the Lost Pet Reports use red-only
curated inland city anchors across the regions. Half the Spottings use separate
blue-only anchors at least 10 miles away in the same state, and red reports
skip those locations. Each record gets a unique nearby coordinate and remains
an individual dot at every zoom. Red dots draw above nearby blue dots. The
dry-run summary prints activity totals by region and state, red/blue cluster
locations, and the distance between paired color clusters. Seed scripts read their local
database URL from ignored `.env.local` and reject non-local database URLs.
Lost reports get private Pet Profile photo references; Spotting
rows use public photos from the same eight-image catalog. The photos are openly
licensed and clearly marked as synthetic demo media in their credits file. No
new data-model fields or migrations are introduced.

The cluster seeder uses stable generated IDs and replaces only its own marked
demo rows when rerun. Canonical seed records and other map demo batches remain
intact. `npm.cmd run db:reset` invokes the local Supabase wrapper, which prints
and runs `node scripts/seed-map-cluster-demo-data.mjs --points 2000` as a reset
seed step. Confirm reset output includes both `Running node
scripts/seed-map-cluster-demo-data.mjs --points 2000` and `Requested 2000
cluster points`. `db:configure` does not reset or seed anything. Since
`db:reset` replaces all local database contents, use the cluster-only command
below to refresh just this batch in an already seeded database.

To rerun the default 2,000-point regional batch without resetting the database,
use the dedicated command. It also prepares the private pet photo objects:

```powershell
npm.cmd run db:seed:map:clusters
```

Use `--dry-run` to preview the amount and spacing without connecting to the
database:

```powershell
node scripts/seed-map-cluster-demo-data.mjs --points 800 --dry-run
```

The reset flow uploads the photo catalog and seeds base map data through the
local Supabase wrapper, then runs the regional cluster command and copies photos
into unique private Pet Profile objects. The cluster dry run reports exact red
and blue totals and state coverage before connecting to the database. Both database seeders use the loopback
PostgreSQL endpoint and leave canonical rows from `supabase/seed.sql` intact.
The broad map seed and cluster seed replace only their marked batches.
The broad base seed and cluster seed use fixed pseudo-random layouts; base-row
IDs are regenerated, and cluster-row timestamps are set relative to the run
time. The `db:seed:map:clusters` command also creates the private Storage
objects referenced by generated Pet Profile rows.

## Main implementation files

| File | Purpose |
| --- | --- |
| `src/components/map-point-layer.tsx` | Tracks zoom and renders each loaded map record as an individual marker. |
| `src/components/map-report-marker.tsx` | Chooses the type colour and zoom-based dot radius; retains the single-record popup and detail link. |
| `src/components/map-explorer.tsx` | Fetches map activity, enables Leaflet's canvas renderer, and retains search, radius, and filter behavior. |
| `src/components/map-explorer.module.css` | Styles the search-location marker; activity dots are Leaflet circle markers. |
| `scripts/local-supabase.mjs` | Runs local media and base map setup after the standard local database reset. |
| `scripts/seed-map-demo-data.mjs` | Creates synthetic reports and Spottings across weighted U.S. cities, with neighborhood anchors in the busiest metros. |
| `scripts/seed-map-cluster-demo-data.mjs` | Adds 100–3,000 local demo records with stable IDs across southern, western, and northeastern states. |
| `scripts/seed-map-demo-pet-images.mjs` | Copies catalog photos to unique private Storage objects referenced by generated Pet Profiles. |
| `scripts/map-demo-content.mjs` | Defines public neighborhood addresses and the pet-photo catalog used by the seeders. |
| `tests/map-report-marker.test.tsx` | Checks individual report and Spotting links, popups, and zoom-based dot sizing. |
| `tests/map-explorer.test.tsx` | Checks that map filters still reach the map API and Spotting details remain clickable. |

The old density overlay and the temporary numbered cluster UI and spatial
index have been removed. This display change does not alter data storage,
authentication, public API filters, or anonymous detail-data rules.

## Demo seed implementation

- `createRandom` supplies deterministic pseudo-random values for repeatable
  coordinate and attribute layouts.
- `pick` chooses values from a demo list, and `gaussian` places points around
  city centres and tighter neighborhood groups.
- `readLimitFromArgs` accepts positive `--reports` and `--spottings`
  overrides for direct local script use.
- `allocateWeightedCounts` uses largest-remainder rounding so per-location
  counts add up exactly to the requested totals.
- `buildDataset` creates Pet, Pet Image, report, and Spotting rows with valid
  references, recent timestamps, synthetic descriptions, photos, and
  coordinates near named U.S. public places.
- `clearDemoData` removes rows identified by the demo markers and preserves
  canonical synthetic seed data.
- `main` connects only to local Supabase PostgreSQL, reuses the auth-linked
  local owner profile, and bulk-inserts the generated records.
- The top-level error handler prints a concise failure and exits with a
  non-zero code if seeding fails.

The cluster seeder validates its requested total before connecting. It splits
the rows evenly between LOST reports and Spottings, creates one Pet Profile and
private image reference per report, uses species-matched photo assets and
allowed species and weight values, and tags generated rows. Stable IDs and
`skipDuplicates` let reruns add only newly requested rows without replacing
older reports or Spottings.

## Verification

The marker tests cover detail links and the country-to-neighborhood radius
change. Repository-wide checks are:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

Map display changes require no database migration. A new local reset is needed
only when you want the synthetic demo dataset in your local database.
