import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

// Use local Supabase connection
// Make sure to run `npm run db:start` before running this script
const databaseUrl = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

process.stdout.write("Connecting to local Supabase database...\n");

const pool = new pg.Pool({ connectionString: databaseUrl });
const adapter = new PrismaClient({
  adapter: new PrismaPg(pool),
});

// Major US cities for demonstration
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

const colors = ["Black", "Brown", "White", "Golden", "Gray", "Orange", "Tan", "Mixed"];
const sizes = ["small", "medium", "large"];

function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function addRandomOffset(coord, maxOffset = 0.05) {
  return coord + (Math.random() - 0.5) * maxOffset;
}

try {
  // First check if demo user already exists
  let demoUser = await adapter.user.findUnique({
    where: { email: "demo-heatmap@example.com" },
  });

  if (!demoUser) {
    // Create a user in Supabase Auth first via direct database insert
    // This is safe for local development seeding
    await adapter.$queryRaw`
      INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        confirmation_token,
        recovery_token
      ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        '00000000-0000-4000-8000-000000000099'::uuid,
        'authenticated',
        'authenticated',
        'demo-heatmap@example.com',
        crypt('demo-password-123', gen_salt('bf')),
        now(),
        now(),
        now(),
        '',
        ''
      )
      ON CONFLICT (id) DO NOTHING
      RETURNING id
    `;

    // Now create the application user
    demoUser = await adapter.user.upsert({
      where: { email: "demo-heatmap@example.com" },
      create: {
        authProviderId: "00000000-0000-4000-8000-000000000099",
        email: "demo-heatmap@example.com",
        displayName: "Demo User",
        role: "USER",
      },
      update: {},
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
      // HIGHEST - 6-8 reports per city
      reportCount = 7;
      spottingCount = 5;
    } else if (city.region === "Northeast") {
      // MODERATE - 3-4 reports per city
      reportCount = 3;
      spottingCount = 3;
    } else if (city.region === "Southwest") {
      // LESS - 1-2 reports per city
      reportCount = 2;
      spottingCount = 1;
    } else {
      // West Coast - VERY LITTLE - 1 report per city
      reportCount = 1;
      spottingCount = 1;
    }

    // Create lost pet reports
    for (let i = 0; i < reportCount; i++) {
      const species = Math.random() > 0.5 ? "dog" : "cat";
      const breed = species === "dog" ? randomItem(dogBreeds) : randomItem(catBreeds);

      // Create pet
      const pet = await adapter.pet.create({
        data: {
          ownerId: demoUser.userId,
          name: randomItem(petNames),
          species,
          breed,
          color: randomItem(colors),
          size: randomItem(sizes),
          age: Math.floor(Math.random() * 10) + 1,
          description: `A friendly ${species.toLowerCase()} last seen in ${city.name}`,
        },
      });

      // Create lost pet report with slight position variation
      await adapter.lostPetReport.create({
        data: {
          petId: pet.id,
          status: "LOST",
          lastSeenAt: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)),
          latitude: addRandomOffset(city.lat, 0.03),
          longitude: addRandomOffset(city.lng, 0.03),
          locationLabel: `Near ${city.name}`,
          contactMethod: "in_app",
          description: `Lost ${species.toLowerCase()} in the ${city.name} area`,
        },
      });

      totalReports++;
    }

    // Create spottings
    for (let i = 0; i < spottingCount; i++) {
      const species = Math.random() > 0.5 ? "Dog" : "Cat";
      const breed = species === "Dog" ? randomItem(dogBreeds) : randomItem(catBreeds);

      await adapter.spotting.create({
        data: {
          species,
          breed,
          weightRange: randomItem(["Under 10 lbs", "10–25 lbs", "26–50 lbs", "51–75 lbs"]),
          description: `Spotted ${species.toLowerCase()} in ${city.name} area`,
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
  process.stdout.write(`  Southeast: HIGHEST concentration (Atlanta, Miami, Charlotte, Jacksonville, Nashville, Raleigh)\n`);
  process.stdout.write(`  Northeast: MODERATE concentration (New York, Boston, Philadelphia)\n`);
  process.stdout.write(`  Southwest: LESS concentration (Phoenix, Dallas)\n`);
  process.stdout.write(`  West Coast: VERY LITTLE concentration (LA, San Francisco)\n`);
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
