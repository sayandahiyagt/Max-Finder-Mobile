import { chmodSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import {
  cloudEnvironmentFile, developmentApiUrl, developmentProjectRef,
  readCloudEnvironment, validateDevelopmentDatabase,
} from "./cloud-development-config.mjs";

try {
  const databaseUrl = validateDevelopmentDatabase(readCloudEnvironment().DATABASE_URL);
  const result = spawnSync("npm", ["exec", "--", "supabase", "projects", "api-keys", "--project-ref", developmentProjectRef, "-o", "json"], { encoding: "utf8" });
  if (result.status !== 0) throw new Error("Could not retrieve development API keys. Check Supabase CLI login.");
  const keys = JSON.parse(result.stdout);
  const publicKey = keys.find((key) => key.type === "publishable")?.api_key
    ?? keys.find((key) => key.name === "anon")?.api_key;
  const serverKey = keys.find((key) => key.name === "service_role")?.api_key;
  if (!publicKey || !serverKey) throw new Error("Development API keys were unavailable.");
  const values = {
    DATABASE_URL: databaseUrl,
    NEXT_PUBLIC_SUPABASE_URL: developmentApiUrl,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publicKey,
    SUPABASE_SERVICE_ROLE_KEY: serverKey,
  };
  chmodSync(cloudEnvironmentFile, 0o600);
  writeFileSync(cloudEnvironmentFile, Object.entries(values).map(([key, value]) => `${key}=${JSON.stringify(value)}`).join("\n") + "\n", { mode: 0o600 });
  process.stdout.write("Configured hosted development in ignored .env.cloud-development. Local settings were retained.\n");
} catch (error) {
  // Only controlled messages are printed; provider output can include credentials.
  process.stderr.write(error instanceof SyntaxError ? "Invalid development configuration response.\n" : `${error.message}\n`);
  process.exit(1);
}
