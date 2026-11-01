export type Coordinates = {
  latitude: number;
  longitude: number;
};

export function distanceInMiles(
  first: Coordinates,
  second: Coordinates,
  earthRadiusMiles: number,
): number {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = radians(second.latitude - first.latitude);
  const longitudeDelta = radians(second.longitude - first.longitude);
  const firstLatitude = radians(first.latitude);
  const secondLatitude = radians(second.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;
  return (
    earthRadiusMiles *
    2 *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
}

export function parseCoordinates(
  latitudeValue: unknown,
  longitudeValue: unknown,
): Coordinates | null {
  if (
    (typeof latitudeValue !== "number" && typeof latitudeValue !== "string") ||
    (typeof longitudeValue !== "number" &&
      typeof longitudeValue !== "string") ||
    String(latitudeValue).trim() === "" ||
    String(longitudeValue).trim() === ""
  )
    return null;

  const latitude = Number(latitudeValue);
  const longitude = Number(longitudeValue);
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }
  return { latitude, longitude };
}
