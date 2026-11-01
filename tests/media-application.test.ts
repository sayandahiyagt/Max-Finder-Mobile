jest.mock("server-only", () => ({}), { virtual: true });
jest.mock("@/features/pets/repository", () => ({
  createOwnedPetProfile: jest.fn(),
  deleteOwnedPetProfile: jest.fn(),
  findOwnedPetProfile: jest.fn(),
  listOwnedPetProfiles: jest.fn(),
  updateOwnedPetProfile: jest.fn(),
}));
jest.mock("@/features/spottings/repository", () => ({
  createSpottingRecord: jest.fn(),
  findSpotting: jest.fn(),
}));

import {
  createPetProfile,
  deletePetProfile,
  updatePetProfile,
} from "@/features/pets/application";
import {
  createOwnedPetProfile,
  deleteOwnedPetProfile,
  updateOwnedPetProfile,
} from "@/features/pets/repository";
import { createSpotting } from "@/features/spottings/application";
import { createSpottingRecord } from "@/features/spottings/repository";
import type { PetImageStorage } from "@/features/pets/types";
import type { SpottingImageStorage } from "@/features/spottings/types";
import { dummyImageUpload } from "./fixtures/dummy-data";

const petStorage: jest.Mocked<PetImageStorage> = {
  upload: jest.fn(),
  remove: jest.fn(),
};
const spottingStorage: jest.Mocked<SpottingImageStorage> = {
  upload: jest.fn(),
  remove: jest.fn(),
};

const petInput = {
  name: "Mochi",
  species: "cat" as const,
  breed: "Domestic Shorthair",
  color: "Gray tabby",
  size: "small" as const,
  age: 5,
  description: "Synthetic test pet.",
  dateOfBirth: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  petStorage.upload.mockResolvedValue("auth-user/pets/new.png");
  petStorage.remove.mockResolvedValue(true);
  spottingStorage.upload.mockResolvedValue("anonymous/new.png");
  spottingStorage.remove.mockResolvedValue(true);
});

describe("Pet Profile media workflow", () => {
  it("removes a newly uploaded image when profile creation fails", async () => {
    const databaseError = new Error("database unavailable");
    jest.mocked(createOwnedPetProfile).mockRejectedValue(databaseError);
    petStorage.remove.mockRejectedValue(new Error("storage unavailable"));

    await expect(
      createPetProfile(
        {
          ownerId: "app-user",
          authUserId: "auth-user",
          input: petInput,
          image: dummyImageUpload("new.png"),
        },
        petStorage,
      ),
    ).rejects.toBe(databaseError);
    expect(petStorage.upload).toHaveBeenCalledWith(
      expect.objectContaining({ file: expect.any(File) }),
      "auth-user",
    );
    expect(petStorage.remove).toHaveBeenCalledWith("auth-user/pets/new.png");
  });

  it("replaces a profile image and removes the previous object after persistence", async () => {
    jest.mocked(updateOwnedPetProfile).mockResolvedValue({
      oldImagePath: "auth-user/pets/old.png",
    });

    await expect(
      updatePetProfile(
        {
          petId: "pet-id",
          ownerId: "app-user",
          authUserId: "auth-user",
          input: petInput,
          imageChange: { kind: "upload", image: dummyImageUpload("new.png") },
        },
        petStorage,
      ),
    ).resolves.toBe(true);
    expect(updateOwnedPetProfile).toHaveBeenCalledWith(
      "pet-id",
      "app-user",
      petInput,
      { path: "auth-user/pets/new.png" },
    );
    expect(petStorage.remove).toHaveBeenCalledWith("auth-user/pets/old.png");
  });

  it("compensates an uploaded image when an update affects no profile", async () => {
    jest.mocked(updateOwnedPetProfile).mockResolvedValue(null);

    await expect(
      updatePetProfile(
        {
          petId: "missing-pet",
          ownerId: "app-user",
          authUserId: "auth-user",
          input: petInput,
          imageChange: { kind: "upload", image: dummyImageUpload("new.png") },
        },
        petStorage,
      ),
    ).resolves.toBe(false);
    expect(petStorage.remove).toHaveBeenCalledWith("auth-user/pets/new.png");
  });

  it("keeps the current image when profile fields change without an image choice", async () => {
    jest.mocked(updateOwnedPetProfile).mockResolvedValue({
      oldImagePath: "auth-user/pets/current.png",
    });

    await updatePetProfile(
      {
        petId: "pet-id",
        ownerId: "app-user",
        authUserId: "auth-user",
        input: petInput,
        imageChange: { kind: "unchanged" },
      },
      petStorage,
    );

    expect(updateOwnedPetProfile).toHaveBeenCalledWith(
      "pet-id",
      "app-user",
      petInput,
      {},
    );
    expect(petStorage.remove).not.toHaveBeenCalled();
  });

  it("removes the image only after profile deletion succeeds", async () => {
    jest.mocked(deleteOwnedPetProfile).mockResolvedValue({
      kind: "deleted",
      imagePath: "auth-user/pets/old.png",
    });

    await expect(
      deletePetProfile({ petId: "pet-id", ownerId: "app-user" }, petStorage),
    ).resolves.toEqual({ kind: "deleted" });
    expect(petStorage.remove).toHaveBeenCalledWith("auth-user/pets/old.png");

    petStorage.remove.mockClear();
    jest.mocked(deleteOwnedPetProfile).mockResolvedValue({ kind: "not-found" });
    await expect(
      deletePetProfile(
        { petId: "missing-pet", ownerId: "app-user" },
        petStorage,
      ),
    ).resolves.toEqual({ kind: "not-found" });
    expect(petStorage.remove).not.toHaveBeenCalled();
  });
});

describe("Spotting media workflow", () => {
  it("removes the uploaded object when persistence fails and keeps the write error", async () => {
    const databaseError = new Error("database unavailable");
    jest.mocked(createSpottingRecord).mockRejectedValue(databaseError);
    spottingStorage.remove.mockRejectedValue(new Error("storage unavailable"));

    await expect(
      createSpotting(
        {
          species: "Cat",
          breed: null,
          weightRange: null,
          description: null,
          distinguishingCharacteristics: null,
          spottedAt: new Date("2026-10-30T12:00:00.000Z"),
          latitude: 40.7,
          longitude: -74,
          locationLabel: "Example Park",
        },
        dummyImageUpload("new.png"),
        spottingStorage,
      ),
    ).rejects.toBe(databaseError);
    expect(spottingStorage.remove).toHaveBeenCalledWith("anonymous/new.png");
  });
});
