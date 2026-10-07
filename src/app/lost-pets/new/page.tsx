import { redirect } from "next/navigation";

import { AppHeader } from "@/components/app-header";
import { BackButton } from "@/components/back-button";
import { BottomNav } from "@/components/bottom-nav";
import { LostReportForm } from "@/components/lost-report-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import styles from "../../protected-page.module.css";

export default async function NewLostPetReportPage({
  searchParams,
}: {
  searchParams: Promise<{ petId?: string }>;
}) {
  const { petId } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/sign-in");

  const { data: pets } = await supabase
    .from("pets").select("id, name, species")
    .eq("owner_id", authData.user.id).order("name");

  return (
    <main className={styles.page}>
      <AppHeader />
      <section className={styles.content}>
        <BackButton />
        <p className={styles.eyebrow}>Lost pet report</p>
        <h1>Report a lost pet</h1>
        <LostReportForm
          pets={pets ?? []}
          phone={authData.user.user_metadata.phone}
          initialPetId={pets?.some((pet) => pet.id === petId) ? petId : ""}
        />
      </section>
      <BottomNav />
    </main>
  );
}
