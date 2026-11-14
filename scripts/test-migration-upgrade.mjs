import { insertLegacyFixture, verifyMigratedFixture } from "./helpers/legacy-migration-fixture.mjs";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { Client } from "pg";

const expectedContext = "colima-maxfinder-local";
const context = spawnSync("docker", ["context", "show"], {
  encoding: "utf8",
});
if (context.status !== 0 || context.stdout.trim() !== expectedContext) {
  process.stderr.write(
    `Select the isolated '${expectedContext}' Docker context first.\n`,
  );
  process.exit(2);
}

let envFile;
try {
  envFile = readFileSync(".env.local", "utf8");
} catch {
  process.stderr.write("Run 'npm run db:configure' first.\n");
  process.exit(2);
}

const databaseUrl = envFile.match(/^DATABASE_URL=(.*)$/m)?.[1];
if (!databaseUrl) {
  process.stderr.write("DATABASE_URL is missing from .env.local.\n");
  process.exit(2);
}
const database = new URL(databaseUrl);
if (
  !["127.0.0.1", "localhost"].includes(database.hostname) ||
  database.port !== "54322"
) {
  process.stderr.write(
    "Refusing migration test unless DATABASE_URL targets local Supabase PostgreSQL.\n",
  );
  process.exit(2);
}

function supabase(args) {
  const result = spawnSync(
    process.execPath,
    ["scripts/local-supabase.mjs", ...args],
    { stdio: "inherit" },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Guarded local Supabase command failed (${args.join(" ")}).`);
  }
}


let client;
let resetStarted = false;
let failure;
try {
  resetStarted = true;
  supabase([
    "db",
    "reset",
    "--local",
    "--yes",
    "--no-seed",
    "--version",
    "202610150002",
  ]);

  client = new Client({ connectionString: databaseUrl });
  await client.connect();
  await insertLegacyFixture(client);
  await client.end();
  client = undefined;

  supabase(["migration", "up", "--local"]);

  client = new Client({ connectionString: databaseUrl });
  await client.connect();
  await verifyMigratedFixture(client);
  process.stdout.write(
    "Synthetic legacy pets, reports, images, conversations, and messages survived the local alignment migrations.\n",
  );
} catch (error) {
  failure = error;
} finally {
  if (client) await client.end().catch(() => {});
  if (resetStarted) {
    try {
      supabase(["db", "reset", "--local", "--yes"]);
      process.stdout.write(
        "Restored the local database with its synthetic map and cluster demo data.\n",
      );
    } catch (error) {
      failure ??= error;
      process.stderr.write(
        "Could not restore the local database. Run 'npm run db:reset' before using the app.\n",
      );
    }
  }
}

if (failure) {
  process.stderr.write(`${failure.stack ?? failure.message}\n`);
  process.exit(1);
}
