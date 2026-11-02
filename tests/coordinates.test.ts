import { distanceInMiles, parseCoordinates } from "@/lib/coordinates";

describe("parseCoordinates", () => {
  it("parses valid numeric strings", () => {
    expect(parseCoordinates("40.7", "-73.9")).toEqual({
      latitude: 40.7,
      longitude: -73.9,
    });
  });

  it.each([
    [null, "-73.9"],
    ["", "-73.9"],
    ["91", "0"],
    ["0", "181"],
    ["NaN", "0"],
  ])("rejects invalid coordinates %p, %p", (latitude, longitude) =>
    expect(parseCoordinates(latitude, longitude)).toBeNull(),
  );
});

describe("distanceInMiles", () => {
  it("returns zero for identical points and a finite distance for separated points", () => {
    const point = { latitude: 40.7, longitude: -73.9 };
    expect(distanceInMiles(point, point, 3958.8)).toBe(0);
    expect(
      distanceInMiles(point, { latitude: 40.8, longitude: -73.9 }, 3958.8),
    ).toBeCloseTo(6.9, 0);
  });
});
