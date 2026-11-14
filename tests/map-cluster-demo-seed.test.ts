import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";

const seedScript = path.join(
  process.cwd(),
  "scripts",
  "seed-map-cluster-demo-data.mjs",
);

describe("map cluster demo seeder", () => {
  it("reads its database URL from .env.local and rejects non-local databases", async () => {
    const source = await import("node:fs/promises").then(({ readFile }) =>
      readFile(seedScript, "utf8"),
    );

    expect(source).toContain('getLocalDatabaseUrl()');
    expect(source).not.toMatch(/postgres(?:ql)?:\/\/[^\s"']+/);
    expect(source).not.toContain("pooler.supabase.com");
    const helper = await import("node:fs/promises").then(({ readFile }) =>
      readFile(path.join(process.cwd(), "scripts", "helpers", "local-database-url.mjs"), "utf8"),
    );
    expect(helper).toContain('readFileSync(envFilePath, "utf8")');
    expect(helper).toContain('parsed.port !== "54322"');
  });

  it("runs exactly 2,000 cluster points from the standard local reset wrapper", async () => {
    const source = await import("node:fs/promises").then(({ readFile }) =>
      readFile(path.join(process.cwd(), "scripts", "local-supabase.mjs"), "utf8"),
    );

    expect(source).toMatch(
      /new URL\("\.\/seed-map-cluster-demo-data\.mjs", import\.meta\.url\)[\s\S]*?"--points",\s*"2000"/,
    );
    expect(source).toContain("if (isStandardDatabaseReset && command.status === 0)");
    const packageJson = await import("node:fs/promises").then(({ readFile }) =>
      readFile(path.join(process.cwd(), "package.json"), "utf8"),
    );
    const { scripts } = JSON.parse(packageJson) as { scripts: Record<string, string> };
    expect(scripts["db:reset"]).toContain("local-supabase.mjs db reset --local --yes");
  });

  it.each([100, 500, 1000, 2000])(
    "previews exactly %i points without connecting to the database",
    (points) => {
      const result = spawnSync(
        process.execPath,
        [seedScript, "--points", String(points), "--dry-run", "--json"],
        { encoding: "utf8" },
      );

      expect(result.status).toBe(0);
      const summary: unknown = JSON.parse(result.stdout);
      expect(summary).toMatchObject({
        totalPoints: points,
        lostReports: Math.ceil(points / 2),
        spottings: Math.floor(points / 2),
        cities: 222,
        clusterCenters: 252,
        neighborhoodAnchors: 252,
        regionalCounts: {
          south: Math.round(points * 0.7),
          west: Math.floor(points * 0.15),
          northeast: points - Math.round(points * 0.7) - Math.floor(points * 0.15),
        },
        redBlueCountsByRegion: expect.any(Object),
        statesByRegion: expect.any(Object),
        pointsByState: expect.any(Object),
        locationsByState: expect.any(Object),
        redOnlyClustersByRegion: expect.any(Object),
        blueOnlyClustersByRegion: expect.any(Object),
        redBlueClusterDistancesMilesByState: expect.any(Object),
        uniqueAnchorCoordinates: 250,
        uniquePointCoordinates: points,
        petPhotoVariants: 8,
      });

      const parsedSummary = summary as {
        clusterCenterSpacingMiles: { minimum: number; maximum: number };
        redBlueCountsByRegion: Record<string, { lostReports: number; spottings: number }>;
        statesByRegion: Record<string, string[]>;
        pointsByState: Record<string, Record<string, { lostReports: number; spottings: number }>>;
        lostReports: number;
        spottings: number;
        uniquePointCoordinates: number;
        locationsByState: Record<string, Record<string, number>>;
        redOnlyClustersByRegion: Record<string, Record<string, { lostReports: number; spottings: number }>>;
        blueOnlyClustersByRegion: Record<string, Record<string, { lostReports: number; spottings: number }>>;
        redBlueClusterDistancesMilesByState: Record<string, number>;
      };
      expect(parsedSummary.clusterCenterSpacingMiles.minimum).toBeGreaterThan(0.1);
      expect(parsedSummary.clusterCenterSpacingMiles.maximum).toBeLessThan(20);
      expect(parsedSummary.lostReports).toBe(Math.ceil(points / 2));
      expect(parsedSummary.spottings).toBe(Math.floor(points / 2));
      expect(parsedSummary.uniquePointCoordinates).toBe(points);
      for (const counts of Object.values(parsedSummary.redBlueCountsByRegion)) {
        expect(counts.lostReports).toBe(counts.spottings);
      }
      expect(parsedSummary.redBlueCountsByRegion.south).toEqual({
        lostReports: Math.round(Math.ceil(points / 2) * 0.7),
        spottings: Math.round(Math.floor(points / 2) * 0.7),
      });
      expect(parsedSummary.redBlueCountsByRegion.west).toEqual({
        lostReports: Math.floor(Math.ceil(points / 2) * 0.15),
        spottings: Math.floor(Math.floor(points / 2) * 0.15),
      });
      const redOnlyClusters = Object.values(parsedSummary.redOnlyClustersByRegion)
        .flatMap((regionClusters) => Object.values(regionClusters));
      expect(redOnlyClusters.length).toBeGreaterThan(0);
      expect(redOnlyClusters.every(
        (cluster) => cluster.lostReports > 0 && cluster.spottings === 0,
      )).toBe(true);
      const blueOnlyClusters = Object.values(parsedSummary.blueOnlyClustersByRegion)
        .flatMap((regionClusters) => Object.values(regionClusters));
      expect(blueOnlyClusters.length).toBeGreaterThan(0);
      expect(blueOnlyClusters.every(
        (cluster) => cluster.spottings > 0 && cluster.lostReports === 0,
      )).toBe(true);
      expect(Math.min(...Object.values(parsedSummary.redBlueClusterDistancesMilesByState)))
        .toBeGreaterThan(10);
      expect(parsedSummary.statesByRegion.south).toEqual(
        expect.arrayContaining(["TX", "GA", "FL", "NC", "VA"]),
      );
      expect(parsedSummary.statesByRegion.west).toEqual(
        expect.arrayContaining(["WA", "OR", "CA", "NV", "AZ", "CO", "UT", "NM"]),
      );
      expect(parsedSummary.statesByRegion.northeast).toEqual(
        expect.arrayContaining(["NY", "PA", "MD", "CT", "RI", "ME"]),
      );
      for (const region of ["south", "west", "northeast"]) {
        const pointsInRegion = Object.values(parsedSummary.pointsByState[region] ?? {})
          .reduce((total, count) => total + count.lostReports + count.spottings, 0);
        expect(pointsInRegion).toBe(
          parsedSummary.redBlueCountsByRegion[region]!.lostReports +
            parsedSummary.redBlueCountsByRegion[region]!.spottings,
        );
        if (points >= 500) {
          for (const state of parsedSummary.statesByRegion[region] ?? []) {
            const counts = parsedSummary.pointsByState[region]?.[state];
            expect(counts).toBeDefined();
            expect(parsedSummary.locationsByState[region]?.[state]).toBeGreaterThanOrEqual(1);
            expect(counts!.lostReports).toBeGreaterThan(0);
            expect(counts!.spottings).toBeGreaterThan(0);
          }
        }
      }
    },
  );

  it("rejects counts outside the supported 100 to 3,000 range", () => {
    const result = spawnSync(
      process.execPath,
      [seedScript, "--points", "99", "--dry-run"],
      { encoding: "utf8" },
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("from 100 to 3000");
  });

  it("renders all map activity as individual markers at every zoom level", async () => {
    const source = await readFile(
      path.join(process.cwd(), "src", "components", "map-point-layer.tsx"),
      "utf8",
    );
    expect(source).toContain("drawOrder.map((report)");
    expect(source).toContain("<MapReportMarker key={report.id} report={report} zoom={zoom} />");
    expect(source).toContain('Number(left.type === "lost") - Number(right.type === "lost")');
    expect(source).not.toMatch(/cluster|count badge|groupMapReports/i);
  });
});
