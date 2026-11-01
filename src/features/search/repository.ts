import "server-only";

import type { Prisma } from "@prisma/client";
import { getPrismaClient } from "@/lib/db/client";
import { distanceInMiles } from "@/lib/coordinates";
import type {
  MapActivity,
  MapBounds,
  MapSearchFilters,
  SpottingCandidate,
} from "./types";

const MAP_EARTH_RADIUS_MILES = 3958.8;
type LocatedRecord = {
  latitude: number | Prisma.Decimal;
  longitude: number | Prisma.Decimal;
};

function withinRadius<T extends LocatedRecord>(
  records: T[],
  center: MapSearchFilters["center"],
  radiusMiles: number | null,
) {
  if (!center || radiusMiles === null) return records;
  return records.filter(
    (record) =>
      distanceInMiles(
        {
          latitude: Number(record.latitude),
          longitude: Number(record.longitude),
        },
        center,
        MAP_EARTH_RADIUS_MILES,
      ) <= radiusMiles,
  );
}

function searchCoordinates(
  bounds: MapBounds,
  filters: MapSearchFilters,
): MapBounds | null {
  if (!filters.center || !filters.radiusMiles) return bounds;

  const latitudeDelta = filters.radiusMiles / 68.5;
  const minLatitude = Math.max(-90, filters.center.latitude - latitudeDelta);
  const maxLatitude = Math.min(90, filters.center.latitude + latitudeDelta);
  const farthestLatitude = Math.max(
    Math.abs(minLatitude),
    Math.abs(maxLatitude),
  );
  const latitudeRadians = (farthestLatitude * Math.PI) / 180;
  const longitudeDelta = Math.min(
    360,
    filters.radiusMiles /
      (68.5 * Math.max(Math.abs(Math.cos(latitudeRadians)), 0.000001)),
  );
  const minLongitude = filters.center.longitude - longitudeDelta;
  const maxLongitude = filters.center.longitude + longitudeDelta;
  const crossesDateLine = minLongitude < -180 || maxLongitude > 180;
  const result = {
    minLat: minLatitude,
    maxLat: maxLatitude,
    minLng: crossesDateLine ? -180 : minLongitude,
    maxLng: crossesDateLine ? 180 : maxLongitude,
  };
  return result.minLat > result.maxLat || result.minLng > result.maxLng
    ? null
    : result;
}

function coordinatesWhere(bounds: MapBounds) {
  return {
    latitude: { gte: bounds.minLat, lte: bounds.maxLat },
    longitude: { gte: bounds.minLng, lte: bounds.maxLng },
  };
}

export async function findMapActivity(
  bounds: MapBounds,
  filters: MapSearchFilters,
): Promise<MapActivity> {
  const prisma = getPrismaClient();
  const queryBounds = searchCoordinates(bounds, filters);
  if (!queryBounds) return { reports: [], spottings: [] };
  const coordinates = coordinatesWhere(queryBounds);
  const since =
    filters.timeRangeDays === null
      ? undefined
      : new Date(Date.now() - filters.timeRangeDays * 86_400_000);
  const species = filters.species.trim();
  const breed = filters.breed.trim();
  const animalFilters = {
    ...(species
      ? { species: { equals: species, mode: "insensitive" as const } }
      : {}),
    ...(breed
      ? { breed: { contains: breed, mode: "insensitive" as const } }
      : {}),
  };
  const reportWhere = {
    status: "LOST",
    ...coordinates,
    ...(species || breed ? { pet: { is: animalFilters } } : {}),
    ...(since ? { lastSeenAt: { gte: since } } : {}),
  };
  const spottingWhere = {
    ...coordinates,
    ...animalFilters,
    ...(since ? { spottedAt: { gte: since } } : {}),
  };
  const [reports, spottings] = await Promise.all([
    filters.activityType === "spotted"
      ? Promise.resolve([])
      : prisma.lostPetReport.findMany({
          where: reportWhere,
          select: {
            id: true,
            lastSeenAt: true,
            latitude: true,
            longitude: true,
            locationLabel: true,
            pet: {
              select: {
                name: true,
                species: true,
                breed: true,
                profileImage: { select: { storagePath: true } },
              },
            },
          },
        }),
    filters.activityType === "lost"
      ? Promise.resolve([])
      : prisma.spotting.findMany({
          where: spottingWhere,
          select: {
            id: true,
            species: true,
            breed: true,
            spottedAt: true,
            latitude: true,
            longitude: true,
            locationLabel: true,
            imagePath: true,
          },
        }),
  ]);
  const reportsInRadius = withinRadius(
    reports,
    filters.center,
    filters.radiusMiles,
  );
  const spottingsInRadius = withinRadius(
    spottings,
    filters.center,
    filters.radiusMiles,
  );
  return {
    reports: reportsInRadius.map((report) => ({
      id: report.id,
      petName: report.pet.name,
      species: report.pet.species,
      breed: report.pet.breed,
      lastSeenAt: report.lastSeenAt,
      latitude: Number(report.latitude),
      longitude: Number(report.longitude),
      locationLabel: report.locationLabel,
      imagePath: report.pet.profileImage?.storagePath ?? null,
    })),
    spottings: spottingsInRadius.map((spotting) => ({
      id: spotting.id,
      species: spotting.species,
      breed: spotting.breed,
      spottedAt: spotting.spottedAt,
      latitude: Number(spotting.latitude),
      longitude: Number(spotting.longitude),
      locationLabel: spotting.locationLabel,
      imagePath: spotting.imagePath,
    })),
  };
}

export async function findRecentSpottingCandidates(
  limit: number,
): Promise<SpottingCandidate[]> {
  const rows = await getPrismaClient().spotting.findMany({
    orderBy: { spottedAt: "desc" },
    take: limit,
    select: {
      id: true,
      species: true,
      breed: true,
      weightRange: true,
      description: true,
      distinguishingCharacteristics: true,
      spottedAt: true,
      latitude: true,
      longitude: true,
      locationLabel: true,
      imagePath: true,
    },
  });
  return rows.map((row) => ({
    id: row.id,
    species: row.species,
    breed: row.breed,
    weightRange: row.weightRange,
    description: row.description,
    distinguishingCharacteristics: row.distinguishingCharacteristics,
    spottedAt: row.spottedAt.toISOString(),
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    locationLabel: row.locationLabel,
    imagePath: row.imagePath,
  }));
}

export async function countCommunityActivity() {
  const prisma = getPrismaClient();
  const [lost, found, spottings] = await Promise.all([
    prisma.lostPetReport.count({ where: { status: "LOST" } }),
    prisma.lostPetReport.count({ where: { status: "FOUND" } }),
    prisma.spotting.count(),
  ]);
  return { lost, found, spottings };
}
