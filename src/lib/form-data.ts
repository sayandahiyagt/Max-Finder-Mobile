export class FormFieldError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FormFieldError";
  }
}

export function captureTextFields<
  const T extends Readonly<Record<string, number>>,
>(
  formData: FormData,
  fieldLimits: T,
): { [K in keyof T]: string } {
  return Object.fromEntries(
    Object.entries(fieldLimits).map(([name, maxLength]) => {
      const rawValue = formData.get(name);
      return [
        name,
        typeof rawValue === "string" ? rawValue.slice(0, maxLength) : "",
      ];
    }),
  ) as { [K in keyof T]: string };
}

export function readRawTextField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export function readTextField(
  formData: FormData,
  name: string,
  maxLength = 2000,
): string {
  const rawValue = formData.get(name);
  if (rawValue !== null && typeof rawValue !== "string") {
    throw new FormFieldError(`Invalid ${name}.`);
  }
  const value = (rawValue ?? "").trim();
  if (value.length > maxLength) throw new FormFieldError(`Invalid ${name}.`);
  return value;
}
