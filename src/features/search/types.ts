export const mapActivityTypes = ["all", "lost", "spotted"] as const;
export type MapActivityType = (typeof mapActivityTypes)[number];
const mapActivityTypeSet: ReadonlySet<string> = new Set(mapActivityTypes);

export function isMapActivityType(value: unknown): value is MapActivityType {
  return typeof value === "string" && mapActivityTypeSet.has(value);
}

export const mapTimeRanges = ["any", "1", "7", "30"] as const;
export type MapTimeRange = (typeof mapTimeRanges)[number];
const mapTimeRangeSet: ReadonlySet<string> = new Set(mapTimeRanges);

export function isMapTimeRange(value: unknown): value is MapTimeRange {
  return typeof value === "string" && mapTimeRangeSet.has(value);
}

export const mapTimeRangeDays = [1, 7, 30] as const;
const mapTimeRangeDaySet: ReadonlySet<number> = new Set(mapTimeRangeDays);

export function isMapTimeRangeDays(
  value: number,
): value is (typeof mapTimeRangeDays)[number] {
  return mapTimeRangeDaySet.has(value);
}

export const mapRadiusMiles = [1, 5, 10, 25] as const;
export type MapRadiusMiles = (typeof mapRadiusMiles)[number];
const mapRadiusMilesSet: ReadonlySet<number> = new Set(mapRadiusMiles);

export function isMapRadiusMiles(value: number): value is MapRadiusMiles {
  return mapRadiusMilesSet.has(value);
}

export type MapUiFilters = {
  activityType: MapActivityType;
  species: string;
  breed: string;
  timeRange: MapTimeRange;
};

export const defaultMapUiFilters: MapUiFilters = {
  activityType: "all",
  species: "",
  breed: "",
  timeRange: "any",
};

export type MapReport = {
  id: string;
  type: "lost" | "spotted";
  name: string;
  species: string | null;
  breed: string | null;
  locationLabel: string | null;
  imageUrl: string | null;
  timestamp: string;
  position: [number, number];
};

export type MapPinCounts = {
  reports: number;
  spottings: number;
};

export type MapExplorerProps = {
  locationRequest?: number;
  onCountsChange?: (counts: MapPinCounts) => void;
  onLocationChange?: (position: [number, number]) => void;
  onLocationError?: (message: string) => void;
  searchLocation?: [number, number] | null;
  radiusMiles?: MapRadiusMiles | null;
  filters?: MapUiFilters;
};

export type MapSearchFilters = {
  activityType: MapActivityType;
  species: string;
  breed: string;
  timeRangeDays: number | null;
  center: { latitude: number; longitude: number } | null;
  radiusMiles: MapRadiusMiles | null;
};

export type MapSearchReport = {
  id: string;
  petName: string;
  species: string;
  breed: string | null;
  lastSeenAt: Date;
  latitude: number;
  longitude: number;
  locationLabel: string;
  imagePath: string | null;
};

export type MapSearchSpotting = {
  id: string;
  species: string | null;
  breed: string | null;
  spottedAt: Date;
  latitude: number;
  longitude: number;
  locationLabel: string;
  imagePath: string;
};

export type MapActivity = {
  reports: MapSearchReport[];
  spottings: MapSearchSpotting[];
};

export type CommunityActivityCounts = {
  lost: number;
  found: number;
  spottings: number;
};

export type SpottingCandidate = {
  id: string;
  species: string | null;
  breed: string | null;
  weightRange: string | null;
  description: string | null;
  distinguishingCharacteristics: string | null;
  latitude: number;
  longitude: number;
  spottedAt: string;
  locationLabel: string | null;
  imagePath: string | null;
};

export type MapBounds = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

export const defaultMapSearchFilters: MapSearchFilters = {
  activityType: "all",
  species: "",
  breed: "",
  timeRangeDays: null,
  center: null,
  radiusMiles: null,
};
