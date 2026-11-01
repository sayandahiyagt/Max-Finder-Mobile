import type { PetProfileInput } from "./types";
import { PetProfileValidationError } from "./errors";

export function validatePetProfileInput(input: PetProfileInput) {
  if (!input.name.trim() || input.name.length > 100)
    throw new PetProfileValidationError("Enter a pet name up to 100 characters.");
  if (input.breed && input.breed.length > 100)
    throw new PetProfileValidationError("Breed must be 100 characters or fewer.");
  if (!input.color.trim() || input.color.length > 50)
    throw new PetProfileValidationError("Enter a color up to 50 characters.");
  if (!Number.isInteger(input.age) || input.age < 0 || input.age > 200)
    throw new PetProfileValidationError("Enter an age from 0 to 200.");
  if (input.description && input.description.length > 2000)
    throw new PetProfileValidationError("Description must be 2000 characters or fewer.");
  if (input.dateOfBirth && !Number.isFinite(input.dateOfBirth.getTime()))
    throw new PetProfileValidationError("Enter a valid date of birth.");
}
