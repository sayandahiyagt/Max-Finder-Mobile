import type { FoundReportSummary } from "@/features/lost-pets/types";
import { isRecord } from "@/lib/record";

export type ReunionReport = {
  id: string;
  petName: string;
  species: string;
  breed: string | null;
  color: string;
  description: string | null;
  locationLabel: string | null;
  imageUrl: string | null;
  lastSeenAt: string;
  reunitedAt: string;
};

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function parseReunion(value: unknown): ReunionReport | null {
  if (!isRecord(value)) return null;
  const {
    id,
    petName,
    species,
    breed,
    color,
    description,
    locationLabel,
    imageUrl,
    lastSeenAt,
    reunitedAt,
  } = value;
  if (
    typeof id !== "string" ||
    !id ||
    typeof petName !== "string" ||
    !petName.trim() ||
    typeof species !== "string" ||
    typeof color !== "string" ||
    !isNullableString(breed) ||
    !isNullableString(description) ||
    !isNullableString(locationLabel) ||
    !isNullableString(imageUrl) ||
    typeof lastSeenAt !== "string" ||
    !Number.isFinite(Date.parse(lastSeenAt)) ||
    typeof reunitedAt !== "string" ||
    !Number.isFinite(Date.parse(reunitedAt))
  ) {
    return null;
  }
  return {
    id,
    petName,
    species,
    breed,
    color,
    description,
    locationLabel,
    imageUrl,
    lastSeenAt,
    reunitedAt,
  };
}

export function parseReunionResponse(value: unknown): ReunionReport[] | null {
  if (!isRecord(value) || !Array.isArray(value.reunions)) return null;
  const reunions = value.reunions.map(parseReunion);
  if (reunions.some((reunion) => reunion === null)) return null;
  return reunions.filter((reunion): reunion is ReunionReport => reunion !== null);
}

export function formatReunion(
  report: FoundReportSummary,
  imageUrl: string | null,
): ReunionReport {
  return {
    id: report.id,
    petName: report.petName,
    species: report.species,
    breed: report.breed,
    color: report.color,
    description: report.description,
    locationLabel: report.locationLabel,
    imageUrl,
    lastSeenAt: report.lastSeenAt.toISOString(),
    reunitedAt: report.reunitedAt.toISOString(),
  };
}
