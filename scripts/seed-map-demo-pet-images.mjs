// Copies the locally stored CC0 photo catalog to one private object per demo
// pet, matching the existing one-image-per-pet data model.

import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { DEMO_PHOTO_BY_ID, getDemoCatalogPath } from "./map-demo-content.mjs";
import { getLocalSupabaseCredentials } from "./helpers/local-supabase-status.mjs";
import { getLocalDatabaseUrl } from "./helpers/local-database-url.mjs";

const DEMO_PET_IMAGE_PREFIXES = ["demo-map/pets/", "demo-clusters/pets/"];
const COPY_CONCURRENCY = 12;

async function main() {
  const credentials = getLocalSupabaseCredentials();
  const supabase = createClient(
    credentials.apiUrl,
    credentials.serviceRoleKey,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
  const pool = new pg.Pool({ connectionString: getLocalDatabaseUrl() });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const images = await prisma.petImage.findMany({
      where: {
        OR: DEMO_PET_IMAGE_PREFIXES.map((prefix) => ({
          storagePath: { startsWith: prefix },
        })),
      },
      select: { storagePath: true },
    });

    let copied = 0;
    let alreadyPresent = 0;
    const failures = [];
    const bucket = supabase.storage.from("pet-images");

    for (let offset = 0; offset < images.length; offset += COPY_CONCURRENCY) {
      const batch = images.slice(offset, offset + COPY_CONCURRENCY);
      const results = await Promise.all(
        batch.map(async ({ storagePath }) => {
          const photoId = storagePath.split("/")[2];
          const photo = photoId ? DEMO_PHOTO_BY_ID.get(photoId) : undefined;
          if (!photo) {
            return {
              kind: "failed",
              message: `Unknown photo key in generated path '${storagePath}'.`,
            };
          }

          const { error } = await bucket.copy(
            getDemoCatalogPath(photo),
            storagePath,
          );
          if (!error) return { kind: "copied" };
          if (
            Number(error.statusCode) === 409 ||
            /already exists|duplicate/i.test(error.message)
          ) {
            return { kind: "present" };
          }
          return { kind: "failed", message: error.message };
        }),
      );

      for (const result of results) {
        if (result.kind === "copied") copied += 1;
        else if (result.kind === "present") alreadyPresent += 1;
        else failures.push(result.message);
      }

      if ((offset + batch.length) % 120 === 0 || offset + batch.length === images.length) {
        process.stdout.write(
          `Prepared ${offset + batch.length} of ${images.length} private pet photos...\n`,
        );
      }
    }

    if (failures.length > 0) {
      throw new Error(
        `Could not create ${failures.length} pet photo objects. First error: ${failures[0]}`,
      );
    }

    process.stdout.write(
      `Prepared ${copied} private pet photo objects; ${alreadyPresent} were already present.\n`,
    );
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  process.stderr.write(
    `Could not prepare local demo pet photos: ${error?.message ?? error}\n`,
  );
  process.exitCode = 1;
});
