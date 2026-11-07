import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const databaseUrl = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

process.stdout.write("Connecting to local Supabase database...\n");

const pool = new pg.Pool({ connectionString: databaseUrl });
const adapter = new PrismaClient({
  adapter: new PrismaPg(pool),
});

try {
  // Find the demo user
  const demoUser = await adapter.user.findUnique({
    where: { email: "demo-heatmap@example.com" },
  });

  if (demoUser) {
    process.stdout.write("Found demo user, clearing old data...\n");

    // First, get all pets owned by demo user
    const demoPets = await adapter.pet.findMany({
      where: { ownerId: demoUser.userId },
      select: { id: true },
    });

    const petIds = demoPets.map((pet) => pet.id);

    // Delete lost pet reports first (they reference pets)
    const deletedReports = await adapter.lostPetReport.deleteMany({
      where: { petId: { in: petIds } },
    });

    // Delete pet images
    const deletedImages = await adapter.petImage.deleteMany({
      where: { petId: { in: petIds } },
    });

    // Now delete the pets
    const deletedPets = await adapter.pet.deleteMany({
      where: { ownerId: demoUser.userId },
    });

    // Delete all spottings with the dummy image
    const deletedSpottings = await adapter.spotting.deleteMany({
      where: { imagePath: "dummy/spotting.png" },
    });

    process.stdout.write(
      `✓ Deleted ${deletedReports.count} reports\n`
    );
    process.stdout.write(
      `✓ Deleted ${deletedImages.count} pet images\n`
    );
    process.stdout.write(
      `✓ Deleted ${deletedPets.count} pets\n`
    );
    process.stdout.write(`✓ Deleted ${deletedSpottings.count} spottings\n`);
    process.stdout.write("\nOld demo data cleared. Now run the seed script again.\n");
  } else {
    process.stdout.write("No demo user found. Nothing to clear.\n");
  }
} catch (error) {
  process.stderr.write(`Error clearing data: ${error.message}\n`);
  process.exit(1);
} finally {
  await adapter.$disconnect();
  await pool.end();
}
