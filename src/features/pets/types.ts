import type { PetProfileSpecies, PetSize } from "@/lib/pet-options";
import type { ImageUpload } from "@/lib/image-upload";

export type PetProfileInput = {
  name: string;
  species: PetProfileSpecies;
  breed: string | null;
  color: string;
  size: PetSize;
  age: number;
  description: string | null;
  dateOfBirth: Date | null;
};

export type PetProfileDeletion =
  | { kind: "not-found" }
  | { kind: "deleted"; imagePath: string | null };

export type PetImageStorage = {
  upload(image: ImageUpload, authUserId: string): Promise<string>;
  remove(path: string): Promise<boolean>;
};

export type PetImageChange =
  | { kind: "unchanged" }
  | { kind: "remove" }
  | { kind: "upload"; image: ImageUpload };

export type CreatePetProfileCommand = {
  ownerId: string;
  authUserId: string;
  input: PetProfileInput;
  image: ImageUpload | null;
};

export type UpdatePetProfileCommand = {
  petId: string;
  ownerId: string;
  authUserId: string;
  input: PetProfileInput;
  imageChange: PetImageChange;
};

export type DeletePetProfileCommand = {
  petId: string;
  ownerId: string;
};
