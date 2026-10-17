"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { uploadImage } from "@/lib/supabase/upload";
import { reverseGeocode } from "@/lib/geocoding";

export async function createSpotting(formData: FormData) {
  const value = (name: string, max = 2000) => {
    const result = String(formData.get(name) ?? "").trim();
    if (result.length > max) throw new Error(`Invalid ${name}.`);
    return result || null;
  };
  const spottedAt = String(formData.get("spottedAtOverride") || formData.get("spottedAt") || new Date().toISOString());
  const species = value("speciesOverride", 20) ?? value("species", 20);
  if (species !== "Dog" && species !== "Cat") {
    throw new Error("Please select whether the spotted pet is a dog or cat.");
  }
  const breed = value("breedOverride", 100) ?? value("breed", 100);
  const weightRange = value("weightRangeOverride", 30) ?? value("weightRange", 30);
  const description = value("descriptionOverride") ?? value("description");
  const distinguishingCharacteristics = value("distinguishingCharacteristicsOverride") ?? value("distinguishingCharacteristics");
  const latitudeValue = formData.get("latitudeOverride") || formData.get("latitude");
  const longitudeValue = formData.get("longitudeOverride") || formData.get("longitude");
  const latitude = Number(latitudeValue);
  const longitude = Number(longitudeValue);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error("Please provide an image, time, and location.");
  }
  const locationLabel = await reverseGeocode(latitude, longitude);
  if (!locationLabel) {
    throw new Error("Could not determine an address for this spotting location.");
  }
  const { admin, path: imagePath } = await uploadImage(
    formData.get("image"),
    "spotting-images",
    "anonymous",
  );
  const { data, error } = await admin.from("spottings").insert({
    species, breed, weight_range: weightRange, description, distinguishing_characteristics: distinguishingCharacteristics,
    spotted_at: new Date(spottedAt).toISOString(), latitude, longitude, location_label: locationLabel, image_path: imagePath,
  }).select("id").single();
  if (error) {
    await admin.storage.from("spotting-images").remove([imagePath]);
    throw new Error("Could not publish this spotting.");
  }
  revalidatePath("/");
  redirect(`/spottings/${data.id}?created=1`);
}
