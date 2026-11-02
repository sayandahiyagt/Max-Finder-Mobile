export type DeviceLocation = [latitude: number, longitude: number];

type GeolocationApi = Pick<Geolocation, "getCurrentPosition">;

export function getCurrentDeviceLocation(
  geolocation: GeolocationApi | null =
    typeof navigator === "undefined" ? null : navigator.geolocation ?? null,
): Promise<DeviceLocation> {
  if (!geolocation) return Promise.reject(new Error("Location unavailable."));

  return new Promise((resolve, reject) => {
    geolocation.getCurrentPosition(
      ({ coords }) => resolve([coords.latitude, coords.longitude]),
      () => reject(new Error("Location unavailable.")),
      { enableHighAccuracy: false, maximumAge: 300000, timeout: 10000 },
    );
  });
}
