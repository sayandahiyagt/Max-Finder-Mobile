import { spawnSync } from "node:child_process";
import path from "node:path";

const seedScript = path.join(
  process.cwd(),
  "scripts",
  "seed-map-duluth-demo-data.mjs",
);

describe("Duluth map demo seeder", () => {
  it("previews a Duluth public-place cluster without connecting to the database", () => {
    const result = spawnSync(
      process.execPath,
      [seedScript, "--dry-run", "--json"],
      { encoding: "utf8" },
    );

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      totalPoints: 600,
      lostReports: 300,
      spottings: 300,
      city: "Duluth, GA",
      publicPlaceAnchors: [
        { landmark: "Duluth Town Green", address: "3167 Main St, Duluth, GA 30096" },
        { landmark: "Bunten Road Park", address: "3180 Bunten Rd, Duluth, GA 30096" },
        { landmark: "McDaniel Farm Park", address: "3251 McDaniel Rd, Duluth, GA 30096" },
      ],
      petPhotoVariants: 8,
    });
  });

  it("rejects odd counts and counts outside the supported range", () => {
    for (const invalidCount of [99, 101, 2002]) {
      const result = spawnSync(
        process.execPath,
        [seedScript, "--points", String(invalidCount), "--dry-run"],
        { encoding: "utf8" },
      );

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("even whole number from 100 to 2000");
    }
  });
});
