import { distanceInMiles } from "@/lib/coordinates";
import type { SpottingCandidate } from "./types";

export type LostPetMatchInput = {
  species: string | null;
  breed: string | null;
  weightRange: string | null;
  description: string | null;
  latitude: number;
  longitude: number;
  lastSeenAt: string;
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

      if (
        reportSpecies &&
        spottingSpecies &&
        reportSpecies !== spottingSpecies
      ) {
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

      const distanceMiles = distanceInMiles(report, spotting, 3959);
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
      if (
        Number.isFinite(elapsed) &&
        elapsed >= 0 &&
        elapsed <= 30 * 86_400_000
      ) {
        score += 10;
        factors.push("Seen after the pet went missing");
      }

      if (score < 45) return [];
      return [{ spotting, score, distanceMiles, factors }];
    })
    .sort(
      (first, second) =>
        second.score - first.score ||
        first.distanceMiles - second.distanceMiles,
    )
    .slice(0, limit);
}
