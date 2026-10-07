import { redirect } from "next/navigation";

import { AppHeader } from "@/components/app-header";
import { BackButton } from "@/components/back-button";
import { PetForm } from "@/components/pet-form";
import { BottomNav } from "@/components/bottom-nav";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import styles from "../../../protected-page.module.css";

export default async function NewPetPage() {
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    redirect("/sign-in");
  }

  return (
    <main className={styles.page}>
      <AppHeader />
      <section className={styles.content}>
        <BackButton />
        <p className={styles.eyebrow}>Pet profile</p>
        <h1>Add a pet</h1>
        <PetForm />
      </section>
      <BottomNav />
    </main>
  );
}
