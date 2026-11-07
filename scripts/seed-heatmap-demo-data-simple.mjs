import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const databaseUrl = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

process.stdout.write("Connecting to local Supabase database...\n");

const pool = new pg.Pool({ connectionString: databaseUrl });
const adapter = new PrismaClient({
  adapter: new PrismaPg(pool),
});

// Major US cities for demonstration - Southeastern has highest concentration
const cities = [
  // Southeast - HIGHEST concentration
  { name: "Atlanta, GA", lat: 33.7490, lng: -84.3880, region: "Southeast" },
  { name: "Miami, FL", lat: 25.7617, lng: -80.1918, region: "Southeast" },
  { name: "Charlotte, NC", lat: 35.2271, lng: -80.8431, region: "Southeast" },
  { name: "Jacksonville, FL", lat: 30.3322, lng: -81.6557, region: "Southeast" },
  { name: "Nashville, TN", lat: 36.1627, lng: -86.7816, region: "Southeast" },
  { name: "Raleigh, NC", lat: 35.7796, lng: -78.6382, region: "Southeast" },

  // Northeast - MODERATE concentration
  { name: "New York, NY", lat: 40.7128, lng: -74.0060, region: "Northeast" },
  { name: "Boston, MA", lat: 42.3601, lng: -71.0589, region: "Northeast" },
  { name: "Philadelphia, PA", lat: 39.9526, lng: -75.1652, region: "Northeast" },

  // Southwest - LESS concentration
  { name: "Phoenix, AZ", lat: 33.4484, lng: -112.0740, region: "Southwest" },
  { name: "Dallas, TX", lat: 32.7767, lng: -96.7970, region: "Southwest" },

  // West Coast - VERY LITTLE concentration
  { name: "Los Angeles, CA", lat: 34.0522, lng: -118.2437, region: "West Coast" },
  { name: "San Francisco, CA", lat: 37.7749, lng: -122.4194, region: "West Coast" },
];

const petNames = [
  "Max", "Bella", "Charlie", "Luna", "Cooper", "Daisy", "Rocky", "Lucy",
  "Buddy", "Sadie", "Duke", "Molly", "Bear", "Lola", "Jack", "Maggie",
  "Oliver", "Sophie", "Tucker", "Chloe", "Milo", "Bailey", "Zeus", "Penny"
];

const dogBreeds = [
  "Labrador Retriever", "German Shepherd", "Golden Retriever", "Bulldog",
  "Beagle", "Poodle", "Rottweiler", "Yorkshire Terrier", "Boxer", "Dachshund"
];

const catBreeds = [
  "Domestic Shorthair", "Siamese", "Maine Coon", "Persian", "Ragdoll",
  "Bengal", "British Shorthair", "Abyssinian", "Scottish Fold", "Sphynx"
];

const species = ["dog", "cat"];
const colors = ["Black", "Brown", "White", "Golden", "Gray", "Orange", "Tan", "Mixed"];
const sizes = ["small", "medium", "large"];

function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function addRandomOffset(coord, maxOffset = 0.05) {
  return coord + (Math.random() - 0.5) * maxOffset;
}

try {
  // Find or create the demo user
  let demoUser = await adapter.user.findUnique({
    where: { email: "demo-heatmap@example.com" },
  });

  if (!demoUser) {
    process.stdout.write("Creating demo user...\n");
    // Create a demo user with a known ID that won't conflict
    const demoAuthId = "00000000-0000-4000-8000-000000000099";

    demoUser = await adapter.user.create({
      data: {
        authProviderId: demoAuthId,
        email: "demo-heatmap@example.com",
        displayName: "Demo User",
        role: "USER",
      },
    });

    process.stdout.write(`✓ Created demo user: ${demoUser.email}\n`);
  } else {
    process.stdout.write(`✓ Using existing demo user: ${demoUser.email}\n`);
  }

  let totalReports = 0;
  let totalSpottings = 0;

  // Add reports and spottings for each region
  for (const city of cities) {
    // Determine concentration based on region
    let reportCount;
    let spottingCount;

    if (city.region === "Southeast") {
      reportCount = 7;
      spottingCount = 5;
    } else if (city.region === "Northeast") {
      reportCount = 3;
      spottingCount = 3;
    } else if (city.region === "Southwest") {
      reportCount = 2;
      spottingCount = 1;
    } else {
      reportCount = 1;
      spottingCount = 1;
    }

    // Create lost pet reports for this city
    for (let i = 0; i < reportCount; i++) {
      const petSpecies = randomItem(species);
      const breed = petSpecies === "dog" ? randomItem(dogBreeds) : randomItem(catBreeds);

      // Create pet
      const pet = await adapter.pet.create({
        data: {
          ownerId: demoUser.userId,
          name: randomItem(petNames),
          species: petSpecies === "dog" ? "Dog" : "Cat",
          breed,
          color: randomItem(colors),
          size: randomItem(sizes),
          age: Math.floor(Math.random() * 10) + 1,
          description: `A friendly ${petSpecies} last seen in ${city.name} area`,
        },
      });

      // Create lost pet report
      await adapter.lostPetReport.create({
        data: {
          petId: pet.id,
          status: "LOST",
          lastSeenAt: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)),
          latitude: addRandomOffset(city.lat, 0.03),
          longitude: addRandomOffset(city.lng, 0.03),
          locationLabel: `Near ${city.name}`,
          contactMethod: "in_app",
          description: `Lost ${petSpecies} in the ${city.name} area`,
        },
      });

      totalReports++;
    }

    // Create spottings for this city
    for (let i = 0; i < spottingCount; i++) {
      const spottingSpecies = randomItem(species);
      const breed = spottingSpecies === "dog" ? randomItem(dogBreeds) : randomItem(catBreeds);

      await adapter.spotting.create({
        data: {
          species: spottingSpecies === "dog" ? "Dog" : "Cat",
          breed,
          weightRange: randomItem(["Under 10 lbs", "10–25 lbs", "26–50 lbs", "51–75 lbs"]),
          description: `Spotted ${spottingSpecies} in ${city.name} area`,
          spottedAt: new Date(Date.now() - Math.floor(Math.random() * 5 * 24 * 60 * 60 * 1000)),
          latitude: addRandomOffset(city.lat, 0.04),
          longitude: addRandomOffset(city.lng, 0.04),
          locationLabel: `${city.name} area`,
          imagePath: "dummy/spotting.png",
        },
      });

      totalSpottings++;
    }
  }

  process.stdout.write(
    `\n✓ Seeded ${totalReports} lost pet reports across ${cities.length} cities\n`
  );
  process.stdout.write(
    `✓ Seeded ${totalSpottings} spottings across ${cities.length} cities\n`
  );
  process.stdout.write(
    `\nRegional distribution:\n`
  );
  process.stdout.write(`  Southeast: HIGHEST concentration (${cities.filter(c => c.region === "Southeast").map(c => c.name).join(", ")})\n`);
  process.stdout.write(`  Northeast: MODERATE concentration (${cities.filter(c => c.region === "Northeast").map(c => c.name).join(", ")})\n`);
  process.stdout.write(`  Southwest: LESS concentration (${cities.filter(c => c.region === "Southwest").map(c => c.name).join(", ")})\n`);
  process.stdout.write(`  West Coast: VERY LITTLE concentration (${cities.filter(c => c.region === "West Coast").map(c => c.name).join(", ")})\n`);
  process.stdout.write(
    `\nStart your dev server and zoom out on the map to see the density grid!\n`
  );
} catch (error) {
  process.stderr.write(`Error seeding data: ${error.message}\n`);
  process.exit(1);
} finally {
  await adapter.$disconnect();
  await pool.end();
}
