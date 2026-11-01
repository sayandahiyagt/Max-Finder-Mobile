import "server-only";

import {
  createOwnedPetProfile,
  deleteOwnedPetProfile,
  findOwnedPetProfile,
  listOwnedPetProfiles,
  updateOwnedPetProfile,
} from "./repository";
import type {
  CreatePetProfileCommand,
  DeletePetProfileCommand,
  PetImageStorage,
  UpdatePetProfileCommand,
} from "./types";
import { validatePetProfileInput } from "./validation";

export function getPetProfiles(ownerId: string) {
  if (!ownerId) throw new Error("An authenticated owner is required.");
  return listOwnedPetProfiles(ownerId);
}

export function getPetProfile(petId: string, ownerId: string) {
  if (!petId || !ownerId)
    throw new Error("A pet and authenticated owner are required.");
  return findOwnedPetProfile(petId, ownerId);
}

export async function createPetProfile(
  command: CreatePetProfileCommand,
  storage: PetImageStorage,
) {
  const { ownerId, authUserId, input, image } = command;
  if (!ownerId) throw new Error("An authenticated owner is required.");
  validatePetProfileInput(input);
  const imagePath = image
    ? await storage.upload(image, authUserId)
    : null;
  try {
    return await createOwnedPetProfile(ownerId, input, imagePath);
  } catch (error) {
    if (imagePath) await removeQuietly(storage, imagePath);
    throw error;
  }
}

export async function updatePetProfile(
  command: UpdatePetProfileCommand,
  storage: PetImageStorage,
) {
  const { petId, ownerId, authUserId, input, imageChange } = command;
  if (!petId || !ownerId)
    throw new Error("A pet and authenticated owner are required.");
  validatePetProfileInput(input);
  const imagePath =
    imageChange.kind === "upload"
      ? await storage.upload(imageChange.image, authUserId)
      : undefined;
  try {
    const result = await updateOwnedPetProfile(petId, ownerId, input, {
      ...(imagePath ? { path: imagePath } : {}),
      ...(imageChange.kind === "remove" ? { remove: true } : {}),
    });
    if (!result) {
      if (imagePath) await removeQuietly(storage, imagePath);
      return false;
    }
    const replacedImage =
      imageChange.kind === "upload" && result.oldImagePath !== imagePath;
    if (result.oldImagePath && (imageChange.kind === "remove" || replacedImage)) {
      await removeQuietly(storage, result.oldImagePath);
    }
    return true;
  } catch (error) {
    if (imagePath) await removeQuietly(storage, imagePath);
    throw error;
  }
}

export async function deletePetProfile(
  { petId, ownerId }: DeletePetProfileCommand,
  storage: PetImageStorage,
) {
  if (!petId || !ownerId)
    throw new Error("A pet and authenticated owner are required.");
  const result = await deleteOwnedPetProfile(petId, ownerId);
  if (result.kind === "not-found") return result;
  if (result.imagePath) await removeQuietly(storage, result.imagePath);
  return { kind: "deleted" as const };
}

async function removeQuietly(storage: PetImageStorage, path: string) {
  try {
    await storage.remove(path);
  } catch {
    return;
  }
}
