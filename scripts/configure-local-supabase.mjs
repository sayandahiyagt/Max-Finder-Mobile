
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

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
    dockerHost = JSON.parse(inspected.stdout)[0]?.Endpoints?.docker?.Host;
  } catch {
    dockerHost = undefined;
  }

  if (!dockerHost) {
    process.stderr.write("Could not determine the Podman Docker API endpoint.\n");
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
    status.stderr || "Could not read local Supabase configuration.\n",
  );
  process.exit(status.status ?? 1);
}

const values = Object.fromEntries(
  [...status.stdout.matchAll(/^([A-Z_]+)="([^"]*)"\s*$/gm)].map(
    ([, key, value]) => [key, value],
  ),
);

const url = values.API_URL;
const publishableKey = values.PUBLISHABLE_KEY || values.ANON_KEY;
const serviceKey = values.SERVICE_ROLE_KEY;
const databaseUrl = values.DB_URL;

if (
  !url ||
  !/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/)/.test(url) ||
  !publishableKey ||
  !serviceKey
) {
  process.stderr.write(
    "Local Supabase did not return the expected loopback URL and keys.\n",
  );
  process.exit(1);
}

if (
  !databaseUrl ||
  !/^postgres(?:ql)?:\/\/[^@/]+@(?:localhost|127\.0\.0\.1):\d+\//.test(
    databaseUrl,
  )
) {
  process.stderr.write(
    "Local Supabase did not return a loopback PostgreSQL URL.\n",
  );
  process.exit(1);
}

const localConfig = [
  `NEXT_PUBLIC_SUPABASE_URL=${url}`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${publishableKey}`,
  `SUPABASE_SERVICE_ROLE_KEY=${serviceKey}`,
  `DATABASE_URL=${databaseUrl}`,
  "",
].join("\n");

if (!existsSync(".env.local")) {
  writeFileSync(".env.local", localConfig, { mode: 0o600 });
  process.stdout.write(
    "Wrote local Supabase settings to ignored .env.local.\n",
  );
  process.exit(0);
}

const existing = readFileSync(".env.local", "utf8");
const existingUrl = existing.match(/^NEXT_PUBLIC_SUPABASE_URL=(.*)$/m)?.[1];
const existingDatabaseUrl = existing.match(/^DATABASE_URL=(.*)$/m)?.[1];

if (!existingUrl || existingUrl !== url) {
  process.stderr.write(
    "Refusing to update .env.local because its Supabase URL is not local.\n",
  );
  process.exit(2);
}

if (existingDatabaseUrl && existingDatabaseUrl !== databaseUrl) {
  process.stderr.write(
    "Refusing to update .env.local because its database URL is not local.\n",
  );
  process.exit(2);
}

const updated = existingDatabaseUrl
  ? existing
  : `${existing.trimEnd()}\nDATABASE_URL=${databaseUrl}\n`;

writeFileSync(".env.local", updated, { mode: 0o600 });

process.stdout.write(
  existingDatabaseUrl
    ? "Local Supabase settings are already configured in ignored .env.local.\n"
    : "Added the local database URL to ignored .env.local.\n",
);
