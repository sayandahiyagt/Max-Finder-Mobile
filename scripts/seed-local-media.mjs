
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { DEMO_PHOTOS, getDemoCatalogPath } from "./map-demo-content.mjs";

const isWindows = process.platform === "win32";

const expectedContext = isWindows
  ? "podman-maxfinder-local"
  : "colima-maxfinder-local";

const context = spawnSync("docker", ["context", "show"], {
  encoding: "utf8",
});

if (
  context.status !== 0 ||
  context.stdout.trim() !== expectedContext
) {
  process.stderr.write(
    `Select the isolated '${expectedContext}' Docker context first.\n`,
  );
  process.exit(2);
}

let dockerHost;

if (isWindows) {
  const inspected = spawnSync(
    "docker",
    ["context", "inspect", expectedContext],
    { encoding: "utf8" },
  );

  if (inspected.status !== 0) {
    process.stderr.write(
      inspected.stderr || "Could not inspect the Podman context.\n",
    );
    process.exit(inspected.status ?? 1);
  }

  try {
    dockerHost = JSON.parse(inspected.stdout)[0]
      ?.Endpoints?.docker?.Host;
  } catch {
    dockerHost = undefined;
  }

  if (!dockerHost) {
    process.stderr.write(
      "Could not determine the Podman Docker API endpoint.\n",
    );
    process.exit(2);
  }
}

function runSupabase(args) {
  if (isWindows) {
    return spawnSync(
      process.env.ComSpec || "cmd.exe",
      ["/d", "/c", `supabase.cmd ${args.join(" ")}`],
      {
        encoding: "utf8",
        env: {
          ...process.env,
          DOCKER_HOST: dockerHost,
        },
      },
    );
  }

  return spawnSync("supabase", args, {
    encoding: "utf8",
  });
}

const status = runSupabase(["status", "-o", "env"]);

if (status.status !== 0) {
  process.stderr.write(
    status.stderr || "Could not read local Supabase status.\n",
  );
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
  process.stderr.write(
    "Local Supabase did not return required settings.\n",
  );
  process.exit(2);
}

let api;
let database;

try {
  api = new URL(apiUrl);
  database = new URL(databaseUrl);
} catch {
  process.stderr.write(
    "Local Supabase returned an invalid service URL.\n",
  );
  process.exit(2);
}

if (
  !["127.0.0.1", "localhost"].includes(api.hostname) ||
  api.port !== "54321" ||
  !["127.0.0.1", "localhost"].includes(database.hostname) ||
  database.port !== "54322"
) {
  process.stderr.write(
    "Refusing to seed media outside the local stack.\n",
  );
  process.exit(2);
}

const supabase = createClient(apiUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function listStoredFiles(bucketName, prefix) {
  const bucket = supabase.storage.from(bucketName);
  const entries = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await bucket.list(prefix, {
      limit: 1000,
      offset,
    });
    if (error) throw error;
    entries.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) break;
  }

  const nestedFiles = await Promise.all(
    entries.map(async (entry) => {
      const objectPath = `${prefix}/${entry.name}`;
      return entry.id
        ? [objectPath]
        : listStoredFiles(bucketName, objectPath);
    }),
  );
  return nestedFiles.flat();
}

async function clearGeneratedPetPhotos(prefix) {
  const paths = await listStoredFiles("pet-images", prefix);
  const bucket = supabase.storage.from("pet-images");
  for (let offset = 0; offset < paths.length; offset += 100) {
    const { error } = await bucket.remove(paths.slice(offset, offset + 100));
    if (error) throw error;
  }
}

// These reserved prefixes contain only synthetic demo profile photos.
// Clearing them before a local reset keeps random-ID seeding from leaving old
// objects behind after PostgreSQL replaces its rows.
await clearGeneratedPetPhotos("demo-map/pets");
await clearGeneratedPetPhotos("demo-clusters/pets");

const assetDirectory = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "assets",
  "demo-pet-photos",
);
const photoBlobs = new Map();

for (const photo of DEMO_PHOTOS) {
  const bytes = await readFile(path.join(assetDirectory, photo.fileName));
  const blob = new Blob([new Uint8Array(bytes)], { type: "image/jpeg" });
  photoBlobs.set(photo.id, blob);

  for (const bucketName of ["pet-images", "spotting-images"]) {
    const { error } = await supabase.storage
      .from(bucketName)
      .upload(getDemoCatalogPath(photo), blob, {
        cacheControl: "3600",
        contentType: "image/jpeg",
        upsert: true,
      });
    if (error) {
      throw new Error(`Could not upload local demo photo ${photo.id}.`);
    }
  }
}

const seedObjects = [
  {
    bucket: "pet-images",
    path: "00000000-0000-4000-8000-000000000101/pets/mochi.jpg",
    image: photoBlobs.get("cat-tabby"),
  },
  {
    bucket: "spotting-images",
    path: "dummy/spotting.jpg",
    image: photoBlobs.get("dog-camera"),
  },
];

for (const object of seedObjects) {
  const { error } = await supabase.storage
    .from(object.bucket)
    .upload(object.path, object.image, {
      cacheControl: "3600",
      contentType: "image/jpeg",
      upsert: true,
    });

  if (error) throw new Error("Could not seed canonical local pet photos.");
}

process.stdout.write(
  `Seeded ${DEMO_PHOTOS.length} real pet-photo variants in local Supabase Storage.\n`,
);
