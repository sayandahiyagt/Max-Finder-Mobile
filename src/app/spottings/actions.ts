"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createSpotting as createSpottingInApp } from "@/features/spottings/application";
import { SpottingSubmissionError } from "@/features/spottings/errors";
import type { SpottingActionState } from "@/features/spottings/form-state";
import { spottingImageStorage } from "@/lib/supabase/media";
import {
  ImageUploadValidationError,
  parseImageUpload,
} from "@/lib/image-upload";
import { reverseGeocode } from "@/lib/geocoding";
import { parseCoordinates } from "@/lib/coordinates";
import { parseLocalDateTime } from "@/lib/local-date-time";
import {
  captureTextFields,
  FormFieldError,
  readTextField,
} from "@/lib/form-data";
import { isPetSpecies, isWeightRange } from "@/lib/pet-options";

function submittedValues(formData: FormData) {
  return captureTextFields(formData, {
    species: 20,
    breed: 100,
    weightRange: 30,
    spottedAt: 16,
    spottedAtTimezoneOffset: 4,
    description: 2000,
    distinguishingCharacteristics: 2000,
    locationLabel: 255,
    latitude: 40,
    longitude: 40,
  });
}

function failedState(
  previousState: SpottingActionState,
  formData: FormData,
  error: unknown,
): SpottingActionState {
  const message =
    error instanceof SpottingSubmissionError ||
    error instanceof ImageUploadValidationError
      ? error.message
      : error instanceof FormFieldError
        ? "Check the spotting details and try again."
        : "Spotting could not be published. Please try again.";
  return {
    kind: "error",
    message,
    values: submittedValues(formData),
    submission: previousState.submission + 1,
  };
}

export async function createSpotting(
  previousState: SpottingActionState,
  formData: FormData,
): Promise<SpottingActionState> {
  let spottingId: string;
  try {
    const spottedAt = parseLocalDateTime(
      formData.get("spottedAt"),
      formData.get("spottedAtTimezoneOffset"),
    );
    if (!spottedAt) {
      throw new SpottingSubmissionError(
        "Please enter a valid spotting date and time.",
      );
    }
    const species = readTextField(formData, "species", 20);
    if (!isPetSpecies(species)) {
      throw new SpottingSubmissionError(
        "Please select whether the spotted pet is a dog or cat.",
      );
    }
    const breed = readTextField(formData, "breed", 100) || null;
    const weightRangeValue = readTextField(formData, "weightRange", 30);
    const weightRange = weightRangeValue
      ? isWeightRange(weightRangeValue)
        ? weightRangeValue
        : null
      : null;
    if (weightRangeValue && !weightRange) {
      throw new SpottingSubmissionError("Choose a valid weight range.");
    }
    const description = readTextField(formData, "description") || null;
    const distinguishingCharacteristics =
      readTextField(formData, "distinguishingCharacteristics") || null;
    const coordinates = parseCoordinates(
      formData.get("latitude"),
      formData.get("longitude"),
    );
    if (!coordinates) {
      throw new SpottingSubmissionError(
        "Please provide an image, time, and location.",
      );
    }
    const image = await parseImageUpload(formData.get("image"));
    const locationLabel = await reverseGeocode(
      coordinates.latitude,
      coordinates.longitude,
    );
    if (!locationLabel) {
      throw new SpottingSubmissionError(
        "Could not determine an address for this spotting location.",
      );
    }
    const spotting = await createSpottingInApp({
      species,
      breed,
      weightRange,
      description,
      distinguishingCharacteristics,
      spottedAt,
      ...coordinates,
      locationLabel,
    }, image, spottingImageStorage);
    spottingId = spotting.id;
  } catch (error) {
    return failedState(previousState, formData, error);
  }
  revalidatePath("/");
  redirect(`/spottings/${spottingId}?created=1`);
}
