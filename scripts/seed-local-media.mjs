import { spawnSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { assertLocalDockerContext } from "./helpers/local-docker-context.mjs";

assertLocalDockerContext();

const status = spawnSync("supabase", ["status", "-o", "env"], {
  encoding: "utf8",
});
if (status.status !== 0) {
  process.stderr.write("Could not read local Supabase status.\n");
  process.exit(status.status ?? 1);
}

const values = Object.fromEntries(
  [...status.stdout.matchAll(/^([A-Z_]+)="([^"]*)"\s*$/gm)].map(
    ([, key, value]) => [key, value],
  ),
);
const apiUrl = values.API_URL;
const databaseUrl = values.DB_URL;
const serviceRoleKey = values.SERVICE_ROLE_KEY;
if (!apiUrl || !databaseUrl || !serviceRoleKey) {
  process.stderr.write("Local Supabase did not return required settings.\n");
  process.exit(2);
}

let api;
let database;
try {
  api = new URL(apiUrl);
  database = new URL(databaseUrl);
} catch {
  process.stderr.write("Local Supabase returned an invalid service URL.\n");
  process.exit(2);
}
if (
  !["127.0.0.1", "localhost"].includes(api.hostname) ||
  api.port !== "54321" ||
  !["127.0.0.1", "localhost"].includes(database.hostname) ||
  database.port !== "54322"
) {
  process.stderr.write("Refusing to seed media outside the local stack.\n");
  process.exit(2);
}

const supabase = createClient(apiUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const image = new Blob(
  [
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC",
      "base64",
    ),
  ],
  { type: "image/png" },
);
const seedObjects = [
  {
    bucket: "pet-images",
    path: "00000000-0000-4000-8000-000000000101/pets/mochi.png",
  },
  { bucket: "spotting-images", path: "dummy/spotting.png" },
];

for (const object of seedObjects) {
  const { error } = await supabase.storage
    .from(object.bucket)
    .upload(object.path, image, {
      cacheControl: "3600",
      contentType: "image/png",
      upsert: true,
    });
  if (error) {
    process.stderr.write("Could not seed local synthetic image data.\n");
    process.exit(1);
  }
}

process.stdout.write("Seeded two synthetic images in local Supabase Storage.\n");
