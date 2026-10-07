"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type PetActionState = { error?: string };

export async function deletePet(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;

  if (!user) {
    redirect("/sign-in");
  }

  const petId = String(formData.get("petId") ?? "").trim();
  if (!petId) {
    redirect("/profile");
  }

  const { data: pet } = await supabase
    .from("pets")
    .select("image_path")
    .eq("id", petId)
    .eq("owner_id", user.id)
    .single();

  if (!pet) {
    redirect("/profile");
  }

  const { error } = await supabase
    .from("pets")
    .delete()
    .eq("id", petId)
    .eq("owner_id", user.id);

  if (!error) {
    await supabase.storage.from("pet-images").remove([pet.image_path]);
  }

  redirect("/profile");
}

export async function savePet(
  _previousState: PetActionState,
  formData: FormData,
): Promise<PetActionState> {
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;

  if (!user) {
    redirect("/sign-in");
  }

  const name = String(formData.get("name") ?? "").trim();
  const species = String(formData.get("species") ?? "");
  const breed = String(formData.get("breed") ?? "").trim();
  const color = String(formData.get("color") ?? "").trim();
  const size = String(formData.get("size") ?? "");
  const ageValue = String(formData.get("age") ?? "");
  const age = Number(ageValue);
  const image = formData.get("image");

  if (!name || !["dog", "cat"].includes(species) || !breed || !color ||
      !["small", "medium", "large"].includes(size) ||
      !Number.isInteger(age) || age < 0 || age > 200) {
    return { error: "Complete every pet field." };
  }

  const petIdValue = String(formData.get("petId") ?? "").trim();
  const petId = petIdValue || crypto.randomUUID();
  const existing = petIdValue
    ? await supabase.from("pets").select("image_path").eq("id", petId).eq("owner_id", user.id).single()
    : { data: null, error: null };

  if (petIdValue && !existing.data) {
    return { error: "That pet profile could not be found." };
  }

  let imagePath = existing.data?.image_path ?? "";
  if (image instanceof File && image.size > 0) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(image.type) ||
        image.size > 5 * 1024 * 1024) {
      return { error: "Use a JPG, PNG, or WebP image smaller than 5 MB." };
    }
    imagePath = `${user.id}/${petId}-${crypto.randomUUID()}`;
    const { error: uploadError } = await supabase.storage
      .from("pet-images")
      .upload(imagePath, image, { contentType: image.type, upsert: false });
    if (uploadError) {
      return { error: "The pet image could not be uploaded. Please try again." };
    }
  }

  if (!imagePath) {
    return { error: "Choose an image for this pet." };
  }

  const petData = {
    owner_id: user.id,
    name,
    species,
    breed,
    color,
    size,
    age,
    image_path: imagePath,
  };
  const { error: saveError } = petIdValue
    ? await supabase.from("pets").update(petData).eq("id", petId).eq("owner_id", user.id)
    : await supabase.from("pets").insert({ id: petId, ...petData });

  if (saveError) {
    if (image instanceof File && image.size > 0) {
      await supabase.storage.from("pet-images").remove([imagePath]);
    }
    return { error: "The pet profile could not be saved. Please try again." };
  }

  if (petIdValue && image instanceof File && image.size > 0 &&
      existing.data?.image_path && existing.data.image_path !== imagePath) {
    await supabase.storage.from("pet-images").remove([existing.data.image_path]);
  }

  redirect("/profile");
}
