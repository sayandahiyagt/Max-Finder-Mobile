import "server-only";

import { Prisma } from "@prisma/client";

import { getPrismaClient } from "@/lib/db/client";
import { PetProfileInUseError } from "./errors";
import type { PetProfileDeletion, PetProfileInput } from "./types";

const petProfileFields = {
  id: true,
  name: true,
  species: true,
  breed: true,
  color: true,
  size: true,
  age: true,
  description: true,
  dateOfBirth: true,
  profileImage: { select: { storagePath: true } },
} as const;

export function listOwnedPetProfiles(ownerId: string) {
  return getPrismaClient().pet.findMany({
    where: { ownerId: ownerId },
    orderBy: { createdAt: "desc" },
    select: petProfileFields,
  });
}

export function findOwnedPetProfile(petId: string, ownerId: string) {
  return getPrismaClient().pet.findFirst({
    where: { id: petId, ownerId: ownerId },
    select: petProfileFields,
  });
}

export function createOwnedPetProfile(
  ownerId: string,
  input: PetProfileInput,
  imagePath: string | null,
) {
  return getPrismaClient().pet.create({
    data: {
      ...input,
      ownerId: ownerId,
      ...(imagePath
        ? { profileImage: { create: { storagePath: imagePath } } }
        : {}),
    },
    select: { id: true },
  });
}

export async function updateOwnedPetProfile(
  petId: string,
  ownerId: string,
  input: PetProfileInput,
  image: { path?: string; remove?: boolean },
) {
  return getPrismaClient().$transaction(async (transaction) => {
    const existing = await transaction.pet.findFirst({
      where: { id: petId, ownerId: ownerId },
      select: { profileImage: { select: { storagePath: true } } },
    });
    if (!existing) return null;

    if (image.remove) {
      await transaction.petImage.deleteMany({ where: { petId } });
    } else if (image.path) {
      await transaction.petImage.upsert({
        where: { petId },
        create: { petId, storagePath: image.path },
        update: { storagePath: image.path },
      });
    }

    await transaction.pet.update({
      where: { id: petId },
      data: {
        ...input,
      },
    });

    return { oldImagePath: existing.profileImage?.storagePath ?? null };
  });
}

export async function deleteOwnedPetProfile(
  petId: string,
  ownerId: string,
): Promise<PetProfileDeletion> {
  const prisma = getPrismaClient();
  const pet = await prisma.pet.findFirst({
    where: { id: petId, ownerId: ownerId },
    select: { profileImage: { select: { storagePath: true } } },
  });
  if (!pet) return { kind: "not-found" };

  try {
    await prisma.pet.delete({ where: { id: petId } });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      throw new PetProfileInUseError();
    }
    throw error;
  }
  return {
    kind: "deleted",
    imagePath: pet.profileImage?.storagePath ?? null,
  };
}
