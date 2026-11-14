import { createHash } from "node:crypto";

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { getLocalDatabaseUrl } from "./helpers/local-database-url.mjs";
import {
  DEMO_DULUTH_ANCHORS,
  DEMO_NEIGHBORHOODS,
  chooseDemoPhoto,
  formatDemoNeighborhoodLabel,
  getDemoCatalogPath,
} from "./map-demo-content.mjs";

// This seeder can connect only to the local Supabase database.
const DEMO_MARKER = "[Map national coverage]";
const DEMO_USER_EMAIL = "owner@example.test";
const DEFAULT_POINT_COUNT = 12000;
const MIN_POINT_COUNT = 1000;
const MAX_POINT_COUNT = 20000;
const DEMO_ID_NAMESPACE = "7ea07851-a253-480a-bdea-03128b53f829";

const REGION_CITIES = {
  southeast: new Set(["Atlanta, GA", "Miami, FL", "Nashville, TN"]),
  california: new Set([
    "Los Angeles, CA",
    "San Diego, CA",
    "San Francisco, CA",
  ]),
  northeast: new Set(["Washington, DC", "New York, NY", "Boston, MA"]),
  midwest: new Set(["Chicago, IL", "Minneapolis, MN"]),
};

const petNames = [
  "Maple", "Scout", "Poppy", "Milo", "Juniper", "Clover", "Ollie", "Pepper",
  "Sunny", "Waffles", "Mochi", "Ranger", "Miso", "Comet", "Willow", "Pip",
  "Bailey", "Daisy", "Charlie", "Luna", "Cooper", "Rosie", "Tucker", "Nala",
];
const dogBreeds = [
  "Labrador Retriever", "German Shepherd", "Golden Retriever", "Beagle",
  "Poodle", "Corgi", "Boxer", "Dachshund", "Australian Shepherd", "Husky",
];
const catBreeds = [
  "Domestic Shorthair", "Siamese", "Maine Coon", "Persian", "Ragdoll",
  "Bengal", "British Shorthair", "Abyssinian", "Scottish Fold",
];
const colors = ["Black", "Brown", "White", "Golden", "Gray", "Orange", "Tan"];
const sizes = ["small", "medium", "large"];
const weightRanges = [
  "Under 10 lbs", "10–25 lbs", "26–50 lbs", "51–75 lbs", "Over 75 lbs",
  "Unknown",
];

function parseOptions(args) {
  let pointsValue = process.env.MAXFINDER_MAP_DENSITY_POINTS ?? DEFAULT_POINT_COUNT;
  let dryRun = false;
  let json = false;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (argument === "--json") {
      json = true;
      continue;
    }
    if (argument === "--points") {
      pointsValue = args[index + 1];
      index += 1;
      continue;
    }
    throw new Error(`Unknown option '${argument}'. Use --points N and/or --dry-run.`);
  }

  const points = Number(pointsValue);
  if (!Number.isInteger(points) || points < MIN_POINT_COUNT || points > MAX_POINT_COUNT) {
    throw new Error(`Point count must be a whole number from ${MIN_POINT_COUNT} to ${MAX_POINT_COUNT}.`);
  }
  return { points, dryRun, json };
}

function createRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(random, values) {
  return values[Math.floor(random() * values.length)] ?? values[0];
}

function demoId(kind, latitude, longitude, index) {
  const key = `${DEMO_ID_NAMESPACE}:${kind}:${latitude.toFixed(6)}:${longitude.toFixed(6)}:${index}`;
  const bytes = createHash("sha1").update(key).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join("-");
}

function roundCoordinate(value) {
  return Number(value.toFixed(6));
}

function buildRegionalAnchors() {
  const allAnchors = [...DEMO_NEIGHBORHOODS, ...DEMO_DULUTH_ANCHORS];
  return Object.fromEntries(
    Object.entries(REGION_CITIES).map(([region, cities]) => [
      region,
      allAnchors.filter((anchor) => cities.has(anchor.city)),
    ]),
  );
}

function getRegionCounts(total) {
  const midwest = Math.min(2, total);
  const remaining = total - midwest;
  const southeast = Math.round(remaining * 0.6);
  const northeast = Math.floor(remaining * 0.2);
  return {
    southeast,
    california: remaining - southeast - northeast,
    northeast,
    midwest,
  };
}

function createPosition(anchor) {
  // Use curated public-place coordinates directly to keep every point on land.
  return { latitude: roundCoordinate(anchor.latitude), longitude: roundCoordinate(anchor.longitude) };
}

function buildCoveragePoints(count) {
  const anchors = buildRegionalAnchors();
  const regionalCounts = getRegionCounts(count);
  const points = [];

  for (const [region, regionCount] of Object.entries(regionalCounts)) {
    const regionAnchors = anchors[region] ?? [];
    if (regionCount > 0 && regionAnchors.length === 0) {
      throw new Error(`No public map anchors are configured for ${region}.`);
    }
    for (let index = 0; index < regionCount; index += 1) {
      const anchor = regionAnchors[index % regionAnchors.length];
      if (!anchor) continue;
      points.push({
        ...createPosition(anchor),
        region,
        anchor,
      });
    }
  }

  return { points, regionalCounts };
}

function summarize(points, pointCount, regionalCounts) {
  const lostReports = Math.ceil(pointCount / 2);
  const latitudes = points.map((point) => point.latitude);
  const longitudes = points.map((point) => point.longitude);
  return {
    totalPoints: pointCount,
    lostReports,
    spottings: pointCount - lostReports,
    coverage: "weighted public-place clusters in the Southeast, California, and Northeast; two Midwest examples",
    regionalCounts,
    bounds: {
      minLatitude: Number(Math.min(...latitudes).toFixed(2)),
      maxLatitude: Number(Math.max(...latitudes).toFixed(2)),
      minLongitude: Number(Math.min(...longitudes).toFixed(2)),
      maxLongitude: Number(Math.max(...longitudes).toFixed(2)),
    },
  };
}

function printDryRun(summary, json) {
  const lineBreak = String.fromCharCode(10);
  const message = `Dry run: ${summary.totalPoints} points; ${summary.regionalCounts.southeast} Southeast, ${summary.regionalCounts.california} California, ${summary.regionalCounts.northeast} Northeast, ${summary.regionalCounts.midwest} Midwest.`;
  process.stdout.write((json ? JSON.stringify(summary, null, 2) : message) + lineBreak);
}

async function clearPreviousBatch(prisma) {
  return prisma.$transaction(async (transaction) => {
    const pets = await transaction.pet.findMany({
      where: { description: { startsWith: DEMO_MARKER } },
      select: { id: true },
    });
    const petIds = pets.map((pet) => pet.id);
    const deletedReports = await transaction.lostPetReport.deleteMany({
      where: { description: { startsWith: DEMO_MARKER } },
    });
    const deletedSpottings = await transaction.spotting.deleteMany({
      where: { description: { startsWith: DEMO_MARKER } },
    });
    const deletedPetImages = petIds.length
      ? await transaction.petImage.deleteMany({ where: { petId: { in: petIds } } })
      : { count: 0 };
    const deletedPets = petIds.length
      ? await transaction.pet.deleteMany({ where: { id: { in: petIds } } })
      : { count: 0 };
    return {
      reports: deletedReports.count,
      spottings: deletedSpottings.count,
      pets: deletedPets.count,
      petImages: deletedPetImages.count,
    };
  });
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const coverage = buildCoveragePoints(options.points);
  const summary = summarize(coverage.points, options.points, coverage.regionalCounts);

  if (options.dryRun) {
    printDryRun(summary, options.json);
    return;
  }

  const pool = new pg.Pool({ connectionString: getLocalDatabaseUrl() });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const owner = await prisma.user.findUnique({
      where: { email: DEMO_USER_EMAIL },
      select: { userId: true },
    });
    if (!owner) throw new Error("Run the standard local database seed before adding map coverage.");

    const removed = await clearPreviousBatch(prisma);
    process.stdout.write(`Replaced ${removed.reports} old reports, ${removed.spottings} old spottings, and ${removed.pets} old pets in the national demo batch.\n`);

    const random = createRandom(20261113);
    const typeRandom = createRandom(20261114);
    const reportCount = summary.lostReports;
    const types = Array.from({ length: options.points }, (_, index) =>
      index < reportCount ? "lost" : "spotted",
    );
    for (let index = types.length - 1; index > 0; index -= 1) {
      const target = Math.floor(typeRandom() * (index + 1));
      [types[index], types[target]] = [types[target], types[index]];
    }

    const pets = [];
    const reports = [];
    const spottings = [];
    const now = Date.now();
    const millisecondsPerDay = 86_400_000;

    for (const [index, point] of coverage.points.entries()) {
      const { latitude, longitude, anchor } = point;
      if (types[index] === "lost") {
        const species = random() < 0.55 ? "dog" : "cat";
        const breed = pick(random, species === "dog" ? dogBreeds : catBreeds);
        const petId = demoId("pet", latitude, longitude, index);
        pets.push({
          id: petId,
          ownerId: owner.userId,
          name: pick(random, petNames),
          species,
          breed,
          color: pick(random, colors),
          size: pick(random, sizes),
          age: 1 + Math.floor(random() * 15),
          description: `${DEMO_MARKER} Synthetic ${point.region} pet profile.`,
        });
        reports.push({
          id: demoId("report", latitude, longitude, index),
          petId,
          status: "LOST",
          lastSeenAt: new Date(now - Math.floor(random() * 60 * millisecondsPerDay)),
          contactMethod: "in_app",
          latitude,
          longitude,
          weightRange: pick(random, weightRanges),
          description: `${DEMO_MARKER} Synthetic ${point.region} lost-pet map point.`,
          locationLabel: formatDemoNeighborhoodLabel(anchor),
        });
      } else {
        const species = random() < 0.55 ? "Dog" : "Cat";
        const breed = pick(random, species === "Dog" ? dogBreeds : catBreeds);
        const photo = chooseDemoPhoto(random, species);
        spottings.push({
          id: demoId("spotting", latitude, longitude, index),
          species,
          breed,
          weightRange: pick(random, weightRanges),
          spottedAt: new Date(now - Math.floor(random() * 30 * millisecondsPerDay)),
          latitude,
          longitude,
          locationLabel: formatDemoNeighborhoodLabel(anchor),
          imagePath: getDemoCatalogPath(photo),
          description: `${DEMO_MARKER} Synthetic ${point.region} community map point.`,
        });
      }
    }

    const insertedPets = await prisma.pet.createMany({ data: pets });
    const insertedReports = await prisma.lostPetReport.createMany({ data: reports });
    const insertedSpottings = await prisma.spotting.createMany({ data: spottings });

    process.stdout.write(
      `Added ${insertedReports.count} lost reports and ${insertedSpottings.count} spottings: ` +
      `${coverage.regionalCounts.southeast} Southeast, ${coverage.regionalCounts.california} California, ` +
      `${coverage.regionalCounts.northeast} Northeast, and ${coverage.regionalCounts.midwest} Midwest points.\n` +
      `Added ${insertedPets.count} pet profiles at existing public park and landmark anchors.\n`,
    );
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  process.stderr.write(`Error adding regional map demo data: ${error?.message ?? error}\n`);
  process.exitCode = 1;
});
