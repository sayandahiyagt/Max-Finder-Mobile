export class SpottingSubmissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SpottingSubmissionError";
  }
}
