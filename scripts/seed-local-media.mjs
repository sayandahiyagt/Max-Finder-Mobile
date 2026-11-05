
import { spawnSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

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
  {
    bucket: "spotting-images",
    path: "dummy/spotting.png",
  },
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
    process.stderr.write(
      "Could not seed local synthetic image data.\n",
    );
    process.exit(1);
  }
}

process.stdout.write(
  "Seeded two synthetic images in local Supabase Storage.\n",
);
