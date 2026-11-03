import { chmodSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import {
  developmentApiUrl,
  developmentMediaEnvironmentFile,
  developmentProjectRef,
} from "./cloud-development-config.mjs";

try {
  const npmCli = process.env.npm_execpath;
  if (!npmCli) {
    throw new Error(
      "Run this command through npm run db:dev:media-configure.",
    );
  }
  const result = spawnSync(
    process.execPath,
    [
      npmCli,
      "exec",
      "--",
      "supabase",
      "projects",
      "api-keys",
      "--project-ref",
      developmentProjectRef,
      "-o",
      "json",
    ],
    { encoding: "utf8" },
  );
  if (result.error) {
    throw new Error(
      `Could not start the Supabase CLI (${result.error.code ?? "unknown error"}).`,
    );
  }
  if (result.status !== 0) {
    const detail = `${result.stderr ?? ""}\n${result.stdout ?? ""}`;
    if (/access token|not logged in|login/i.test(detail)) {
      throw new Error(
        "Supabase CLI is not logged in. Run 'npx supabase login', then retry; your account also needs access to the development project.",
      );
    }
    throw new Error(
      `Could not retrieve development API keys from Supabase CLI (exit ${result.status ?? "unknown"}). Check CLI access to project ${developmentProjectRef}.`,
    );
  }
  const keys = JSON.parse(result.stdout);
  const serviceRoleKey = keys.find((key) => key.name === "service_role")?.api_key;
  if (!serviceRoleKey) {
    throw new Error("The development service-role key was unavailable.");
  }

  const values = {
    SUPABASE_URL: developmentApiUrl,
    SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
  };
  writeFileSync(
    developmentMediaEnvironmentFile,
    Object.entries(values)
      .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
      .join("\n") + "\n",
    { mode: 0o600 },
  );
  chmodSync(developmentMediaEnvironmentFile, 0o600);
  process.stdout.write(
    `Configured credentials for the one-off hosted development media migration in ignored ${developmentMediaEnvironmentFile}.\n`,
  );
} catch (error) {
  process.stderr.write(
    error instanceof SyntaxError
      ? "Invalid development configuration response.\n"
      : `${error.message}\n`,
  );
  process.exit(1);
}
