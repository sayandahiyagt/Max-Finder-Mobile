"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/supabase/auth";
import { validateDisplayName } from "@/lib/profile";

export type ProfileActionState =
  | { kind: "idle"; message: "" }
  | { kind: "success" | "error"; message: string };

export async function updateProfile(
  _previousState: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const { supabase, user } = await requireUser();
  const validation = validateDisplayName(formData.get("displayName"));
  if (validation.kind === "invalid") {
    return { kind: "error", message: validation.message };
  }

  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    display_name: validation.displayName,
  });
  if (error) {
    console.error("Profile update failed.", {
      code: error.code,
      message: error.message,
    });
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
