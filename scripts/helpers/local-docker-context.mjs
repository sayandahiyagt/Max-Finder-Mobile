import { spawnSync } from "node:child_process";

const expectedContext =
  process.platform === "win32" ? "desktop-linux" : "colima-maxfinder-local";

export function assertLocalDockerContext() {
  const context = spawnSync("docker", ["context", "show"], {
    encoding: "utf8",
  });
  if (context.status === 0 && context.stdout.trim() === expectedContext) {
    return;
  }

  process.stderr.write(
    `Select the local Docker context '${expectedContext}' first.\n`,
  );
  process.exit(2);
}
