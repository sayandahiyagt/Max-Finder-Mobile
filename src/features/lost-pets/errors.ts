export class LostPetReportValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LostPetReportValidationError";
  }
}
