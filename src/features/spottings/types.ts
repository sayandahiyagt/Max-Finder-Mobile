import type { PetSpecies, WeightRange } from "@/lib/pet-options";
import type { ImageUpload } from "@/lib/image-upload";

export type NewSpotting = {
  species: PetSpecies;
  breed: string | null;
  weightRange: WeightRange | null;
  description: string | null;
  distinguishingCharacteristics: string | null;
  spottedAt: Date;
  latitude: number;
  longitude: number;
  locationLabel: string;
  imagePath: string;
};

export type NewSpottingInput = Omit<NewSpotting, "imagePath">;

export type SpottingImageStorage = {
  upload(image: ImageUpload): Promise<string>;
  remove(path: string): Promise<boolean>;
};
