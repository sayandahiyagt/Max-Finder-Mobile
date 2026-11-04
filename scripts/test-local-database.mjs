import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { assertLocalDockerContext } from "./helpers/local-docker-context.mjs";

assertLocalDockerContext();

let envFile;
try {
  envFile = readFileSync(".env.local", "utf8");
} catch {
  process.stderr.write(
    "Run 'npm run db:configure' to create local settings first.\n",
  );
  process.exit(2);
}

const databaseUrl = envFile.match(/^DATABASE_URL=(.*)$/m)?.[1];
const supabaseUrl = envFile.match(/^NEXT_PUBLIC_SUPABASE_URL=(.*)$/m)?.[1];
const supabaseKey = envFile.match(
  /^NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=(.*)$/m,
)?.[1];
const serviceRoleKey = envFile.match(/^SUPABASE_SERVICE_ROLE_KEY=(.*)$/m)?.[1];
if (!databaseUrl || !supabaseUrl || !supabaseKey || !serviceRoleKey) {
  process.stderr.write(
    "Local database and Supabase settings are missing from .env.local.\n",
  );
  process.exit(2);
}
const parsedDatabaseUrl = new URL(databaseUrl);
if (
  !["127.0.0.1", "localhost"].includes(parsedDatabaseUrl.hostname) ||
  parsedDatabaseUrl.port !== "54322"
) {
  process.stderr.write(
    "Refusing to run database tests unless DATABASE_URL targets local Supabase.\n",
  );
  process.exit(2);
}
const parsedSupabaseUrl = new URL(supabaseUrl);
if (
  !["127.0.0.1", "localhost"].includes(parsedSupabaseUrl.hostname) ||
  parsedSupabaseUrl.port !== "54321"
) {
  process.stderr.write(
    "Refusing to run database tests unless Supabase Auth and Data API use local port 54321.\n",
  );
  process.exit(2);
}

const jest = resolve("node_modules/jest/bin/jest.js");
const result = spawnSync(
  process.execPath,
  [
    jest,
    "--runInBand",
    "tests/auth-lifecycle-db.test.ts",
    "tests/identity-db.test.ts",
    "tests/lost-pets-db.test.ts",
    "tests/communication-db.test.ts",
    "tests/security-rls.test.ts",
    "tests/media-audit.test.ts",
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      TEST_SUPABASE_URL: supabaseUrl,
      TEST_SUPABASE_KEY: supabaseKey,
      TEST_SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
    },
  },
);
if (result.error) {
  process.stderr.write(`${result.error.message}\n`);
  process.exit(1);
}
process.exit(result.status ?? 1);
