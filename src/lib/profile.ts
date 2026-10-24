export type DisplayNameValidation =
  | { kind: "valid"; displayName: string }
  | { kind: "invalid"; message: string };

export function validateDisplayName(value: unknown): DisplayNameValidation {
  if (typeof value !== "string" || value.trim() === "") {
    return { kind: "invalid", message: "Display name is required." };
  }

  const displayName = value.trim();
  if (displayName.length > 100) {
    return {
      kind: "invalid",
      message: "Display name must be 100 characters or fewer.",
    };
  }

  return { kind: "valid", displayName };
}
