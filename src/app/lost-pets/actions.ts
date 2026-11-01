"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createReportForOwnedPet,
  removeLostPetReport,
  updateLostPetReport,
} from "@/features/lost-pets/application";
import { requireUser } from "@/lib/auth";
import { reverseGeocode } from "@/lib/geocoding";
import { parseCoordinates } from "@/lib/coordinates";
import { parseLocalDateTime } from "@/lib/local-date-time";
import { isPlaceholderLocationLabel } from "@/lib/location-contract";
import { isWeightRange } from "@/lib/pet-options";
import {
  isEditableReportStatus,
  isReportContactMethod,
} from "@/features/lost-pets/types";
import {
  captureTextFields,
  FormFieldError,
  readTextField,
} from "@/lib/form-data";
import { LostPetReportValidationError } from "@/features/lost-pets/errors";
import type {
  LostPetReportActionState,
  LostPetReportRemovalActionState,
  LostPetReportUpdateActionState,
} from "@/features/lost-pets/form-state";

function requiredText(formData: FormData, name: string, max = 2000) {
  const value = readTextField(formData, name, max);
  if (!value) throw new FormFieldError(`Invalid ${name}.`);
  return value;
}

function submittedValues(formData: FormData) {
  return captureTextFields(formData, {
    petId: 80,
    weightRange: 30,
    lastSeenAt: 16,
    lastSeenAtTimezoneOffset: 4,
    contactMethod: 20,
    contactValue: 255,
    contactInstructions: 2000,
    description: 2000,
    locationLabel: 255,
    latitude: 40,
    longitude: 40,
  });
}

function failedReportState(
  previousState: LostPetReportActionState,
  formData: FormData,
  error: unknown,
): LostPetReportActionState {
  const message =
    error instanceof LostPetReportValidationError
      ? error.message
      : error instanceof FormFieldError
        ? "Check the form fields and try again."
        : "Report could not be published. Please try again.";
  return {
    kind: "error",
    message,
    values: submittedValues(formData),
    submission: previousState.submission + 1,
  };
}

export async function createLostPetReport(
  previousState: LostPetReportActionState,
  formData: FormData,
): Promise<LostPetReportActionState> {
  const { actor } = await requireUser();
  let reportId: string;
  try {
    const petId = requiredText(formData, "petId", 80);
    const weightRange = requiredText(formData, "weightRange", 30);
    const description = requiredText(formData, "description");
    const contactMethod = requiredText(
      formData,
      "contactMethod",
      20,
    ).toLowerCase();
    const contactValue = readTextField(formData, "contactValue", 255);
    const contactInstructions = readTextField(
      formData,
      "contactInstructions",
    );
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactValue);
    const phoneDigits = contactValue.match(/\d/g)?.length ?? 0;
    const validPhone =
      /^\+?[\d\s().-]+$/.test(contactValue) &&
      phoneDigits >= 7 &&
      phoneDigits <= 15;
    let locationLabel = requiredText(formData, "locationLabel", 255);
    const coordinates = parseCoordinates(
      formData.get("latitude"),
      formData.get("longitude"),
    );
    const lastSeenAt = parseLocalDateTime(
      formData.get("lastSeenAt"),
      formData.get("lastSeenAtTimezoneOffset"),
    );
    if (
      !isWeightRange(weightRange) ||
      !isReportContactMethod(contactMethod) ||
      (contactMethod === "email" && !validEmail) ||
      (contactMethod === "phone" && !validPhone) ||
      contactInstructions.length > 2000 ||
      !coordinates ||
      !lastSeenAt
    ) {
      throw new LostPetReportValidationError(
        "Please complete every report field.",
      );
    }
    if (isPlaceholderLocationLabel(locationLabel)) {
      const geocodedLocation = await reverseGeocode(
        coordinates.latitude,
        coordinates.longitude,
      );
      if (!geocodedLocation) {
        throw new LostPetReportValidationError(
          "Could not determine an address for this report location.",
        );
      }
      locationLabel = geocodedLocation;
    }
    const report = await createReportForOwnedPet({
      petId,
      ownerId: actor.userId,
      report: {
        weightRange,
        description,
        lastSeenAt,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        locationLabel,
        contactMethod,
        contactValue: contactMethod === "in_app" ? null : contactValue,
        contactInstructions: contactInstructions || null,
      },
    });
    reportId = report.id;
  } catch (error) {
    return failedReportState(previousState, formData, error);
  }
  revalidatePath("/");
  revalidatePath("/lost-pets");
  redirect(`/lost-pets/reports/${reportId}`);
}

function submittedUpdateValues(formData: FormData) {
  return captureTextFields(formData, {
    id: 80,
    status: 10,
    description: 2000,
  });
}

function failedUpdateState(
  previousState: LostPetReportUpdateActionState,
  formData: FormData,
  error: unknown,
): LostPetReportUpdateActionState {
  const message =
    error instanceof LostPetReportValidationError
      ? error.message
      : error instanceof FormFieldError
        ? "Check the report fields and try again."
        : "Report could not be updated. Please try again.";
  return {
    kind: "error",
    message,
    values: submittedUpdateValues(formData),
    submission: previousState.submission + 1,
  };
}

export async function updateLostPet(
  previousState: LostPetReportUpdateActionState,
  formData: FormData,
): Promise<LostPetReportUpdateActionState> {
  const { actor } = await requireUser();
  let id: string;
  try {
    id = requiredText(formData, "id", 80);
    const status = requiredText(formData, "status", 10);
    const description = requiredText(formData, "description");
    if (!isEditableReportStatus(status)) {
      throw new LostPetReportValidationError("Choose Lost or Found.");
    }
    const updated = await updateLostPetReport({
      reportId: id,
      ownerId: actor.userId,
      changes: { description, status },
    });
    if (!updated) throw new Error("Report update did not affect a row.");
  } catch (error) {
    return failedUpdateState(previousState, formData, error);
  }
  revalidatePath("/");
  revalidatePath("/lost-pets");
  redirect(`/lost-pets/reports/${id}`);
}

export async function deleteLostPet(
  previousState: LostPetReportRemovalActionState,
  formData: FormData,
): Promise<LostPetReportRemovalActionState> {
  const { actor } = await requireUser();
  try {
    const id = requiredText(formData, "id", 80);
    const removed = await removeLostPetReport({
      reportId: id,
      ownerId: actor.userId,
    });
    if (!removed) throw new Error("Report removal did not affect a row.");
  } catch {
    return {
      kind: "error",
      message: "Report could not be removed. Refresh and try again.",
      submission: previousState.submission + 1,
    };
  }
  revalidatePath("/");
  redirect("/profile");
}
