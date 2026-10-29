const EARTH_RADIUS_MILES = 3959;
const DAY_IN_MS = 86_400_000;
const MATCH_WINDOW_DAYS = 30;
const MINIMUM_MATCH_SCORE = 45;

export type LostPetMatchInput = {
  species: string | null;
  breed: string | null;
  weightRange: string | null;
  description: string | null;
  latitude: number;
  longitude: number;
  lastSeenAt: string;
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

export type RelatedSpotting = {
  spotting: SpottingCandidate;
  score: number;
  distanceMiles: number;
  factors: string[];
};

const STOP_WORDS = new Set([
  "and",
  "the",
  "with",
  "from",
  "near",
  "seen",
  "pet",
  "dog",
  "cat",
]);

function normalizeText(value: string | null): string {
  return value?.trim().toLowerCase() ?? "";
}

function getDescriptionTokens(value: string | null): Set<string> {
  return new Set(
    normalizeText(value)
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length >= 3 && !STOP_WORDS.has(token)),
  );
}

function countSharedTokens(
  first: Set<string>,
  second: Set<string>,
): number {
  return [...first].filter((token) => second.has(token)).length;
}

function milesBetween(
  first: { latitude: number; longitude: number },
  second: { latitude: number; longitude: number },
): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

  const latitudeDelta = toRadians(second.latitude - first.latitude);
  const longitudeDelta = toRadians(second.longitude - first.longitude);
  const firstLatitude = toRadians(first.latitude);
  const secondLatitude = toRadians(second.latitude);

  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return (
    EARTH_RADIUS_MILES *
    2 *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
}

function getCharacteristicMatch(
  report: LostPetMatchInput,
  spotting: SpottingCandidate,
): { score: number; factors: string[] } | null {
  const reportSpecies = normalizeText(report.species);
  const spottingSpecies = normalizeText(spotting.species);

  // Exclude candidates with different known species.
  if (
    reportSpecies &&
    spottingSpecies &&
    reportSpecies !== spottingSpecies
  ) {
    return null;
  }

  let score = 0;
  const factors: string[] = [];

  if (reportSpecies && reportSpecies === spottingSpecies) {
    score += 35;
    factors.push("Same species");
  }

  const reportBreed = normalizeText(report.breed);
  const spottingBreed = normalizeText(spotting.breed);

  if (
    reportBreed &&
    spottingBreed &&
    (reportBreed === spottingBreed ||
      reportBreed.includes(spottingBreed) ||
      spottingBreed.includes(reportBreed))
  ) {
    score += 25;
    factors.push("Breed matches");
  }

  const reportSize = normalizeText(report.weightRange);
  const spottingSize = normalizeText(spotting.weightRange);

  if (reportSize && spottingSize && reportSize === spottingSize) {
    score += 15;
    factors.push("Similar size");
  }

  const reportDescription = getDescriptionTokens(report.description);
  const spottingDescription = getDescriptionTokens(
    [
      spotting.description,
      spotting.distinguishingCharacteristics,
    ]
      .filter(Boolean)
      .join(" "),
  );

  const sharedTokens = countSharedTokens(
    reportDescription,
    spottingDescription,
  );

  if (sharedTokens >= 2) {
    score += Math.min(20, sharedTokens * 4);
    factors.push("Description has similar details");
  }

  // Require at least one matching characteristic.
  return score > 0 ? { score, factors } : null;
}

function addLocationScore(
  distanceMiles: number,
  factors: string[],
): number {
  if (distanceMiles <= 1) {
    factors.push("Nearby location");
    return 20;
  }

  if (distanceMiles <= 5) {
    factors.push("Within 5 miles");
    return 12;
  }

  if (distanceMiles <= 15) {
    factors.push("Within 15 miles");
    return 5;
  }

  return 0;
}

function addTimeScore(
  lastSeenAt: string,
  spottedAt: string,
  factors: string[],
): number {
  const lastSeen = new Date(lastSeenAt).getTime();
  const spotted = new Date(spottedAt).getTime();
  const elapsed = spotted - lastSeen;
  const withinTimeWindow = MATCH_WINDOW_DAYS * DAY_IN_MS;

  if (
    Number.isFinite(elapsed) &&
    elapsed >= 0 &&
    elapsed <= withinTimeWindow
  ) {
    factors.push("Seen after the pet went missing");
    return 10;
  }

  return 0;
}

function scoreSpotting(
  report: LostPetMatchInput,
  spotting: SpottingCandidate,
): RelatedSpotting | null {
  const characteristicMatch = getCharacteristicMatch(report, spotting);

  if (!characteristicMatch) return null;

  const factors = [...characteristicMatch.factors];
  const distanceMiles = milesBetween(report, spotting);

  const score =
    characteristicMatch.score +
    addLocationScore(distanceMiles, factors) +
    addTimeScore(report.lastSeenAt, spotting.spottedAt, factors);

  if (score < MINIMUM_MATCH_SCORE) return null;

  return {
    spotting,
    score,
    distanceMiles,
    factors,
  };
}

export function rankRelatedSpottings(
  report: LostPetMatchInput,
  candidates: readonly SpottingCandidate[],
  limit = 4,
): RelatedSpotting[] {
  return candidates
    .flatMap((spotting) => {
      const result = scoreSpotting(report, spotting);
      return result ? [result] : [];
    })
    .sort(
      (first, second) =>
        second.score - first.score ||
        first.distanceMiles - second.distanceMiles,
    )
    .slice(0, limit);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function optionalString(
  record: Record<string, unknown>,
  key: string,
): string | null {
  const value = record[key];

  return typeof value === "string" && value.trim()
    ? value.trim()
    : null;
}

function parseSpottingCandidate(
  value: unknown,
): SpottingCandidate | null {
  if (!isRecord(value)) return null;

  const id = optionalString(value, "id");
  const spottedAt = optionalString(value, "spotted_at");
  const latitude = Number(value.latitude);
  const longitude = Number(value.longitude);

  if (
    !id ||
    !spottedAt ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Number.isNaN(new Date(spottedAt).getTime())
  ) {
    return null;
  }

  return {
    id,
    species: optionalString(value, "species"),
    breed: optionalString(value, "breed"),
    weightRange: optionalString(value, "weight_range"),
    description: optionalString(value, "description"),
    distinguishingCharacteristics: optionalString(
      value,
      "distinguishing_characteristics",
    ),
    latitude,
    longitude,
    spottedAt,
    locationLabel: optionalString(value, "location_label"),
    imagePath: optionalString(value, "image_path"),
  };
}

export function parseSpottingCandidates(
  rows: readonly unknown[],
): SpottingCandidate[] {
  return rows.flatMap((row) => {
    const spotting = parseSpottingCandidate(row);
    return spotting ? [spotting] : [];
  });
}