import { notFound, redirect } from "next/navigation";

import { BottomNav } from "@/components/bottom-nav";
import { AppHeader } from "@/components/app-header";
import { BackButton } from "@/components/back-button";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import styles from "../../../protected-page.module.css";

export default async function PetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    redirect("/sign-in");
  }

  const { data: pet } = await supabase
    .from("pets")
    .select("name, species, breed, color, size, age, image_path")
    .eq("id", id)
    .eq("owner_id", authData.user.id)
    .single();

  if (!pet) {
    notFound();
  }

  const { data: image } = await supabase.storage
    .from("pet-images")
    .createSignedUrl(pet.image_path, 3600);

  return (
    <main className={styles.page}>
      <AppHeader />
      <section className={styles.content}>
        <BackButton />
        <p className={styles.eyebrow}>Pet profile</p>
        <h1>{pet.name}</h1>
        {image?.signedUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className={styles.petDetailImage} src={image.signedUrl} alt={`${pet.name}`} />
        )}
        <dl className={styles.petDetails}>
          <dt>Species</dt><dd>{pet.species === "dog" ? "Dog" : "Cat"}</dd>
          <dt>Breed</dt><dd>{pet.breed}</dd>
          <dt>Color</dt><dd>{pet.color}</dd>
          <dt>Size</dt><dd>{pet.size}</dd>
          <dt>Age</dt><dd>{pet.age} {pet.age === 1 ? "year" : "years"}</dd>
        </dl>
        <button className={styles.reportLostButton} type="button">
          Report lost
        </button>
        <a className={styles.editPetButton} href={`/profile/pets/${id}/edit`}>Edit pet profile</a>
      </section>
      <BottomNav />
    </main>
  );
}
