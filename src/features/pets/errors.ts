export class PetProfileInUseError extends Error {
  constructor() {
    super("Pet Profile has associated Lost Pet Reports.");
    this.name = "PetProfileInUseError";
  }
}

export class PetProfileValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PetProfileValidationError";
  }
}
