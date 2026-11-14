import { spawnSync } from "node:child_process";
import path from "node:path";

const seedScript = path.join(process.cwd(), "scripts", "seed-map-demo-data.mjs");

describe("base map demo seeder", () => {
  it("previews weighted regional coverage without database access", () => {
    const result = spawnSync(
      process.execPath,
      [seedScript, "--dry-run", "--json"],
      { encoding: "utf8" },
    );

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      totalPoints: 2000,
      lostReports: 1200,
      spottings: 800,
      regionalCounts: {
        southeast: 1202,
        california: 399,
        northeast: 399,
      },
    });
  });
});
