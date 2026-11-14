// Seed a large, realistic-looking demo dataset for the public map.
//
// The map used to ship with a dozen hand-placed pins, which made the old
// "density overlay" necessary. This script replaces that with a few thousand
// points spread over US cities and towns, with realistic density differences
// (busy Southeast and Northeast metros, sparse Mountain West). Individually
// drawn dots overlap naturally in busy areas and remain separate points.
//
// Safety: this script writes to the LOCAL Supabase database only (the same
// loopback URL used by the other db:* scripts) and it clears its own previous
// output before inserting, so it is safe to run repeatedly. It never touches a
// hosted project.
//
// This local-only helper is invoked by `db:reset` after the canonical seed and
// local image setup, so the regular reset command prepares the complete map demo.

import { randomUUID } from "node:crypto";

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { getLocalDatabaseUrl } from "./helpers/local-database-url.mjs";
import {
  DEMO_NEIGHBORHOODS_BY_CITY,
  chooseDemoPhoto,
  formatDemoNeighborhoodLabel,
  getDemoCatalogPath,
  getDemoPetImagePath,
} from "./map-demo-content.mjs";

// Loopback connection string for the local Supabase stack started by
// `npm run db:start` / `npm run db:reset`.

// Marker written into every demo row so the seed can find and replace exactly
// its own data later without touching the canonical local fixtures.
const DEMO_DESCRIPTION_MARKER = "[Map demo]";

// Marker written into each demo pet so cleanup never removes the owner's
// canonical Pet Profiles from supabase/seed.sql.
const DEMO_PET_DESCRIPTION_MARKER = "[Map demo]";

// The canonical local owner account supplies a real Supabase Auth identity for
// the synthetic pet records created by this script.
const DEMO_USER_EMAIL = "owner@example.test";

// Account emails used by earlier demo seed versions, cleaned up for compatibility.
const PREVIOUS_DEMO_USER_EMAIL = "demo-map@example.com";
const LEGACY_DEMO_USER_EMAIL = "demo-heatmap@example.com";

// Deterministic pseudo-random generator (mulberry32) so two runs keep the same
// spatial layout and demo attributes. IDs and run-relative timestamps still vary.
function createRandom(seed) {
  // Start from the 32-bit seed.
  let state = seed >>> 0;
  // Generator closure: advances the state and returns a float in [0, 1).
  return function random() {
    // Add a fixed constant and wrap to 32 bits.
    state = (state + 0x6d2b79f5) >>> 0;
    // Mix the state ( avalanche) to spread the bits.
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    // Convert the mixed value to a float in [0, 1).
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// One random value from a list.
function pick(random, list) {
  // Random index into the array.
  const index = Math.floor(random() * list.length);
  // `noUncheckedIndexedAccess`-style safety for plain JS: fall back to the last
  // element if the index is somehow out of range.
  return list[index] ?? list[list.length - 1];
}

// Resolve a record to its curated city or public-landmark coordinate. Random
// offsets can drift into the ocean or lakes and don't represent real places.
function anchorPosition(center) {
  // City centers use lat/lng; neighborhood anchors use latitude/longitude.
  const centerLatitude = center.lat ?? center.latitude;
  const centerLongitude = center.lng ?? center.longitude;
  if (!Number.isFinite(centerLatitude) || !Number.isFinite(centerLongitude)) {
    throw new Error("Map seed center must include finite latitude and longitude values.");
  }

  return { lat: centerLatitude, lng: centerLongitude };
}

// Cities and towns with a relative activity weight.
// Southeast and Northeast metros are intentionally the busiest, the Mountain
// West the quietest, so the continental view shows obvious dense and sparse
// regions.
const allPlaces = [
  // Southeast — busiest.
  { name: "Atlanta, GA", lat: 33.749, lng: -84.388, weight: 12 },
  { name: "Miami, FL", lat: 25.7617, lng: -80.1918, weight: 11 },
  { name: "Orlando, FL", lat: 28.5383, lng: -81.3792, weight: 7 },
  { name: "Tampa, FL", lat: 27.9506, lng: -82.4572, weight: 7 },
  { name: "Charlotte, NC", lat: 35.2271, lng: -80.8431, weight: 8 },
  { name: "Jacksonville, FL", lat: 30.3322, lng: -81.6557, weight: 6 },
  { name: "Raleigh, NC", lat: 35.7796, lng: -78.6382, weight: 6 },
  { name: "Nashville, TN", lat: 36.1627, lng: -86.7816, weight: 7 },
  { name: "Memphis, TN", lat: 35.1495, lng: -90.049, weight: 4 },
  { name: "New Orleans, LA", lat: 29.9511, lng: -90.0715, weight: 4 },
  { name: "Birmingham, AL", lat: 33.5186, lng: -86.8104, weight: 3 },
  { name: "Louisville, KY", lat: 38.2527, lng: -85.7585, weight: 3 },
  { name: "Charleston, SC", lat: 32.7765, lng: -79.9311, weight: 3 },
  { name: "Richmond, VA", lat: 37.5407, lng: -77.436, weight: 3 },
  { name: "Savannah, GA", lat: 32.0809, lng: -81.0912, weight: 2 },
  // Northeast.
  { name: "New York, NY", lat: 40.7128, lng: -74.006, weight: 12 },
  { name: "Newark, NJ", lat: 40.7357, lng: -74.1724, weight: 5 },
  { name: "Philadelphia, PA", lat: 39.9526, lng: -75.1652, weight: 7 },
  { name: "Boston, MA", lat: 42.3601, lng: -71.0589, weight: 7 },
  { name: "Baltimore, MD", lat: 39.2904, lng: -76.6122, weight: 4 },
  { name: "Washington, DC", lat: 38.9072, lng: -77.0369, weight: 7 },
  { name: "Pittsburgh, PA", lat: 40.4406, lng: -79.9959, weight: 3 },
  { name: "Providence, RI", lat: 41.824, lng: -71.4128, weight: 2 },
  { name: "Hartford, CT", lat: 41.7658, lng: -72.6734, weight: 2 },
  { name: "Buffalo, NY", lat: 42.8864, lng: -78.8784, weight: 2 },
  // Midwest.
  { name: "Chicago, IL", lat: 41.8781, lng: -87.6298, weight: 10 },
  { name: "Columbus, OH", lat: 39.9612, lng: -82.9988, weight: 4 },
  { name: "Detroit, MI", lat: 42.3314, lng: -83.0458, weight: 4 },
  { name: "Indianapolis, IN", lat: 39.7684, lng: -86.1581, weight: 4 },
  { name: "Cleveland, OH", lat: 41.4993, lng: -81.6944, weight: 3 },
  { name: "Cincinnati, OH", lat: 39.1031, lng: -84.512, weight: 3 },
  { name: "Milwaukee, WI", lat: 43.0389, lng: -87.9065, weight: 3 },
  { name: "Minneapolis, MN", lat: 44.9778, lng: -93.265, weight: 4 },
  { name: "St. Louis, MO", lat: 38.627, lng: -90.1994, weight: 3 },
  { name: "Kansas City, MO", lat: 39.0997, lng: -94.5786, weight: 3 },
  // Southwest.
  { name: "Dallas, TX", lat: 32.7767, lng: -96.797, weight: 8 },
  { name: "Houston, TX", lat: 29.7604, lng: -95.3698, weight: 8 },
  { name: "Austin, TX", lat: 30.2672, lng: -97.7431, weight: 6 },
  { name: "San Antonio, TX", lat: 29.4241, lng: -98.4936, weight: 5 },
  { name: "Phoenix, AZ", lat: 33.4484, lng: -112.074, weight: 7 },
  { name: "Tucson, AZ", lat: 32.2226, lng: -110.9747, weight: 2 },
  { name: "Albuquerque, NM", lat: 35.0844, lng: -106.6504, weight: 2 },
  { name: "Oklahoma City, OK", lat: 35.4676, lng: -97.5164, weight: 3 },
  { name: "El Paso, TX", lat: 31.7619, lng: -106.485, weight: 2 },
  // West Coast.
  { name: "Los Angeles, CA", lat: 34.0522, lng: -118.2437, weight: 10 },
  { name: "San Diego, CA", lat: 32.7157, lng: -117.1611, weight: 5 },
  { name: "San Francisco, CA", lat: 37.7749, lng: -122.4194, weight: 7 },
  { name: "San Jose, CA", lat: 37.3382, lng: -121.8863, weight: 4 },
  { name: "Sacramento, CA", lat: 38.5816, lng: -121.4944, weight: 4 },
  { name: "Seattle, WA", lat: 47.6062, lng: -122.3321, weight: 6 },
  { name: "Portland, OR", lat: 45.5152, lng: -122.6784, weight: 4 },
  // Mountain / Plains — quietest.
  { name: "Denver, CO", lat: 39.7392, lng: -104.9903, weight: 5 },
  { name: "Salt Lake City, UT", lat: 40.7608, lng: -111.891, weight: 2 },
  { name: "Las Vegas, NV", lat: 36.1699, lng: -115.1398, weight: 3 },
  { name: "Boise, ID", lat: 43.615, lng: -116.2023, weight: 1 },
  { name: "Spokane, WA", lat: 47.6588, lng: -117.426, weight: 1 },
  { name: "Reno, NV", lat: 39.5296, lng: -119.8138, weight: 1 },
  { name: "Omaha, NE", lat: 41.2565, lng: -95.9345, weight: 2 },
  { name: "Des Moines, IA", lat: 41.5868, lng: -93.625, weight: 1 },
  { name: "Little Rock, AR", lat: 34.7465, lng: -92.2896, weight: 1 },
  // Small towns / rural anchors so the zoomed-out map is not only metros.
  { name: "Boone, NC", lat: 36.2168, lng: -81.6746, weight: 1 },
  { name: "Burlington, VT", lat: 44.4759, lng: -73.2121, weight: 1 },
  { name: "Bozeman, MT", lat: 45.677, lng: -111.0429, weight: 1 },
  { name: "Flagstaff, AZ", lat: 35.1983, lng: -111.6513, weight: 1 },
  { name: "Bend, OR", lat: 44.0582, lng: -121.3153, weight: 1 },
  { name: "Fayetteville, AR", lat: 36.0626, lng: -94.1574, weight: 1 },
  // Additional small cities provide low-density coverage between the metros.
  { name: "Fargo, ND", lat: 46.8772, lng: -96.7898, weight: 1 },
  { name: "Bismarck, ND", lat: 46.8083, lng: -100.7837, weight: 1 },
  { name: "Rapid City, SD", lat: 44.0805, lng: -103.231, weight: 1 },
  { name: "Sioux Falls, SD", lat: 43.5446, lng: -96.7311, weight: 1 },
  { name: "Duluth, MN", lat: 46.7867, lng: -92.1005, weight: 1 },
  { name: "Cheyenne, WY", lat: 41.14, lng: -104.8202, weight: 1 },
  { name: "Casper, WY", lat: 42.8501, lng: -106.3252, weight: 1 },
  { name: "Grand Junction, CO", lat: 39.0639, lng: -108.5506, weight: 1 },
  { name: "Missoula, MT", lat: 46.8721, lng: -113.994, weight: 1 },
  { name: "Helena, MT", lat: 46.5884, lng: -112.0245, weight: 1 },
  { name: "Great Falls, MT", lat: 47.5053, lng: -111.3008, weight: 1 },
  { name: "Idaho Falls, ID", lat: 43.4927, lng: -112.0408, weight: 1 },
  { name: "Yakima, WA", lat: 46.6021, lng: -120.5059, weight: 1 },
  { name: "Medford, OR", lat: 42.3265, lng: -122.8756, weight: 1 },
  { name: "Syracuse, NY", lat: 43.0481, lng: -76.1474, weight: 1 },
  { name: "Albany, NY", lat: 42.6526, lng: -73.7562, weight: 1 },
  { name: "Bangor, ME", lat: 44.8012, lng: -68.7778, weight: 1 },
  { name: "Scranton, PA", lat: 41.4089, lng: -75.6624, weight: 1 },
  { name: "Asheville, NC", lat: 35.5951, lng: -82.5515, weight: 1 },
  { name: "Knoxville, TN", lat: 35.9606, lng: -83.9207, weight: 1 },
  { name: "Roanoke, VA", lat: 37.271, lng: -79.9414, weight: 1 },
  { name: "Charleston, WV", lat: 38.3498, lng: -81.6326, weight: 1 },
  { name: "Tallahassee, FL", lat: 30.4383, lng: -84.2807, weight: 1 },
  { name: "Mobile, AL", lat: 30.6954, lng: -88.0399, weight: 1 },
  { name: "Macon, GA", lat: 32.8407, lng: -83.6324, weight: 1 },
  { name: "Jackson, MS", lat: 32.2988, lng: -90.1848, weight: 1 },
  { name: "Shreveport, LA", lat: 32.5252, lng: -93.7502, weight: 1 },
  { name: "Lubbock, TX", lat: 33.5779, lng: -101.8552, weight: 1 },
  { name: "Amarillo, TX", lat: 35.222, lng: -101.8313, weight: 1 },
  { name: "Corpus Christi, TX", lat: 27.8006, lng: -97.3964, weight: 1 },
  { name: "Laredo, TX", lat: 27.5036, lng: -99.5076, weight: 1 },
  { name: "Waco, TX", lat: 31.5493, lng: -97.1467, weight: 1 },
  { name: "Midland, TX", lat: 31.9973, lng: -102.0779, weight: 1 },
];

const REGION_CITIES = {
  southeast: new Set([
    "Atlanta, GA", "Miami, FL", "Orlando, FL", "Tampa, FL", "Charlotte, NC",
    "Jacksonville, FL", "Raleigh, NC", "Nashville, TN", "Memphis, TN",
    "New Orleans, LA", "Birmingham, AL", "Charleston, SC", "Richmond, VA",
    "Savannah, GA", "Boone, NC", "Asheville, NC", "Knoxville, TN",
    "Roanoke, VA", "Tallahassee, FL", "Mobile, AL", "Macon, GA", "Jackson, MS",
    "Shreveport, LA",
  ]),
  california: new Set([
    "Los Angeles, CA", "San Diego, CA", "San Francisco, CA", "San Jose, CA",
    "Sacramento, CA",
  ]),
  northeast: new Set([
    "New York, NY", "Newark, NJ", "Philadelphia, PA", "Boston, MA",
    "Baltimore, MD", "Washington, DC", "Providence, RI", "Hartford, CT",
    "Buffalo, NY", "Syracuse, NY", "Albany, NY", "Bangor, ME", "Scranton, PA",
  ]),
};

const REGION_SHARES = { southeast: 0.6, california: 0.2, northeast: 0.2 };
const regionalWeightTotals = Object.fromEntries(
  Object.entries(REGION_CITIES).map(([region, cityNames]) => [
    region,
    allPlaces
      .filter((place) => cityNames.has(place.name))
      .reduce((total, place) => total + place.weight, 0),
  ]),
);

const places = Object.entries(REGION_CITIES).flatMap(([region, cityNames]) =>
  allPlaces
    .filter((place) => cityNames.has(place.name))
    .map((place) => ({
      ...place,
      region,
      weight:
        (place.weight / (regionalWeightTotals[region] ?? 1)) *
        (REGION_SHARES[region] ?? 0),
    })),
);

// Pet names used for demo reports.
const petNames = [
  "Max", "Bella", "Charlie", "Luna", "Cooper", "Daisy", "Rocky", "Lucy",
  "Buddy", "Sadie", "Duke", "Molly", "Bear", "Lola", "Jack", "Maggie",
  "Oliver", "Sophie", "Tucker", "Chloe", "Milo", "Bailey", "Zeus", "Penny",
  "Rosie", "Winston", "Ruby", "Oscar", "Nala", "Simba", "Pepper", "Ginger",
];

// Dog breeds for demo pets.
const dogBreeds = [
  "Labrador Retriever", "German Shepherd", "Golden Retriever", "Bulldog",
  "Beagle", "Poodle", "Rottweiler", "Yorkshire Terrier", "Boxer", "Dachshund",
  "French Bulldog", "Siberian Husky", "Australian Shepherd", "Corgi",
];

// Cat breeds for demo pets.
const catBreeds = [
  "Domestic Shorthair", "Siamese", "Maine Coon", "Persian", "Ragdoll",
  "Bengal", "British Shorthair", "Abyssinian", "Scottish Fold", "Sphynx",
];

// Pet Profiles use lowercase values enforced by the pets table constraint.
const petSpeciesOptions = ["dog", "cat"];

// Spottings use title-case values enforced by the spottings table constraint.
const spottingSpeciesOptions = ["Dog", "Cat"];

// Colours, sizes and weight ranges used to fill in the demo records.
const colors = ["Black", "Brown", "White", "Golden", "Gray", "Orange", "Tan", "Mixed"];
const sizes = ["small", "medium", "large"];
const weightRanges = ["Under 10 lbs", "10–25 lbs", "26–50 lbs", "51–75 lbs"];

// Read the two optional CLI overrides (--reports N / --spottings N).
function readLimitFromArgs(argv, name, fallback) {
  // Index of the flag, if present.
  const index = argv.indexOf(`--${name}`);
  // Flag missing or without a value: keep the default.
  if (index === -1) return fallback;
  // Raw value that follows the flag.
  const raw = argv[index + 1];
  // Parse and validate.
  const parsed = Number(raw);
  // Guard against NaN, negatives and zero.
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  // Whole rows only.
  // Keep even a small positive override at one row after rounding down.
  return Math.max(1, Math.floor(parsed));
}

// Split a requested row count across places without losing or adding rows.
function allocateWeightedCounts(total, locations) {
  // Sum the relative weights used to calculate each location's share.
  const weightTotal = locations.reduce(
    (sum, location) => sum + location.weight,
    0,
  );
  // Take each location's whole-number share and remember its fractional part.
  const allocations = locations.map((location, index) => {
    // Exact weighted share before rounding.
    const exactCount = (total * location.weight) / weightTotal;
    // Whole rows can be assigned immediately.
    const count = Math.floor(exactCount);
    // The fraction decides which location gets any remaining rows.
    const remainder = exactCount - count;
    // Preserve the source order to make equal remainders deterministic.
    return { index, count, remainder };
  });
  // Largest-remainder allocation makes the result sum exactly to `total`.
  const rowsLeft =
    total - allocations.reduce((sum, allocation) => sum + allocation.count, 0);
  // Sort a copy so the result can still be returned in the original place order.
  const remainderOrder = [...allocations].sort(
    (left, right) =>
      right.remainder - left.remainder || left.index - right.index,
  );
  // Give one extra row to each of the locations with the largest fractions.
  for (let index = 0; index < rowsLeft; index += 1) {
    const allocation = remainderOrder[index];
    // The remainder count is always less than the number of locations.
    if (allocation) allocation.count += 1;
  }
  // Return one exact allocation for each source location.
  return allocations.map((allocation) => allocation.count);
}

// Build every row that will be inserted.
function buildDataset(random, reportLimit, spottingLimit) {
  // Rows for the `pets` table.
  const pets = [];
  // Rows for the `lost_pet_reports` table.
  const reports = [];
  // Rows for the `spottings` table.
  const spottings = [];
  // Private profile-image references for the demo pets.
  const petImages = [];

  // Timestamp helpers: demo activity is spread over the last 45 days.
  const now = Date.now();
  const dayInMs = 86_400_000;
  // Random time within the window, as a Date.
  const randomRecentDate = (maxDaysAgo) =>
    new Date(now - Math.floor(random() * maxDaysAgo * dayInMs));

  // Allocate exact report and Spotting totals across locations by their weights.
  const reportCounts = allocateWeightedCounts(reportLimit, places);
  const spottingCounts = allocateWeightedCounts(spottingLimit, places);
  // Generate each location's synthetic activity in the same stable order.
  for (const [placeIndex, place] of places.entries()) {
    // Exact number of report rows assigned to this location.
    const reportCount = reportCounts[placeIndex] ?? 0;
    // Exact number of Spotting rows assigned to this location.
    const spottingCount = spottingCounts[placeIndex] ?? 0;
    const neighborhoodAnchors = DEMO_NEIGHBORHOODS_BY_CITY.get(place.name) ?? [];

    // Every fixture is placed on its named landmark or city-center anchor.
    const nextPosition = () => {
      if (neighborhoodAnchors.length > 0) {
        const anchor = pick(random, neighborhoodAnchors);
        const position = anchorPosition(anchor);
        return {
          latitude: position.lat,
          longitude: position.lng,
          locationLabel: formatDemoNeighborhoodLabel(anchor),
        };
      }

      const position = anchorPosition(place);
      return {
        latitude: position.lat,
        longitude: position.lng,
        locationLabel: `Near ${place.name}`,
      };
    };

    // One Pet Profile per lost report, because a report must reference a pet.
    for (let index = 0; index < reportCount; index += 1) {
      // Species for this pet.
      const species = pick(random, petSpeciesOptions);
      // Matching breed list for the species.
      const breed = species === "dog" ? pick(random, dogBreeds) : pick(random, catBreeds);
      // Position of the report (and therefore of the pet's last-seen pin).
      const position = nextPosition();
      // Pet id generated up front so the report row can reference it without a
      // round trip (createMany cannot return generated ids).
      const petId = randomUUID();
      const name = pick(random, petNames);
      const photo = chooseDemoPhoto(random, species);

      // Queue the pet row.
      pets.push({
        id: petId,
        // Every demo pet belongs to the demo account.
        ownerId: null,
        name,
        species,
        breed,
        color: pick(random, colors),
        size: pick(random, sizes),
        age: 1 + Math.floor(random() * 12),
      description: `${DEMO_PET_DESCRIPTION_MARKER} Demo pet last seen near ${place.name}`,
      });
      petImages.push({
        petId,
        storagePath: getDemoPetImagePath("demo-map", petId, photo),
        caption: `Synthetic ${species} photo: ${photo.id}`,
      });

      // Queue the lost report row.
      reports.push({
        id: randomUUID(),
        petId,
        status: "LOST",
        lastSeenAt: randomRecentDate(45),
        contactMethod: "in_app",
        latitude: position.latitude,
        longitude: position.longitude,
        weightRange: pick(random, weightRanges),
        description: `${DEMO_DESCRIPTION_MARKER} Lost ${species} near ${position.locationLabel}`,
        locationLabel: position.locationLabel,
      });
    }

    // Spotting rows: no owner, just a species, a position and an image path.
    for (let index = 0; index < spottingCount; index += 1) {
      // Species for this spotting.
      const species = pick(random, spottingSpeciesOptions);
      // Position of the sighting.
      const position = nextPosition();
      const photo = chooseDemoPhoto(random, species);
      // Queue the spotting row.
      spottings.push({
        id: randomUUID(),
        species,
        breed: species === "Dog" ? pick(random, dogBreeds) : pick(random, catBreeds),
        weightRange: pick(random, weightRanges),
        spottedAt: randomRecentDate(30),
        latitude: position.latitude,
        longitude: position.longitude,
        locationLabel: position.locationLabel,
        imagePath: getDemoCatalogPath(photo),
        // Marker so this row can be found and removed later without touching
        // the spottings that belong to supabase/seed.sql.
        description: `${DEMO_DESCRIPTION_MARKER} Spotted a ${species.toLowerCase()} near ${position.locationLabel}`,
      });
    }
  }

  // Each requested report already has one pet, and both activity totals are exact.
  return {
    pets,
    petImages,
    reports,
    spottings,
  };
}

// Remove everything this script (and the superseded heatmap scripts) created.
async function clearDemoData(prisma) {
  // Find only the dedicated accounts used by earlier versions of this script.
  const demoUsers = await prisma.user.findMany({
    where: {
      email: { in: [PREVIOUS_DEMO_USER_EMAIL, LEGACY_DEMO_USER_EMAIL] },
    },
    select: { userId: true, email: true },
  });

  // Collect prior demo account ids without including the canonical owner account.
  const userIds = demoUsers.map((user) => user.userId);
  // Find prior demo pets and newly marked pets owned by the canonical local user.
  const demoPets = await prisma.pet.findMany({
    where: {
      OR: [
        { ownerId: { in: userIds } },
        { description: { startsWith: DEMO_PET_DESCRIPTION_MARKER } },
      ],
    },
    select: { id: true },
  });
  // Just the pet ids.
  const petIds = demoPets.map((pet) => pet.id);

  // Reports first, because they reference pets with a restrict rule.
  const deletedReports = await prisma.lostPetReport.deleteMany({
    where: { petId: { in: petIds } },
  });
  // Pet images next (none today, but keeps the cleanup complete).
  const deletedImages = await prisma.petImage.deleteMany({
    where: { petId: { in: petIds } },
  });
  // Then the pets themselves.
  const deletedPets = await prisma.pet.deleteMany({
    where: { id: { in: petIds } },
  });
  // Demo spottings are identified by their description marker, so the
  // spottings that belong to supabase/seed.sql are left untouched.
  const deletedSpottings = await prisma.spotting.deleteMany({
    where: { description: { startsWith: DEMO_DESCRIPTION_MARKER } },
  });

  // Report what was removed.
  process.stdout.write(
    `Cleared ${deletedReports.count} reports, ${deletedImages.count} pet images, ` +
      `${deletedPets.count} pets and ${deletedSpottings.count} spottings.\n`,
  );
}

// Connect, clear, generate and insert.
async function main() {
  // Parse the optional overrides.
  const args = process.argv.slice(2);
  const reportLimit = readLimitFromArgs(args, "reports", 1200);
  const spottingLimit = readLimitFromArgs(args, "spottings", 800);

  if (args.includes("--dry-run")) {
    const reportCounts = allocateWeightedCounts(reportLimit, places);
    const spottingCounts = allocateWeightedCounts(spottingLimit, places);
    const regionalCounts = Object.fromEntries(
      Object.keys(REGION_CITIES).map((region) => [
        region,
        places.reduce((count, place, index) =>
          place.region === region
            ? count + (reportCounts[index] ?? 0) + (spottingCounts[index] ?? 0)
            : count, 0),
      ]),
    );
    const summary = {
      totalPoints: reportLimit + spottingLimit,
      lostReports: reportLimit,
      spottings: spottingLimit,
      places: places.length,
      regionalCounts,
    };
    process.stdout.write(
      args.includes("--json")
        ? `${JSON.stringify(summary, null, 2)}\n`
        : `Dry run: ${summary.totalPoints} points (${reportLimit} lost reports, ${spottingLimit} spottings): ` +
            `${regionalCounts.southeast} Southeast, ${regionalCounts.california} California, ` +
            `${regionalCounts.northeast} Northeast.\n`,
    );
    return;
  }

  // Log what is about to happen.
  process.stdout.write("Connecting to the local Supabase database...\n");

  // Connection pool for the loopback database.
  const pool = new pg.Pool({ connectionString: getLocalDatabaseUrl() });
  // Prisma client on top of that pool.
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    // Always start from a clean slate so repeated runs do not stack duplicates.
    await clearDemoData(prisma);

    // Reuse the auth-linked owner profile created by the canonical local seed.
    const demoUser = await prisma.user.findUnique({
      where: { email: DEMO_USER_EMAIL },
      select: { userId: true },
    });
    // Require the standard local seed instead of creating a profile without Auth.
    if (!demoUser) {
      throw new Error("Run `npm run db:reset` before seeding the map demo data.");
    }

    // Fixed seed keeps generated coordinates and attributes stable between runs.
    const random = createRandom(20260101);
    // Build all rows in memory first.
    const dataset = buildDataset(random, reportLimit, spottingLimit);
    // Stamp the demo owner onto every pet now that the account id is known.
    const pets = dataset.pets.map((pet) => ({ ...pet, ownerId: demoUser.userId }));

    // Insert pets in bulk (no round trip per row).
    process.stdout.write(`Inserting ${pets.length} demo pets...\n`);
    await prisma.pet.createMany({ data: pets });
    process.stdout.write(`Adding ${dataset.petImages.length} pet photo references...\n`);
    await prisma.petImage.createMany({ data: dataset.petImages });
    // Insert lost reports in bulk.
    process.stdout.write(`Inserting ${dataset.reports.length} lost reports...\n`);
    await prisma.lostPetReport.createMany({ data: dataset.reports });
    // Insert spottings in bulk.
    process.stdout.write(`Inserting ${dataset.spottings.length} spottings...\n`);
    await prisma.spotting.createMany({ data: dataset.spottings });

    // Summarise what the map will now show.
    process.stdout.write(
      `\nThe map now has ${dataset.reports.length} lost reports and ` +
        `${dataset.spottings.length} spottings across ${places.length} places.\n`,
    );
  } finally {
    // Always release the connection.
    await prisma.$disconnect();
    await pool.end();
  }
}

// Run and fail loudly with a non-zero exit code.
main().catch((error) => {
  process.stderr.write(`Error seeding map demo data: ${error?.message ?? error}\n`);
  process.exit(1);
});
