import { spawnSync } from "node:child_process";
import statusParser from "./local-supabase-status-values.cjs";

const { parseLocalSupabaseStatus } = statusParser;
export { parseLocalSupabaseStatus };

// Restrict storage helpers to the isolated local engine used by this project.
export function getLocalSupabaseCredentials() {
  const isWindows = process.platform === "win32";
  const expectedContext = isWindows
    ? "podman-maxfinder-local"
    : "colima-maxfinder-local";
  const context = spawnSync("docker", ["context", "show"], {
    encoding: "utf8",
  });

  if (context.status !== 0 || context.stdout.trim() !== expectedContext) {
    throw new Error(
      `Select the isolated '${expectedContext}' Docker context first.`,
    );
  }

  let dockerHost;
  if (isWindows) {
    const inspected = spawnSync(
      "docker",
      ["context", "inspect", expectedContext],
      { encoding: "utf8" },
    );
    if (inspected.status !== 0) {
      throw new Error(
        inspected.stderr || "Could not inspect the Podman context.",
      );
    }

    try {
      dockerHost = JSON.parse(inspected.stdout)[0]?.Endpoints?.docker?.Host;
    } catch {
      dockerHost = undefined;
    }
    if (!dockerHost) {
      throw new Error("Could not determine the Podman Docker API endpoint.");
    }
  }

  const runSupabase = (args) => {
    if (isWindows) {
      return spawnSync(
        process.env.ComSpec || "cmd.exe",
        ["/d", "/c", `supabase.cmd ${args.join(" ")}`],
        {
          encoding: "utf8",
          env: { ...process.env, DOCKER_HOST: dockerHost },
        },
      );
    }
    return spawnSync("supabase", args, { encoding: "utf8" });
  };

  const status = runSupabase(["status", "-o", "env"]);
  if (status.status !== 0) {
    throw new Error(status.stderr || "Could not read local Supabase status.");
  }

  const values = Object.fromEntries(
    [...status.stdout.matchAll(/^([A-Z_]+)="([^"]*)"\s*$/gm)].map(
      ([, key, value]) => [key, value],
    ),
  );

  return parseLocalSupabaseStatus(values);
}
