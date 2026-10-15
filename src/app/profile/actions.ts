"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/supabase/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function updateProfile(formData: FormData) {
  const { user } = await requireUser();
  const admin = createSupabaseAdminClient();
  const displayName = String(formData.get("displayName") ?? "").trim();
  if (!displayName || displayName.length > 80) throw new Error("Enter a display name.");
  const { error } = await admin.from("profiles").upsert({ id: user.id, display_name: displayName });
  if (error) throw new Error("Could not update your profile.");
  revalidatePath("/profile");
  redirect("/profile");
}
