import { parseMapRequest } from "@/app/api/map/request";

describe("parseMapRequest", () => {
  it("rejects requests without viewport bounds instead of querying globally", () => {
    expect(parseMapRequest(new URLSearchParams())).toEqual({
      ok: false,
      error: "Invalid map bounds.",
    });
  });

  it("parses map bounds and all supported filters", () => {
    const params = new URLSearchParams(
      "minLat=40.7&maxLat=40.8&minLng=-74.1&maxLng=-73.9&activityType=spotted&species=Cat&breed=Domestic%20Short&timeRangeDays=7&centerLatitude=40.71&centerLongitude=-74&radiusMiles=5",
    );

    expect(parseMapRequest(params)).toEqual({
      ok: true,
      value: {
        bounds: { minLat: 40.7, maxLat: 40.8, minLng: -74.1, maxLng: -73.9 },
        filters: {
          activityType: "spotted",
          species: "Cat",
          breed: "Domestic Short",
          timeRangeDays: 7,
          center: { latitude: 40.71, longitude: -74 },
          radiusMiles: 5,
        },
      },
    });
  });

  it("accepts unwrapped world bounds reported by Leaflet", () => {
    const params = new URLSearchParams(
      "minLat=-85&maxLat=85&minLng=-1125&maxLng=1125",
    );

    expect(parseMapRequest(params)).toMatchObject({
      ok: true,
      value: {
        bounds: {
          minLat: -85,
          maxLat: 85,
          minLng: -1125,
          maxLng: 1125,
        },
      },
    });
  });
  it.each([
    ["maxLat=", "Invalid map bounds."],
    ["minLat=20&maxLat=10", "Invalid map bounds."],
    ["activityType=messages", "Invalid activity type."],
    ["species=" + "a".repeat(51), "Map filter is too long."],
    ["timeRangeDays=0", "Invalid time range."],
    ["centerLatitude=40.7&radiusMiles=5", "Invalid radius search."],
    [
      "centerLatitude=40.7&centerLongitude=-74&radiusMiles=3",
      "Invalid radius search.",
    ],
  ])("rejects %s", (query, error) => {
    const params = new URLSearchParams(
      "minLat=40.7&maxLat=40.8&minLng=-74.1&maxLng=-73.9",
    );
    new URLSearchParams(query).forEach((value, key) => params.set(key, value));

    expect(parseMapRequest(params)).toEqual({
      ok: false,
      error,
    });
  });
});
