import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { assertLocalDockerContext } from "./helpers/local-docker-context.mjs";

assertLocalDockerContext();

const args = process.argv.slice(2);
if (!args.length) {
  process.stderr.write(
    "Usage: node scripts/local-supabase.mjs <supabase command>\n",
  );
  process.exit(2);
}

const allowedCommands = [
  ["start"],
  ["stop"],
  ["status"],
  ["db", "reset", "--local", "--yes"],
  [
    "db",
    "reset",
    "--local",
    "--yes",
    "--no-seed",
    "--version",
    "202610150002",
  ],
  ["migration", "up", "--local"],
  ["migration", "list", "--local"],
];
if (!allowedCommands.some((allowed) =>
  allowed.length === args.length && allowed.every((value, index) => value === args[index]),
)) {
  process.stderr.write(
    "Refusing Supabase CLI command. Only local stack commands, an explicit local database reset, and local migration listing are allowed.\n",
  );
  process.exit(2);
}

if (args[0] === "status") {
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
  if (
    !apiUrl ||
    !/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/)/.test(apiUrl) ||
    !databaseUrl ||
    !/^postgres(?:ql)?:\/\/[^@/]+@(?:localhost|127\.0\.0\.1):\d+\//.test(
      databaseUrl,
    )
  ) {
    process.stderr.write("Supabase status did not confirm loopback services.\n");
    process.exit(2);
  }
  const databasePort = new URL(databaseUrl).port;
  process.stdout.write(
    `Local Supabase API: ${apiUrl}\nLocal PostgreSQL port: ${databasePort}\n`,
  );
  process.exit(0);
}

const command = spawnSync("supabase", args, { stdio: "inherit" });
if (command.error) {
  process.stderr.write(`${command.error.message}\n`);
  process.exit(1);
}
if (command.status === 0 && args.join(" ") === "db reset --local --yes") {
  const seed = spawnSync(
    process.execPath,
    [fileURLToPath(new URL("./seed-local-media.mjs", import.meta.url))],
    { stdio: "inherit" },
  );
  if (seed.error) {
    process.stderr.write("Could not start local synthetic media seeding.\n");
    process.exit(1);
  }
  process.exit(seed.status ?? 1);
}
process.exit(command.status ?? 1);
