import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { validatedCloudEnvironment } from "./cloud-development-config.mjs";

const [command, ...extra] = process.argv.slice(2);
if (!["dev", "build", "start"].includes(command) || extra.length) {
  process.stderr.write("Usage: node scripts/run-cloud-development.mjs <dev|build|start>\n");
  process.exit(2);
}
let cloud;
try { cloud = validatedCloudEnvironment(); } catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exit(2);
}
const args = [resolve("node_modules/next/dist/bin/next"), command];
if (command !== "build") args.push("--hostname", "127.0.0.1", "--port", "3001");
const child = spawn(process.execPath, args, {
  stdio: "inherit",
  env: { ...process.env, ...cloud, MAXFINDER_CLOUD_DEVELOPMENT: "1" },
});
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
child.on("error", () => { process.stderr.write("Could not start Next.js.\n"); process.exitCode = 1; });
child.on("exit", (code) => { process.exitCode = code ?? 1; });
