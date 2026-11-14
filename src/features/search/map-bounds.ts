import type { MapBounds } from "./types";

export type MapLongitudeRange = {
  minLng: number;
  maxLng: number;
};

/**
 * Leaflet can report unwrapped longitudes outside [-180, 180] when the map
 * crosses the date line or shows multiple repeated copies of the world.
 * Convert that viewport into the one or two longitude ranges stored in the DB.
 */
export function getVisibleLongitudeRanges(
  bounds: Pick<MapBounds, "minLng" | "maxLng">,
): MapLongitudeRange[] {
  const span = bounds.maxLng - bounds.minLng;
  if (!(span > 0)) return [];
  if (!Number.isFinite(span) || span >= 360) {
    return [{ minLng: -180, maxLng: 180 }];
  }

  if (bounds.minLng >= -180 && bounds.maxLng <= 180) {
    return [{ minLng: bounds.minLng, maxLng: bounds.maxLng }];
  }

  const west = ((((bounds.minLng + 180) % 360) + 360) % 360) - 180;
  const east = west + span;
  if (east <= 180) {
    return [{ minLng: west, maxLng: east }];
  }

  return [
    { minLng: west, maxLng: 180 },
    { minLng: -180, maxLng: east - 360 },
  ];
}

/**
 * The browser map API accepts a single longitude interval. If a view crosses
 * the date line, querying the full world avoids omitting either side.
 */
export function getSingleRequestLongitudeBounds(
  bounds: Pick<MapBounds, "minLng" | "maxLng">,
): MapLongitudeRange {
  const ranges = getVisibleLongitudeRanges(bounds);
  if (ranges.length === 1 && ranges[0]) return ranges[0];
  return { minLng: -180, maxLng: 180 };
}