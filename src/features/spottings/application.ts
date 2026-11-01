import "server-only";

import type { ImageUpload } from "@/lib/image-upload";
import {
  createSpottingRecord,
  findSpotting,
} from "./repository";
import type {
  NewSpottingInput,
  SpottingImageStorage,
} from "./types";

export async function createSpotting(
  input: NewSpottingInput,
  image: ImageUpload,
  storage: SpottingImageStorage,
) {
  if (!input.locationLabel) {
    throw new Error("A spotting image, species, and location are required.");
  }
  if (!Number.isFinite(input.spottedAt.getTime())) {
    throw new Error("Enter a valid spotting time.");
  }
  const imagePath = await storage.upload(image);
  try {
    return await createSpottingRecord({ ...input, imagePath });
  } catch (error) {
    await storage.remove(imagePath).catch(() => false);
    throw error;
  }
}

export function getSpotting(spottingId: string) {
  if (!spottingId) throw new Error("A spotting is required.");
  return findSpotting(spottingId);
}
