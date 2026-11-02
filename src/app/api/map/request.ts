import type {
  MapBounds,
  MapSearchFilters,
} from "@/features/search/types";
import {
  isMapActivityType,
  isMapRadiusMiles,
  isMapTimeRangeDays,
} from "@/features/search/types";
import { parseCoordinates } from "@/lib/coordinates";

type ParsedMapRequest = {
  bounds: MapBounds;
  filters: MapSearchFilters;
};

export type MapRequestResult =
  | { ok: true; value: ParsedMapRequest }
  | { ok: false; error: string };

function parseNumber(value: string | null) {
  if (value === null || !value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseBounds(params: URLSearchParams): MapBounds | null {
  const minLat = parseNumber(params.get("minLat"));
  const maxLat = parseNumber(params.get("maxLat"));
  const minLng = parseNumber(params.get("minLng"));
  const maxLng = parseNumber(params.get("maxLng"));
  if (
    minLat === null ||
    maxLat === null ||
    minLng === null ||
    maxLng === null ||
    minLat < -90 ||
    maxLat > 90 ||
    minLng < -180 ||
    maxLng > 180 ||
    minLat >= maxLat ||
    minLng >= maxLng
  ) {
    return null;
  }
  return { minLat, maxLat, minLng, maxLng };
}

export function parseMapRequest(params: URLSearchParams): MapRequestResult {
  const bounds = parseBounds(params);
  if (!bounds) {
    return { ok: false, error: "Invalid map bounds." };
  }

  const activityTypeValue = params.get("activityType");
  const activityType =
    activityTypeValue === null
      ? "all"
      : isMapActivityType(activityTypeValue)
        ? activityTypeValue
        : null;
  if (!activityType) {
    return { ok: false, error: "Invalid activity type." };
  }

  const species = params.get("species")?.trim() ?? "";
  const breed = params.get("breed")?.trim() ?? "";
  if (species.length > 50 || breed.length > 100) {
    return { ok: false, error: "Map filter is too long." };
  }

  const timeRangeValue = params.get("timeRangeDays");
  const timeRangeDays = timeRangeValue === null ? null : Number(timeRangeValue);
  if (timeRangeDays !== null && !isMapTimeRangeDays(timeRangeDays)) {
    return { ok: false, error: "Invalid time range." };
  }

  const centerLatitude = params.get("centerLatitude");
  const centerLongitude = params.get("centerLongitude");
  const radiusValue = params.get("radiusMiles");
  let center: MapSearchFilters["center"] = null;
  let radiusMiles: number | null = null;
  if (
    centerLatitude !== null ||
    centerLongitude !== null ||
    radiusValue !== null
  ) {
    center = parseCoordinates(centerLatitude, centerLongitude);
    radiusMiles = radiusValue === null ? null : Number(radiusValue);
    if (
      !center ||
      radiusMiles === null ||
      !isMapRadiusMiles(radiusMiles)
    ) {
      return { ok: false, error: "Invalid radius search." };
    }
  }

  return {
    ok: true,
    value: {
      bounds,
      filters: {
        activityType,
        species,
        breed,
        timeRangeDays,
        center,
        radiusMiles,
      },
    },
  };
}
