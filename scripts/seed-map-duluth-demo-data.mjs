// Add a local-only Duluth demo cluster around public parks and landmarks.
// It uses the existing Pet, Lost Pet Report, and Spotting models without
// placing synthetic reports at private homes or changing the database schema.

import { createHash } from "node:crypto";

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { getLocalDatabaseUrl } from "./helpers/local-database-url.mjs";
import {
  DEMO_DULUTH_ANCHORS,
  chooseDemoPhoto,
  getDemoCatalogPath,
  getDemoPetImagePath,
} from "./map-demo-content.mjs";

// Hard-code loopback so this helper cannot write to a hosted database.
const DEMO_MARKER = "[Map Duluth demo]";
const DEMO_USER_EMAIL = "owner@example.test";
const DEFAULT_POINT_COUNT = 600;
const MIN_POINT_COUNT = 100;
const MAX_POINT_COUNT = 2000;
const DEMO_ID_NAMESPACE = "925ea59e-9f4c-43a3-a4cc-68ac41995390";

const petNames = [
  "Maple", "Scout", "Poppy", "Milo", "Juniper", "Clover", "Ollie", "Pepper",
  "Sunny", "Waffles", "Mochi", "Ranger", "Miso", "Comet", "Willow", "Pip",
];
const dogBreeds = [
  "Labrador Retriever", "German Shepherd", "Golden Retriever", "Beagle",
  "Poodle", "Corgi", "Boxer", "Dachshund",
];
const catBreeds = [
  "Domestic Shorthair", "Siamese", "Maine Coon", "Persian", "Ragdoll",
  "Bengal", "British Shorthair", "Abyssinian",
];
const colors = ["Black", "Brown", "White", "Golden", "Gray", "Orange", "Tan"];
const sizes = ["small", "medium", "large"];
const weightRanges = [
  "Under 10 lbs", "10–25 lbs", "26–50 lbs", "51–75 lbs", "Over 75 lbs",
  "Unknown",
];

function parseOptions(args) {
  let pointsValue = process.env.MAXFINDER_DULUTH_DEMO_POINTS ?? DEFAULT_POINT_COUNT;
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
    throw new Error("Unknown option '" + argument + "'. Use --points N and/or --dry-run.");
  }

  const points = Number(pointsValue);
  if (
    !Number.isInteger(points) ||
    points < MIN_POINT_COUNT ||
    points > MAX_POINT_COUNT ||
    points % 2 !== 0
  ) {
    throw new Error(
      "Point count must be an even whole number from " +
        MIN_POINT_COUNT +
        " to " +
        MAX_POINT_COUNT +
        ".",
    );
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

function roundCoordinate(value) {
  return Number(value.toFixed(6));
}

function demoId(key) {
  const bytes = createHash("sha1")
    .update(`${DEMO_ID_NAMESPACE}:${key}`)
    .digest()
    .subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}

function createPosition(anchor) {
  // Use the curated park coordinates directly instead of jittering into water.
  return {
    latitude: roundCoordinate(anchor.latitude),
    longitude: roundCoordinate(anchor.longitude),
  };
}

function locationLabel(anchor) {
  return `Near ${anchor.landmark}, ${anchor.address}`;
}

function buildDataset(pointCount) {
  const random = createRandom(20261120);
  const lostCount = pointCount / 2;
  const spottingCount = pointCount - lostCount;
  const pets = [];
  const petImages = [];
  const reports = [];
  const spottings = [];
  const now = Date.now();
  const millisecondsPerDay = 86_400_000;

  for (let index = 0; index < lostCount; index += 1) {
    const anchor = DEMO_DULUTH_ANCHORS[index % DEMO_DULUTH_ANCHORS.length];
    if (!anchor) continue;
    const species = random() < 0.55 ? "dog" : "cat";
    const petId = demoId(`pet-${index}`);
    const photo = chooseDemoPhoto(random, species);
    const position = createPosition(anchor);

    pets.push({
      id: petId,
      ownerId: null,
      name: pick(random, petNames),
      species,
      breed: pick(random, species === "dog" ? dogBreeds : catBreeds),
      color: pick(random, colors),
      size: pick(random, sizes),
      age: 1 + Math.floor(random() * 15),
      description: `${DEMO_MARKER} Synthetic demo pet near ${anchor.neighborhood}.`,
    });
    petImages.push({
      petId,
      storagePath: getDemoPetImagePath("demo-clusters", petId, photo),
      caption: `Synthetic ${species} photo: ${photo.id}`,
    });
    reports.push({
      id: demoId(`report-${index}`),
      petId,
      status: "LOST",
      lastSeenAt: new Date(
        now - Math.floor(random() * 60 * millisecondsPerDay),
      ),
      contactMethod: "in_app",
      latitude: position.latitude,
      longitude: position.longitude,
      weightRange: pick(random, weightRanges),
      description: `${DEMO_MARKER} Synthetic lost ${species} near ${anchor.landmark}.`,
      locationLabel: locationLabel(anchor),
    });
  }

  for (let index = 0; index < spottingCount; index += 1) {
    const anchor = DEMO_DULUTH_ANCHORS[index % DEMO_DULUTH_ANCHORS.length];
    if (!anchor) continue;
    const species = random() < 0.55 ? "Dog" : "Cat";
    const photo = chooseDemoPhoto(random, species);
    const position = createPosition(anchor);
    spottings.push({
      id: demoId(`spotting-${index}`),
      species,
      breed: pick(random, species === "Dog" ? dogBreeds : catBreeds),
      weightRange: pick(random, weightRanges),
      description: `${DEMO_MARKER} Synthetic community spotting near ${anchor.landmark}.`,
      spottedAt: new Date(
        now - Math.floor(random() * 30 * millisecondsPerDay),
      ),
      latitude: position.latitude,
      longitude: position.longitude,
      locationLabel: locationLabel(anchor),
      imagePath: getDemoCatalogPath(photo),
    });
  }

  return { pets, petImages, reports, spottings };
}

function printDryRun(points, dataset, json) {
  const summary = {
    totalPoints: points,
    lostReports: dataset.reports.length,
    spottings: dataset.spottings.length,
    city: "Duluth, GA",
    publicPlaceAnchors: DEMO_DULUTH_ANCHORS.map(({ landmark, address }) => ({
      landmark,
      address,
    })),
    petPhotoVariants: 8,
  };
  process.stdout.write(
    json
      ? `${JSON.stringify(summary, null, 2)}\n`
      : `Dry run: ${points} Duluth, GA points (${summary.lostReports} lost reports and ${summary.spottings} spottings) around ${DEMO_DULUTH_ANCHORS.length} public parks and landmarks.\n`,
  );
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const dataset = buildDataset(options.points);
  if (options.dryRun) {
    printDryRun(options.points, dataset, options.json);
    return;
  }

  const pool = new pg.Pool({ connectionString: getLocalDatabaseUrl() });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  try {
    const owner = await prisma.user.findUnique({
      where: { email: DEMO_USER_EMAIL },
      select: { userId: true },
    });
    if (!owner) {
      throw new Error("Run the standard local database seed before adding Duluth demo data.");
    }

    const insertedPets = await prisma.pet.createMany({
      data: dataset.pets.map((pet) => ({ ...pet, ownerId: owner.userId })),
      skipDuplicates: true,
    });
    const insertedPetImages = await prisma.petImage.createMany({
      data: dataset.petImages,
      skipDuplicates: true,
    });
    const insertedReports = await prisma.lostPetReport.createMany({
      data: dataset.reports,
      skipDuplicates: true,
    });
    const insertedSpottings = await prisma.spotting.createMany({
      data: dataset.spottings,
      skipDuplicates: true,
    });

    process.stdout.write(
      `Added ${insertedReports.count} synthetic lost reports and ${insertedSpottings.count} synthetic spottings around public places in Duluth, GA.\n` +
        `Added ${insertedPets.count} pet profiles and ${insertedPetImages.count} photo references.\n`,
    );
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  process.stderr.write(`Error adding local Duluth demo data: ${error?.message ?? error}\n`);
  process.exitCode = 1;
});
