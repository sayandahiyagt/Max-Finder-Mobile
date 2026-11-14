import { spawnSync } from "node:child_process";
import path from "node:path";

const seedScript = path.join(
  process.cwd(),
  "scripts",
  "seed-map-national-coverage.mjs",
);

describe("national map coverage seeder", () => {
  it("previews regional clusters without database access", () => {
    const result = spawnSync(
      process.execPath,
      [seedScript, "--dry-run", "--json"],
      { encoding: "utf8" },
    );

    expect(result.status).toBe(0);
    const summary: unknown = JSON.parse(result.stdout);
    expect(summary).toMatchObject({
      totalPoints: 12000,
      lostReports: 6000,
      spottings: 6000,
      coverage:
        "weighted public-place clusters in the Southeast, California, and Northeast; two Midwest examples",
      regionalCounts: {
        southeast: 7199,
        california: 2400,
        northeast: 2399,
        midwest: 2,
      },
      bounds: {
        minLatitude: expect.any(Number),
        maxLatitude: expect.any(Number),
        minLongitude: expect.any(Number),
        maxLongitude: expect.any(Number),
      },
    });

    const parsed = summary as {
      regionalCounts: {
        southeast: number;
        california: number;
        northeast: number;
        midwest: number;
      };
      bounds: {
        minLatitude: number;
        maxLatitude: number;
        minLongitude: number;
        maxLongitude: number;
      };
    };
    expect(parsed.regionalCounts.midwest).toBe(2);
    expect(parsed.regionalCounts.southeast).toBeGreaterThan(7000);
    expect(parsed.regionalCounts.california).toBeGreaterThan(2000);
    expect(parsed.regionalCounts.northeast).toBeGreaterThan(2000);
    expect(parsed.bounds.minLatitude).toBeGreaterThan(25);
    expect(parsed.bounds.maxLatitude).toBeLessThan(43);
    expect(parsed.bounds.minLongitude).toBeGreaterThan(-124);
    expect(parsed.bounds.maxLongitude).toBeLessThan(-70);
  });

  it("rejects counts outside the supported 1,000 to 20,000 range", () => {
    const result = spawnSync(
      process.execPath,
      [seedScript, "--points", "999", "--dry-run"],
      { encoding: "utf8" },
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("from 1000 to 20000");
  });
});
