import { spawnSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import {
  developmentApiUrl,
  developmentProjectRef,
  readDevelopmentMediaEnvironment,
} from "./cloud-development-config.mjs";

const environment = readDevelopmentMediaEnvironment();

function readImageLocations() {
  const sql = `select coalesce(json_agg(json_build_object(
      'path', image.storage_path,
      'sourceExists', source.id is not null,
      'destinationExists', destination.id is not null
    ) order by image.storage_path), '[]'::json) as images
    from public.pet_images image
    left join storage.objects source
      on source.bucket_id = 'lost-pet-images'
      and source.name = image.storage_path
    left join storage.objects destination
      on destination.bucket_id = 'pet-images'
      and destination.name = image.storage_path`;
  const result = spawnSync("npm", [
    "exec", "--", "supabase", "db", "query", "--linked",
    "--project-ref", developmentProjectRef, "--output", "json", sql,
  ], { encoding: "utf8", timeout: 120_000 });
  if (result.status !== 0) {
    throw new Error("Could not inspect development Pet Profile image locations.");
  }

  try {
    const response = JSON.parse(result.stdout);
    const images = response.rows?.[0]?.images;
    if (!Array.isArray(images)) throw new Error();
    return images;
  } catch {
    throw new Error("Could not read development Pet Profile image locations.");
  }
}

const images = readImageLocations();
if (images.some((image) => image.sourceExists && image.destinationExists)) {
  throw new Error("A Pet Profile image exists in both buckets; resolve the duplicate before moving files.");
}
if (images.some((image) => !image.sourceExists && !image.destinationExists)) {
  throw new Error("A Pet Profile image object is missing; no Storage objects were moved.");
}

const client = createClient(
  developmentApiUrl,
  environment.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);
let moved = 0;
for (const image of images) {
  if (!image.sourceExists) continue;
  const { error } = await client.storage
    .from("lost-pet-images")
    .move(image.path, image.path, { destinationBucket: "pet-images" });
  if (error) throw new Error("A development Pet Profile image could not be moved.");
  moved += 1;
}

const remaining = readImageLocations();
if (remaining.some((image) => !image.destinationExists || image.sourceExists)) {
  throw new Error("Development Pet Profile image verification failed after the move.");
}
process.stdout.write(`Moved ${moved} referenced Pet Profile image(s) into the private development bucket; verified ${remaining.length} image reference(s).\n`);
