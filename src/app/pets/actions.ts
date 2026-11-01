"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createPetProfile,
  deletePetProfile,
  updatePetProfile,
} from "@/features/pets/application";
import {
  PetProfileInUseError,
  PetProfileValidationError,
} from "@/features/pets/errors";
import {
  type PetProfileDeleteActionState,
  type PetProfileActionState,
} from "@/features/pets/form-state";
import { validatePetProfileInput } from "@/features/pets/validation";
import { requireUser } from "@/lib/auth";
import { petImageStorage } from "@/lib/supabase/media";
import {
  ImageUploadValidationError,
  parseImageUpload,
} from "@/lib/image-upload";
import {
  captureTextFields,
  FormFieldError,
  readTextField,
} from "@/lib/form-data";
import {
  isPetProfileSpecies,
  isPetSize,
} from "@/lib/pet-options";

function ageInYears(formData: FormData) {
  const rawAge = readTextField(formData, "age", 20);
  const age = Number(rawAge);
  if (!rawAge || !Number.isSafeInteger(age))
    throw new PetProfileValidationError("Enter an age in whole years.");
  return age;
}

function petInput(formData: FormData) {
  const rawDateOfBirth = readTextField(formData, "dateOfBirth", 10);
  const species = readTextField(formData, "species", 10).toLowerCase();
  const size = readTextField(formData, "size", 10);
  if (!isPetProfileSpecies(species))
    throw new PetProfileValidationError("Choose a dog or cat.");
  if (!isPetSize(size))
    throw new PetProfileValidationError("Choose a pet size.");
  return {
    name: readTextField(formData, "name", 100),
    species,
    breed: readTextField(formData, "breed", 100) || null,
    color: readTextField(formData, "color", 50),
    size,
    age: ageInYears(formData),
    description: readTextField(formData, "description", 2000) || null,
    dateOfBirth: rawDateOfBirth
      ? new Date(`${rawDateOfBirth}T00:00:00.000Z`)
      : null,
  };
}

async function selectedPetImage(formData: FormData) {
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return null;
  return parseImageUpload(file);
}

function submittedValues(formData: FormData) {
  return captureTextFields(formData, {
    name: 100,
    species: 10,
    breed: 100,
    color: 50,
    size: 10,
    age: 20,
    dateOfBirth: 10,
    description: 2000,
  });
}

function failedState(
  previousState: PetProfileActionState,
  formData: FormData,
  error: unknown,
): PetProfileActionState {
  const message =
    error instanceof FormFieldError ||
    error instanceof PetProfileValidationError ||
    error instanceof ImageUploadValidationError
      ? error.message
      : "Pet Profile could not be saved. Check your entries and try again.";
  return {
    kind: "error",
    message,
    values: submittedValues(formData),
    submission: previousState.submission + 1,
  };
}

export async function createPet(
  previousState: PetProfileActionState,
  formData: FormData,
): Promise<PetProfileActionState> {
  const { identity, actor } = await requireUser();
  let image: Awaited<ReturnType<typeof selectedPetImage>> = null;
  let pet: { id: string };
  try {
    const input = petInput(formData);
    validatePetProfileInput(input);
    image = await selectedPetImage(formData);
    pet = await createPetProfile(
      {
        ownerId: actor.userId,
        authUserId: identity.authProviderId,
        input,
        image,
      },
      petImageStorage,
    );
  } catch (error) {
    return failedState(previousState, formData, error);
  }
  revalidatePath("/pets");
  revalidatePath("/profile");
  revalidatePath("/lost-pets/new");
  redirect(`/pets/${pet.id}/edit`);
}

export async function updatePet(
  previousState: PetProfileActionState,
  formData: FormData,
): Promise<PetProfileActionState> {
  const { identity, actor } = await requireUser();
  let petId: string;
  let result: Awaited<ReturnType<typeof updatePetProfile>>;
  try {
    petId = readTextField(formData, "petId", 80);
    const input = petInput(formData);
    validatePetProfileInput(input);
    const image = await selectedPetImage(formData);
    const imageChange = image
      ? { kind: "upload" as const, image }
      : formData.get("removeImage") === "on"
        ? { kind: "remove" as const }
        : { kind: "unchanged" as const };
    result = await updatePetProfile(
      {
        petId,
        ownerId: actor.userId,
        authUserId: identity.authProviderId,
        input,
        imageChange,
      },
      petImageStorage,
    );
    if (!result) throw new Error("Pet Profile not found.");
  } catch (error) {
    return failedState(previousState, formData, error);
  }
  revalidatePath("/pets");
  revalidatePath(`/pets/${petId}/edit`);
  revalidatePath("/lost-pets/new");
  redirect(`/pets/${petId}/edit`);
}

export async function deletePet(
  previousState: PetProfileDeleteActionState,
  formData: FormData,
): Promise<PetProfileDeleteActionState> {
  const { actor } = await requireUser();
  let petId: string;
  let deletion: Awaited<ReturnType<typeof deletePetProfile>>;
  try {
    petId = readTextField(formData, "petId", 80);
    deletion = await deletePetProfile(
      { petId, ownerId: actor.userId },
      petImageStorage,
    );
  } catch (error) {
    return {
      kind: "error",
      message:
        error instanceof PetProfileInUseError
          ? "This Pet Profile cannot be deleted while a Lost Pet Report uses it."
          : "Pet Profile could not be deleted. Please try again.",
      submission: previousState.submission + 1,
    };
  }
  if (deletion.kind === "not-found") {
    return {
      kind: "error",
      message: "Pet Profile could not be deleted. It may no longer exist.",
      submission: previousState.submission + 1,
    };
  }
  revalidatePath("/pets");
  revalidatePath("/profile");
  revalidatePath("/lost-pets/new");
  redirect("/pets");
}
