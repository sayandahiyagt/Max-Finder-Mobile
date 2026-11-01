import { spawnSync } from "node:child_process";
import { developmentProjectRef } from "./cloud-development-config.mjs";

const projectRef = developmentProjectRef;
const commands = {
  migrations: ["migration", "list"],
  plan: ["db", "push", "--dry-run", "--skip-vault"],
};
const [command, ...extra] = process.argv.slice(2);
if (extra.length || !Object.hasOwn(commands, command ?? "")) {
  process.stderr.write("Usage: node scripts/cloud-development.mjs <migrations|plan>\n");
  process.exit(2);
}

const result = spawnSync("npm", [
  "exec", "--", "supabase", ...commands[command], "--project-ref", projectRef,
], { stdio: "inherit" });
if (result.error) process.stderr.write("Could not start Supabase CLI.\n");
process.exit(result.status ?? 1);
