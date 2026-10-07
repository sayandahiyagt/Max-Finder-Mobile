import { notFound, redirect } from "next/navigation";

import { AppHeader } from "@/components/app-header";
import { BackButton } from "@/components/back-button";
import { BottomNav } from "@/components/bottom-nav";
import { PetForm } from "@/components/pet-form";
import { DeletePetButton } from "@/components/delete-pet-button";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import styles from "../../../../protected-page.module.css";

export default async function EditPetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/sign-in");

  const { data: pet } = await supabase
    .from("pets")
    .select("id, name, species, breed, color, size, age, image_path")
    .eq("id", id)
    .eq("owner_id", authData.user.id)
    .single();
  if (!pet) notFound();

  const { data: image } = await supabase.storage
    .from("pet-images")
    .createSignedUrl(pet.image_path, 3600);

  return (
    <main className={styles.page}>
      <AppHeader />
      <section className={styles.content}>
        <BackButton />
        <p className={styles.eyebrow}>Pet profile</p>
        <h1>Edit {pet.name}</h1>
        <PetForm pet={{ ...pet, imageUrl: image?.signedUrl }} />
        <DeletePetButton petId={pet.id} />
      </section>
      <BottomNav />
    </main>
  );
}
