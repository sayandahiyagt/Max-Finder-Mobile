import {
  getSingleRequestLongitudeBounds,
  getVisibleLongitudeRanges,
} from "@/features/search/map-bounds";

describe("getVisibleLongitudeRanges", () => {
  it("keeps an ordinary viewport longitude range", () => {
    expect(getVisibleLongitudeRanges({ minLng: -74.1, maxLng: -73.9 })).toEqual([
      { minLng: -74.1, maxLng: -73.9 },
    ]);
  });

  it("splits a viewport that crosses the eastern date line", () => {
    expect(getVisibleLongitudeRanges({ minLng: 170, maxLng: 200 })).toEqual([
      { minLng: 170, maxLng: 180 },
      { minLng: -180, maxLng: -160 },
    ]);
  });

  it("splits a viewport that crosses the western date line", () => {
    expect(getVisibleLongitudeRanges({ minLng: -200, maxLng: -170 })).toEqual([
      { minLng: 160, maxLng: 180 },
      { minLng: -180, maxLng: -170 },
    ]);
  });

  it("uses the full longitude range when the viewport spans the world", () => {
    expect(getVisibleLongitudeRanges({ minLng: -1125, maxLng: 1125 })).toEqual([
      { minLng: -180, maxLng: 180 },
    ]);
  });
});

describe("getSingleRequestLongitudeBounds", () => {
  it("keeps ordinary longitude bounds unchanged", () => {
    expect(getSingleRequestLongitudeBounds({ minLng: -74.1, maxLng: -73.9 })).toEqual({
      minLng: -74.1,
      maxLng: -73.9,
    });
  });

  it("normalizes a full-world view for the map API", () => {
    expect(getSingleRequestLongitudeBounds({ minLng: -1125, maxLng: 1125 })).toEqual({
      minLng: -180,
      maxLng: 180,
    });
  });

  it("covers both sides when the view crosses the date line", () => {
    expect(getSingleRequestLongitudeBounds({ minLng: 170, maxLng: 200 })).toEqual({
      minLng: -180,
      maxLng: 180,
    });
  });
});