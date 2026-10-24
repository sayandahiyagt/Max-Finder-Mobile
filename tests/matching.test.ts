import { rankRelatedSpottings } from "@/lib/matching";

describe("rankRelatedSpottings", () => {
  const report = {
    species: "Dog",
    breed: "Golden Retriever",
    weightRange: "51–75 lbs",
    description: "Golden coat, teal collar, white patch under chin",
    latitude: 40.660204,
    longitude: -73.968956,
    lastSeenAt: "2026-10-21T20:15:00.000Z",
  };

  it("ranks matching characteristics, proximity, and time above weak candidates", () => {
    const results = rankRelatedSpottings(report, [
      {
        id: "weak",
        species: "Cat",
        breed: "Domestic Shorthair",
        weightRange: "10–25 lbs",
        description: "Gray tabby",
        distinguishingCharacteristics: null,
        latitude: 40.73061,
        longitude: -73.935242,
        spottedAt: "2026-10-18T12:00:00.000Z",
        locationLabel: "Queens, NY",
        imagePath: null,
      },
      {
        id: "strong",
        species: "Dog",
        breed: "Golden Retriever",
        weightRange: "51–75 lbs",
        description: "Friendly golden dog with teal collar",
        distinguishingCharacteristics: "Small white patch under the chin",
        latitude: 40.661102,
        longitude: -73.967431,
        spottedAt: "2026-10-21T21:05:00.000Z",
        locationLabel: "Long Meadow, Prospect Park, Brooklyn, NY",
        imagePath: "development-seed/maple.webp",
      },
    ]);

    expect(results).toHaveLength(1);
    expect(results[0]?.spotting.id).toBe("strong");
    expect(results[0]?.factors).toEqual(
      expect.arrayContaining([
        "Same species",
        "Breed matches",
        "Similar size",
        "Nearby location",
        "Seen after the pet went missing",
      ]),
    );
  });

  it("handles missing optional data without producing false matches", () => {
    expect(
      rankRelatedSpottings(
        { ...report, breed: null, weightRange: null, description: null },
        [
          {
            id: "sparse",
            species: null,
            breed: null,
            weightRange: null,
            description: null,
            distinguishingCharacteristics: null,
            latitude: 40.6603,
            longitude: -73.969,
            spottedAt: "2026-10-21T21:00:00.000Z",
            locationLabel: null,
            imagePath: null,
          },
        ],
      ),
    ).toEqual([]);
  });
});
