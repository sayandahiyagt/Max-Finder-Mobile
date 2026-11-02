import { createPet, deletePet, updatePet } from "@/app/pets/actions";
import {
  createPetProfile,
  deletePetProfile,
  updatePetProfile,
} from "@/features/pets/application";
import { PetProfileInUseError } from "@/features/pets/errors";
import { petImageStorage } from "@/lib/supabase/media";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  initialPetProfileActionState,
  initialPetProfileDeleteActionState,
} from "@/features/pets/form-state";

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("next/navigation", () => ({ redirect: jest.fn() }));
jest.mock("@/features/pets/application", () => ({
  createPetProfile: jest.fn(),
  deletePetProfile: jest.fn(),
  updatePetProfile: jest.fn(),
}));
jest.mock("@/lib/auth", () => ({
  requireUser: jest.fn().mockResolvedValue({
    identity: { authProviderId: "auth-user" },
    user: { id: "auth-user" },
    actor: { userId: "app-user" },
  }),
}));
jest.mock("@/lib/supabase/media", () => ({
  petImageStorage: { upload: jest.fn(), remove: jest.fn() },
}));

describe("pet form boundary", () => {
  beforeEach(() => jest.clearAllMocks());

  it("rejects a missing age instead of treating it as zero", async () => {
    const form = new FormData();
    form.set("name", "Mochi");
    form.set("species", "cat");
    form.set("color", "white");
    form.set("size", "small");

    const state = await createPet(initialPetProfileActionState, form);

    expect(state).toMatchObject({
      kind: "error",
      message: "Enter an age in whole years.",
      values: { name: "Mochi", species: "cat", color: "white" },
    });
    expect(createPetProfile).not.toHaveBeenCalled();
  });

  it("rejects an out-of-range age before uploading the image", async () => {
    const form = new FormData();
    form.set("name", "Mochi");
    form.set("species", "cat");
    form.set("color", "white");
    form.set("size", "small");
    form.set("age", "201");
    form.set(
      "image",
      new File(
        [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
        "mochi.png",
        { type: "image/png" },
      ),
    );

    const state = await createPet(initialPetProfileActionState, form);

    expect(state).toMatchObject({
      kind: "error",
      message: "Enter an age from 0 to 200.",
      values: { name: "Mochi", age: "201" },
    });
    expect(createPetProfile).not.toHaveBeenCalled();
  });

  it("rejects an unsupported species before uploading or persisting", async () => {
    const form = new FormData();
    form.set("name", "Mochi");
    form.set("species", "rabbit");
    form.set("color", "white");
    form.set("size", "small");
    form.set("age", "3");
    form.set(
      "image",
      new File(["dummy image"], "mochi.jpg", { type: "image/jpeg" }),
    );

    const state = await createPet(initialPetProfileActionState, form);

    expect(state).toMatchObject({ kind: "error", message: "Choose a dog or cat." });
    expect(createPetProfile).not.toHaveBeenCalled();
  });

  it("rejects an unsupported size before uploading or persisting", async () => {
    const form = new FormData();
    form.set("name", "Mochi");
    form.set("species", "cat");
    form.set("color", "white");
    form.set("size", "giant");
    form.set("age", "3");
    form.set(
      "image",
      new File(["dummy image"], "mochi.jpg", { type: "image/jpeg" }),
    );

    const state = await createPet(initialPetProfileActionState, form);

    expect(state).toMatchObject({ kind: "error", message: "Choose a pet size." });
    expect(createPetProfile).not.toHaveBeenCalled();
  });

  it("validates profile fields before uploading the selected image", async () => {
    const form = new FormData();
    form.set("name", "Mochi");
    form.set("species", "cat");
    form.set("color", "white");
    form.set("size", "small");
    form.set(
      "image",
      new File(["dummy image"], "mochi.jpg", { type: "image/jpeg" }),
    );

    const state = await createPet(initialPetProfileActionState, form);

    expect(state).toMatchObject({
      kind: "error",
      message: "Enter an age in whole years.",
    });
    expect(createPetProfile).not.toHaveBeenCalled();
  });

  it("uploads a validated profile image through the shared action path", async () => {
    const form = new FormData();
    form.set("name", "Mochi");
    form.set("species", "cat");
    form.set("color", "white");
    form.set("size", "small");
    form.set("age", "3");
    form.set(
      "image",
      new File(
        [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
        "mochi.png",
        { type: "image/png" },
      ),
    );
    jest.mocked(createPetProfile).mockResolvedValue({ id: "local-pet" });

    await createPet(initialPetProfileActionState, form);

    expect(createPetProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerId: "app-user",
        authUserId: "auth-user",
        input: expect.objectContaining({ name: "Mochi" }),
        image: expect.objectContaining({
          contentType: "image/png",
          extension: "png",
        }),
      }),
      petImageStorage,
    );
  });

  it("returns a safe persistence error and retains entered text", async () => {
    const form = new FormData();
    form.set("name", "Mochi");
    form.set("species", "cat");
    form.set("color", "white");
    form.set("size", "small");
    form.set("age", "3");
    form.set("description", "Synthetic description");
    jest
      .mocked(createPetProfile)
      .mockRejectedValue(new Error("database details must remain private"));

    const state = await createPet(initialPetProfileActionState, form);

    expect(state).toMatchObject({
      kind: "error",
      message: "Pet Profile could not be saved. Check your entries and try again.",
      values: {
        name: "Mochi",
        description: "Synthetic description",
      },
    });
    expect(state.message).not.toContain("database details");
  });

  it("returns a safe edit error and retains the existing profile values", async () => {
    const form = new FormData();
    form.set("petId", "local-pet-id");
    form.set("name", "Mochi");
    form.set("species", "cat");
    form.set("color", "white");
    form.set("size", "small");
    form.set("age", "3");
    jest
      .mocked(updatePetProfile)
      .mockRejectedValue(new Error("database details must remain private"));

    const state = await updatePet(initialPetProfileActionState, form);

    expect(state).toMatchObject({
      kind: "error",
      message: "Pet Profile could not be saved. Check your entries and try again.",
      values: { name: "Mochi", species: "cat", age: "3" },
    });
    expect(state.message).not.toContain("database details");
  });

  it("explains report references and hides unexpected delete failures", async () => {
    const form = new FormData();
    form.set("petId", "local-pet-id");
    jest
      .mocked(deletePetProfile)
      .mockRejectedValueOnce(new PetProfileInUseError());

    await expect(
      deletePet(initialPetProfileDeleteActionState, form),
    ).resolves.toMatchObject({
      kind: "error",
      message: "This Pet Profile cannot be deleted while a Lost Pet Report uses it.",
    });

    const databaseError = new Error("local database unavailable");
    jest.mocked(deletePetProfile).mockRejectedValueOnce(databaseError);
    const state = await deletePet(initialPetProfileDeleteActionState, form);
    expect(state).toMatchObject({
      kind: "error",
      message: "Pet Profile could not be deleted. Please try again.",
    });
    expect(state.message).not.toContain(databaseError.message);
  });

  it("reports a missing profile instead of treating it as a successful delete", async () => {
    const form = new FormData();
    form.set("petId", "missing-local-pet");
    jest.mocked(deletePetProfile).mockResolvedValueOnce({ kind: "not-found" });

    await expect(
      deletePet(initialPetProfileDeleteActionState, form),
    ).resolves.toMatchObject({
      kind: "error",
      message: "Pet Profile could not be deleted. It may no longer exist.",
    });
  });

  it("cleans up the profile image and redirects after a successful delete", async () => {
    const form = new FormData();
    form.set("petId", "local-pet-id");
    jest.mocked(deletePetProfile).mockResolvedValueOnce({ kind: "deleted" });

    await deletePet(initialPetProfileDeleteActionState, form);

    expect(deletePetProfile).toHaveBeenCalledWith(
      { petId: "local-pet-id", ownerId: "app-user" },
      petImageStorage,
    );
    expect(revalidatePath).toHaveBeenCalledWith("/pets");
    expect(redirect).toHaveBeenCalledWith("/pets");
  });
});
