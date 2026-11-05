
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const isWindows = process.platform === "win32";

const expectedContext = isWindows
  ? "podman-maxfinder-local"
  : "colima-maxfinder-local";

const context = spawnSync("docker", ["context", "show"], {
  encoding: "utf8",
});

if (context.status !== 0) {
  process.stderr.write(context.stderr || "Docker is unavailable.\n");
  process.exit(context.status ?? 1);
}

if (context.stdout.trim() !== expectedContext) {
  process.stderr.write(
    `Refusing Supabase CLI command. Select the isolated Docker context '${expectedContext}' first.\n`,
  );
  process.exit(2);
}

// On Windows, retrieve the Docker API endpoint from the
// selected Podman context for the Supabase CLI.
let windowsDockerHost;

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
    windowsDockerHost = JSON.parse(inspected.stdout)[0]
      ?.Endpoints?.docker?.Host;
  } catch {
    windowsDockerHost = undefined;
  }

  if (!windowsDockerHost) {
    process.stderr.write(
      "Could not determine the Podman Docker API endpoint.\n",
    );
    process.exit(2);
  }
}

// Invoke Supabase using the appropriate platform command.
function runSupabase(args, options = {}) {
  if (isWindows) {
    return spawnSync(
      process.env.ComSpec || "cmd.exe",
      ["/d", "/c", `supabase.cmd ${args.join(" ")}`],
      {
        ...options,
        env: {
          ...process.env,
          DOCKER_HOST: windowsDockerHost,
        },
      },
    );
  }

  return spawnSync("supabase", args, options);
}

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

if (
  !allowedCommands.some(
    (allowed) =>
      allowed.length === args.length &&
      allowed.every((value, index) => value === args[index]),
  )
) {
  process.stderr.write(
    "Refusing Supabase CLI command. Only local stack commands, an explicit local database reset, and local migration listing are allowed.\n",
  );
  process.exit(2);
}

if (args[0] === "status") {
  const status = runSupabase(["status", "-o", "env"], {
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
    process.stderr.write(
      "Supabase status did not confirm loopback services.\n",
    );
    process.exit(2);
  }

  const databasePort = new URL(databaseUrl).port;

  process.stdout.write(
    `Local Supabase API: ${apiUrl}\nLocal PostgreSQL port: ${databasePort}\n`,
  );

  process.exit(0);
}

const command = runSupabase(args, { stdio: "inherit" });

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
