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

const stopWords = new Set([
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

function normalized(value: string | null): string {
  return value?.trim().toLowerCase() ?? "";
}

function descriptionTokens(value: string | null): Set<string> {
  return new Set(
    normalized(value)
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length >= 3 && !stopWords.has(token)),
  );
}

function milesBetween(
  first: { latitude: number; longitude: number },
  second: { latitude: number; longitude: number },
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
  return 3959 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function rankRelatedSpottings(
  report: LostPetMatchInput,
  candidates: readonly SpottingCandidate[],
  limit = 4,
): RelatedSpotting[] {
  const reportSpecies = normalized(report.species);
  const reportBreed = normalized(report.breed);
  const reportDescription = descriptionTokens(report.description);
  const lastSeen = new Date(report.lastSeenAt).getTime();

  return candidates
    .flatMap((spotting) => {
      let score = 0;
      let characteristicScore = 0;
      const factors: string[] = [];
      const spottingSpecies = normalized(spotting.species);

      if (reportSpecies && spottingSpecies && reportSpecies !== spottingSpecies) {
        return [];
      }
      if (reportSpecies && reportSpecies === spottingSpecies) {
        score += 35;
        characteristicScore += 35;
        factors.push("Same species");
      }

      const spottingBreed = normalized(spotting.breed);
      if (
        reportBreed &&
        spottingBreed &&
        (reportBreed === spottingBreed ||
          reportBreed.includes(spottingBreed) ||
          spottingBreed.includes(reportBreed))
      ) {
        score += 25;
        characteristicScore += 25;
        factors.push("Breed matches");
      }

      if (
        report.weightRange &&
        spotting.weightRange &&
        normalized(report.weightRange) === normalized(spotting.weightRange)
      ) {
        score += 15;
        characteristicScore += 15;
        factors.push("Similar size");
      }

      const spottingDescription = descriptionTokens(
        [spotting.description, spotting.distinguishingCharacteristics]
          .filter(Boolean)
          .join(" "),
      );
      const sharedTokens = [...reportDescription].filter((token) =>
        spottingDescription.has(token),
      ).length;
      if (sharedTokens >= 2) {
        const descriptionScore = Math.min(20, sharedTokens * 4);
        score += descriptionScore;
        characteristicScore += descriptionScore;
        factors.push("Description has similar details");
      }

      if (characteristicScore === 0) return [];

      const distanceMiles = milesBetween(report, spotting);
      if (distanceMiles <= 1) {
        score += 20;
        factors.push("Nearby location");
      } else if (distanceMiles <= 5) {
        score += 12;
        factors.push("Within 5 miles");
      } else if (distanceMiles <= 15) {
        score += 5;
        factors.push("Within 15 miles");
      }

      const spottedAt = new Date(spotting.spottedAt).getTime();
      const elapsed = spottedAt - lastSeen;
      if (Number.isFinite(elapsed) && elapsed >= 0 && elapsed <= 30 * 86_400_000) {
        score += 10;
        factors.push("Seen after the pet went missing");
      }

      if (score < 45) return [];
      return [{ spotting, score, distanceMiles, factors }];
    })
    .sort((first, second) =>
      second.score - first.score || first.distanceMiles - second.distanceMiles,
    )
    .slice(0, limit);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function optionalString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function parseSpottingCandidates(rows: readonly unknown[]): SpottingCandidate[] {
  return rows.flatMap((value) => {
    if (!isRecord(value)) return [];
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
      return [];
    }

    return [{
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
    }];
  });
}
