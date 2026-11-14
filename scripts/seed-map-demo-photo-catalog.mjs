// Upload the bundled sample-photo catalog to the verified local Supabase
// buckets without deleting existing synthetic media objects.

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@supabase/supabase-js";
import { DEMO_PHOTOS, getDemoCatalogPath } from "./map-demo-content.mjs";
import { getLocalSupabaseCredentials } from "./helpers/local-supabase-status.mjs";

const credentials = getLocalSupabaseCredentials();
const supabase = createClient(
  credentials.apiUrl,
  credentials.serviceRoleKey,
  { auth: { autoRefreshToken: false, persistSession: false } },
);
const assetDirectory = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "assets",
  "demo-pet-photos",
);

for (const photo of DEMO_PHOTOS) {
  const bytes = await readFile(path.join(assetDirectory, photo.fileName));
  const body = new Blob([new Uint8Array(bytes)], { type: "image/jpeg" });
  const objectPath = getDemoCatalogPath(photo);

  for (const bucketName of ["pet-images", "spotting-images"]) {
    const { error } = await supabase.storage
      .from(bucketName)
      .upload(objectPath, body, {
        cacheControl: "3600",
        contentType: "image/jpeg",
        upsert: true,
      });
    if (error) {
      throw new Error(`Could not upload local demo photo ${photo.id} to ${bucketName}.`);
    }
  }
}

process.stdout.write(
  `Uploaded ${DEMO_PHOTOS.length} bundled sample photos to the local pet and spotting buckets.\n`,
);
