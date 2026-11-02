import "server-only";

import type { Prisma } from "@prisma/client";

import type { Coordinates } from "@/lib/coordinates";
import { getPrismaClient } from "@/lib/db/client";
import type { NewSpotting } from "./types";

const spottingDetailFields = {
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
} as const;

type SpottingDetailRow = Prisma.SpottingGetPayload<{
  select: typeof spottingDetailFields;
}>;

export type SpottingDetail = Omit<
  SpottingDetailRow,
  "latitude" | "longitude"
> & Coordinates;

export function createSpottingRecord(spotting: NewSpotting) {
  return getPrismaClient().spotting.create({
    data: spotting,
    select: { id: true },
  });
}

export async function findSpotting(
  spottingId: string,
): Promise<SpottingDetail | null> {
  const spotting = await getPrismaClient().spotting.findUnique({
    where: { id: spottingId },
    select: spottingDetailFields,
  });
  if (!spotting) return null;
  return {
    ...spotting,
    latitude: Number(spotting.latitude),
    longitude: Number(spotting.longitude),
  };
}
