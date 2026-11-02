import { readFileSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { parseEnv } from "node:util";
import { Client } from "pg";
import { insertLegacyFixture, verifyMigratedFixture } from "./helpers/legacy-migration-fixture.mjs";

const context = spawnSync("docker", ["context", "show"], { encoding: "utf8" });
if (context.status !== 0 || context.stdout.trim() !== "colima-maxfinder-local") {
  throw new Error("Select the isolated colima-maxfinder-local Docker context first.");
}
const local = parseEnv(readFileSync(".env.local", "utf8"));
const url = new URL(local.DATABASE_URL);
if (!['localhost', '127.0.0.1'].includes(url.hostname) || url.port !== '54322') {
  throw new Error("The schema rehearsal requires the isolated local database.");
}
const schema = readFileSync("tmp/cloud-development-audit/schema.sql", "utf8");
const scratchName = `maxfinder_rehearsal_${Date.now()}`;
function administratorSql(sql) {
  const result = spawnSync("docker", ["exec", "-i", "supabase_db_Max-Finder-Mobile", "psql", "-U", "supabase_admin", "-d", scratchName, "-v", "ON_ERROR_STOP=1"], {
    input: sql, encoding: "utf8", maxBuffer: 10 * 1024 * 1024,
  });
  if (result.status !== 0) throw new Error(result.stderr || "Isolated schema restore failed.");
}
const admin = new Client({ connectionString: url.href });
let scratch;
let created = false;
try {
  await admin.connect();
  await admin.query(`CREATE DATABASE ${scratchName}`);
  created = true;
  url.pathname = `/${scratchName}`;
  scratch = new Client({ connectionString: url.href });
  await scratch.connect();
  administratorSql(schema);
  await insertLegacyFixture(scratch);
  const migrations = readdirSync("supabase/migrations")
    .filter((file) => file.startsWith("20261031") && file.endsWith(".sql")).sort();
  for (const file of migrations) {
    administratorSql(`BEGIN;\n${readFileSync(`supabase/migrations/${file}`, "utf8")}\nCOMMIT;`);
    process.stdout.write(`Rehearsed ${file}\n`);
  }
  await verifyMigratedFixture(scratch);
  process.stdout.write("Hosted development schema accepts the alignment migrations and preserves synthetic legacy records.\n");
} finally {
  if (scratch) await scratch.end();
  if (created) await admin.query(`DROP DATABASE ${scratchName}`);
  await admin.end();
}
