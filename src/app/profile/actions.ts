"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { updateApplicationDisplayName } from "@/features/identity/application";
import { validateDisplayName } from "@/features/identity/validation";
import { getAuthenticatedIdentity } from "@/lib/supabase/authentication";

export type ProfileActionState =
  | { kind: "idle"; message: "" }
  | { kind: "success" | "error"; message: string };

export async function updateProfile(
  _previousState: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const identity = await getAuthenticatedIdentity();
  if (!identity) redirect("/sign-in");
  const validation = validateDisplayName(formData.get("displayName"));
  if (validation.kind === "invalid") {
    return { kind: "error", message: validation.message };
  }

  try {
    await updateApplicationDisplayName(identity, validation.displayName);
  } catch {
    return {
      kind: "error",
      message: "Display name could not be updated. Please try again.",
    };
  }
  revalidatePath("/profile");
  return {
    kind: "success",
    message: "Display name updated successfully.",
  };
}
