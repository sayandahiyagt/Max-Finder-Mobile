"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";

import { requireUser } from "@/lib/supabase/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { uploadImage } from "@/lib/supabase/upload";
import { reverseGeocode } from "@/lib/geocoding";

const allowedWeights = ["Under 10 lbs", "10–25 lbs", "26–50 lbs", "51–75 lbs", "Over 75 lbs", "Unknown"];

function text(formData: FormData, name: string, max = 2000) {
  const value = String(formData.get(name) ?? "").trim();
  if (!value || value.length > max) throw new Error(`Invalid ${name}.`);
  return value;
}

export async function createLostPet(formData: FormData) {
  const { user } = await requireUser();
  const admin = createSupabaseAdminClient();
  const petName = text(formData, "petName", 100);
  const species = text(formData, "species", 20);
  const breed = text(formData, "breed", 100);
  const weightRange = text(formData, "weightRange", 30);
  const description = text(formData, "description");
  let locationLabel = text(formData, "locationLabel", 255);
  const latitude = Number(formData.get("latitude"));
  const longitude = Number(formData.get("longitude"));
  const lastSeenAt = String(formData.get("lastSeenAt") ?? "");
  if (!["Dog", "Cat"].includes(species) || !allowedWeights.includes(weightRange) ||
      !Number.isFinite(latitude) || !Number.isFinite(longitude) ||
      !lastSeenAt || Number.isNaN(new Date(lastSeenAt).getTime())) {
    throw new Error("Please complete every report field.");
  }
  if (/^(?:your )?current location$|^selected map location$|^finding address…?$|^address unavailable$/i.test(locationLabel)) {
    const geocodedLocation = await reverseGeocode(latitude, longitude);
    if (!geocodedLocation) {
      throw new Error("Could not determine an address for this report location.");
    }
    locationLabel = geocodedLocation;
  }
  const { error: profileError } = await admin.from("profiles").upsert(
    { id: user.id },
    { onConflict: "id", ignoreDuplicates: true },
  );
  if (profileError) {
    console.error("Could not ensure lost-pet report profile:", profileError);
    throw new Error("Could not prepare your account for this report.");
  }
  const { path: imagePath } = await uploadImage(
    formData.get("image"),
    "lost-pet-images",
    user.id,
  );
  const { error: petsTableError } = await admin.from("pets").select("id").limit(1);
  const usesLegacySchema = !petsTableError ||
    !["42P01", "PGRST205"].includes(petsTableError.code ?? "");
  let petId: string | null = null;
  if (usesLegacySchema) {
    petId = randomUUID();
    const legacySize =
      weightRange === "Under 10 lbs"
        ? "small"
        : weightRange === "Over 75 lbs"
          ? "large"
          : "medium";
    const { error: petError } = await admin.from("pets").insert({
      id: petId,
      owner_id: user.id,
      name: petName,
      species: species.toLowerCase(),
      breed,
      color: "Unknown",
      size: legacySize,
      age: 0,
      image_path: imagePath,
    });
    if (petError) {
      console.error("Could not create lost-pet profile:", petError);
      await admin.storage.from("lost-pet-images").remove([imagePath]);
      throw new Error("Could not prepare the lost-pet report.");
    }
  }
  let reportData: { id: string } | null = null;
  let reportErrorMessage: string | null = null;
  if (usesLegacySchema) {
    const { data, error } = await admin.from("lost_pet_reports").insert({
      owner_id: user.id, pet_id: petId, pet_name: petName, species, breed, weight_range: weightRange,
      description, last_seen_at: new Date(lastSeenAt).toISOString(), latitude, longitude,
      location_label: locationLabel, last_seen_location: locationLabel,
      contact_method: "email", contact_value: user.email ?? "",
      image_path: imagePath, status: "LOST",
    }).select("id").single();
    reportData = data;
    reportErrorMessage = error?.message ?? null;
  } else {
    const { data, error } = await admin.from("lost_pet_reports").insert({
      owner_id: user.id, pet_name: petName, species, breed, weight_range: weightRange,
      description, last_seen_at: new Date(lastSeenAt).toISOString(), latitude, longitude,
      location_label: locationLabel, image_path: imagePath, status: "LOST",
    }).select("id").single();
    reportData = data;
    reportErrorMessage = error?.message ?? null;
  }
  if (reportErrorMessage || !reportData) {
    console.error("Could not create lost-pet report:", reportErrorMessage);
    if (petId) await admin.from("pets").delete().eq("id", petId);
    await admin.storage.from("lost-pet-images").remove([imagePath]);
    throw new Error("Could not create the lost-pet report.");
  }
  revalidatePath("/");
  revalidatePath("/lost-pets");
  redirect(`/lost-pets/reports/${reportData.id}`);
}

export async function updateLostPet(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = text(formData, "id", 80);
  const status = text(formData, "status", 10);
  const description = text(formData, "description");
  const { error } = await supabase.from("lost_pet_reports").update({
    description, status: status === "FOUND" ? "FOUND" : "LOST", updated_at: new Date().toISOString(),
  }).eq("id", id).eq("owner_id", user.id);
  if (error) throw new Error("Could not update this report.");
  revalidatePath("/");
  revalidatePath("/lost-pets");
  redirect(`/lost-pets/reports/${id}`);
}

export async function deleteLostPet(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = text(formData, "id", 80);
  const { error } = await supabase.from("lost_pet_reports").delete().eq("id", id).eq("owner_id", user.id);
  if (error) throw new Error("Could not delete this report.");
  revalidatePath("/");
  redirect("/lost-pets");
}
