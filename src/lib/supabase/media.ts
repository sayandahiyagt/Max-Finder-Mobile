import "server-only";

import type { PetImageStorage } from "@/features/pets/types";
import type { SpottingImageStorage } from "@/features/spottings/types";
import { removeImage, removePetImage } from "./storage";
import { uploadImage } from "./upload";

export const petImageStorage: PetImageStorage = {
  async upload(image, authUserId) {
    const result = await uploadImage(image, "pet-images", `${authUserId}/pets`);
    return result.path;
  },
  remove: removePetImage,
};

export const spottingImageStorage: SpottingImageStorage = {
  async upload(image) {
    const result = await uploadImage(image, "spotting-images", "anonymous");
    return result.path;
  },
  remove: (path) => removeImage("spotting-images", path),
};
