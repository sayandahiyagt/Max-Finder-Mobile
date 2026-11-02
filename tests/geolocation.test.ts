import { getCurrentDeviceLocation } from "@/lib/geolocation";

describe("device location integration", () => {
  it("returns coordinates from the browser API", async () => {
    const getCurrentPosition = jest.fn((success: PositionCallback) => {
      success({
        coords: {
          latitude: 40.7,
          longitude: -74,
          accuracy: 10,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
          toJSON: () => ({}),
        },
        timestamp: 0,
        toJSON: () => ({}),
      });
    });

    await expect(
      getCurrentDeviceLocation({ getCurrentPosition }),
    ).resolves.toEqual([40.7, -74]);
    expect(getCurrentPosition).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      { enableHighAccuracy: false, maximumAge: 300000, timeout: 10000 },
    );
  });

  it("rejects when location is unsupported or denied", async () => {
    await expect(getCurrentDeviceLocation(null)).rejects.toThrow(
      "Location unavailable.",
    );
    await expect(
      getCurrentDeviceLocation({
        getCurrentPosition(_success, failure) {
          failure?.({
            code: 1,
            message: "Permission denied.",
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2,
            TIMEOUT: 3,
          });
        },
      }),
    ).rejects.toThrow("Location unavailable.");
  });
});
