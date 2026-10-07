import { redirect } from "next/navigation";
import Link from "next/link";

import { BottomNav } from "@/components/bottom-nav";
import { ProfileForm } from "@/components/profile-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/app-header";
import styles from "../protected-page.module.css";

export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const { data: pets } = await supabase
    .from("pets")
    .select("id, name, species, breed, image_path")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  const petPreviews = await Promise.all(
    (pets ?? []).map(async (pet) => {
      const { data } = await supabase.storage
        .from("pet-images")
        .createSignedUrl(pet.image_path, 3600);
      return { ...pet, imageUrl: data?.signedUrl ?? null };
    }),
  );

  return (
    <main className={styles.page}>
      <AppHeader />
      <section className={styles.content}>
        <p className={styles.eyebrow}>Your account</p>
        <h1>Profile</h1>
        <p className={styles.email}>{user.email}</p>
        <ProfileForm
          displayName={user.user_metadata.display_name ?? ""}
          phone={user.user_metadata.phone ?? ""}
        />
        <div className={styles.petsHeading}>
          <h2>My pets</h2>
          <span>{petPreviews.length}</span>
        </div>
        <div className={styles.petGrid}>
          {petPreviews.map((pet) => (
            <Link className={styles.petCard} href={`/profile/pets/${pet.id}`} key={pet.id}>
              {pet.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={pet.imageUrl} alt="" />
              ) : <div className={styles.petImagePlaceholder}>No image</div>}
              <strong>{pet.name}</strong>
              <span>{pet.species === "dog" ? "Dog" : "Cat"} · {pet.breed}</span>
            </Link>
          ))}
          <Link className={styles.addPetCard} href="/profile/pets/new" aria-label="Add a new pet">
            <span aria-hidden="true">+</span>
            <strong>Add pet</strong>
          </Link>
        </div>
      </section>
      <BottomNav />
    </main>
  );
}
