import "server-only";

import {
  countCommunityActivity,
  findMapActivity,
  findRecentSpottingCandidates,
} from "./repository";
import {
  rankRelatedSpottings,
  type LostPetMatchInput,
} from "./matching";
import { defaultMapSearchFilters } from "./types";
import type {
  CommunityActivityCounts,
  MapActivity,
  MapBounds,
  MapSearchFilters,
} from "./types";

export function searchMapActivity(
  bounds: MapBounds,
  filters: MapSearchFilters = defaultMapSearchFilters,
): Promise<MapActivity> {
  return findMapActivity(bounds, filters);
}

export async function findRelatedSpottings(report: LostPetMatchInput) {
  const candidates = await findRecentSpottingCandidates(100);
  return rankRelatedSpottings(report, candidates);
}

export function getCommunityActivityCounts(): Promise<CommunityActivityCounts> {
  return countCommunityActivity();
}
