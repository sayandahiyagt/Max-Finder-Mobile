"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ReportActionState = { error?: string };

async function getOwnedReport(reportId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/sign-in");

  const { data: report } = await supabase
    .from("lost_pet_reports")
    .select("id, owner_id")
    .eq("id", reportId)
    .eq("owner_id", authData.user.id)
    .single();

  return { supabase, user: authData.user, report };
}

export async function updateLostPetReport(
  _previousState: ReportActionState,
  formData: FormData,
): Promise<ReportActionState> {
  const reportId = String(formData.get("reportId") ?? "").trim();
  const lastSeenAt = String(formData.get("lastSeenAt") ?? "").trim();
  const location = String(formData.get("lastSeenLocation") ?? "").trim();
  const latitude = Number(formData.get("latitude") ?? "");
  const longitude = Number(formData.get("longitude") ?? "");
  const contactMethod = String(formData.get("contactMethod") ?? "");
  const { supabase, user, report } = await getOwnedReport(reportId);

  if (!report || !lastSeenAt || !location || !Number.isFinite(latitude) ||
      latitude < -90 || latitude > 90 || !Number.isFinite(longitude) ||
      longitude < -180 || longitude > 180 || !["email", "phone"].includes(contactMethod)) {
    return { error: "Complete the last-seen and contact information." };
  }

  const contactValue = contactMethod === "email"
    ? user.email ?? ""
    : String(user.user_metadata.phone ?? "").trim();

  if (!contactValue) {
    return { error: "Add a phone number to your profile before choosing phone contact." };
  }

  const { error } = await supabase
    .from("lost_pet_reports")
    .update({
      last_seen_at: new Date(lastSeenAt).toISOString(),
      last_seen_location: location,
      latitude,
      longitude,
      contact_method: contactMethod,
      contact_value: contactValue,
      updated_at: new Date().toISOString(),
    })
    .eq("id", reportId)
    .eq("owner_id", user.id);

  if (error) return { error: "The report could not be updated. Please try again." };
  redirect(`/lost-pets/reports/${reportId}`);
}

export async function markLostPetFound(formData: FormData) {
  const reportId = String(formData.get("reportId") ?? "").trim();
  const { supabase, user, report } = await getOwnedReport(reportId);
  if (report) {
    await supabase
      .from("lost_pet_reports")
      .update({ status: "FOUND", updated_at: new Date().toISOString() })
      .eq("id", reportId)
      .eq("owner_id", user.id);
  }
  redirect("/lost-pets/reports");
}

export async function deleteLostPetReport(formData: FormData) {
  const reportId = String(formData.get("reportId") ?? "").trim();
  const { supabase, user, report } = await getOwnedReport(reportId);
  if (!report) {
    redirect("/lost-pets/reports");
  }

  const { error } = await supabase
    .from("lost_pet_reports")
    .delete()
    .eq("id", reportId)
    .eq("owner_id", user.id);

  if (error) {
    throw new Error("The lost pet report could not be deleted.");
  }

  redirect("/lost-pets/reports");
}

export async function createLostPetReport(
  _previousState: ReportActionState,
  formData: FormData,
): Promise<ReportActionState> {
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) redirect("/sign-in");

  const selectedPetId = String(formData.get("petId") ?? "").trim();
  const lastSeenAt = String(formData.get("lastSeenAt") ?? "").trim();
  const location = String(formData.get("lastSeenLocation") ?? "").trim();
  const latitude = Number(formData.get("latitude") ?? "");
  const longitude = Number(formData.get("longitude") ?? "");
  const contactMethod = String(formData.get("contactMethod") ?? "");
  const contactValue = contactMethod === "email"
    ? user.email ?? ""
    : String(user.user_metadata.phone ?? "").trim();

  if (!lastSeenAt || !location || !Number.isFinite(latitude) || latitude < -90 ||
      latitude > 90 || !Number.isFinite(longitude) || longitude < -180 ||
      longitude > 180 || !["email", "phone"].includes(contactMethod)) {
    return { error: "Complete the last-seen and contact information." };
  }
  if (contactMethod === "phone" && !contactValue) {
    return { error: "Add a phone number to your profile before choosing phone contact." };
  }

  let petId = selectedPetId;
  if (!petId) {
    const name = String(formData.get("petName") ?? "").trim();
    const species = String(formData.get("petSpecies") ?? "");
    const breed = String(formData.get("petBreed") ?? "").trim();
    const color = String(formData.get("petColor") ?? "").trim();
    const size = String(formData.get("petSize") ?? "");
    const age = Number(formData.get("petAge") ?? "");
    const image = formData.get("petImage");

    if (!name || !["dog", "cat"].includes(species) || !breed || !color ||
        !["small", "medium", "large"].includes(size) ||
        !Number.isInteger(age) || age < 0 || age > 200 ||
        !(image instanceof File) || image.size === 0) {
      return { error: "Complete every new pet field and choose an image." };
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(image.type) ||
        image.size > 5 * 1024 * 1024) {
      return { error: "Use a JPG, PNG, or WebP image smaller than 5 MB." };
    }

    petId = crypto.randomUUID();
    const imagePath = `${user.id}/${petId}-${crypto.randomUUID()}`;
    const { error: uploadError } = await supabase.storage
      .from("pet-images")
      .upload(imagePath, image, { contentType: image.type, upsert: false });
    if (uploadError) return { error: "The pet image could not be uploaded. Please try again." };

    const { error: petError } = await supabase.from("pets").insert({
      id: petId, owner_id: user.id, name, species, breed, color, size, age, image_path: imagePath,
    });
    if (petError) {
      await supabase.storage.from("pet-images").remove([imagePath]);
      return { error: "The new pet could not be saved. Please try again." };
    }
  }

  const { data: ownedPet } = await supabase.from("pets")
    .select("id").eq("id", petId).eq("owner_id", user.id).single();
  if (!ownedPet) return { error: "Select one of your pet profiles." };

  const { error } = await supabase.from("lost_pet_reports").insert({
    pet_id: petId,
    owner_id: user.id,
    last_seen_at: new Date(lastSeenAt).toISOString(),
    last_seen_location: location,
    latitude,
    longitude,
    contact_method: contactMethod,
    contact_value: contactValue,
  });
  if (error) {
    return { error: error.code === "23505"
      ? "This pet already has an active lost report."
      : "The lost pet report could not be saved. Please try again." };
  }

  redirect("/lost-pets/reports");
}
