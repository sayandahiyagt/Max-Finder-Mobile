import { notFound, redirect } from "next/navigation";

import { AppHeader } from "@/components/app-header";
import { BackButton } from "@/components/back-button";
import { BottomNav } from "@/components/bottom-nav";
import { ReportEditForm } from "@/components/report-edit-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import styles from "../../../../protected-page.module.css";

export default async function EditLostPetReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/sign-in");

  const { data: report } = await supabase
    .from("lost_pet_reports")
    .select("id, last_seen_at, last_seen_location, latitude, longitude, contact_method, pet_id")
    .eq("id", id)
    .eq("owner_id", authData.user.id)
    .single();
  if (!report) notFound();

  const { data: pet } = await supabase.from("pets")
    .select("name").eq("id", report.pet_id).single();

  return (
    <main className={styles.page}>
      <AppHeader />
      <section className={styles.content}>
        <BackButton />
        <p className={styles.eyebrow}>Lost pet report</p>
        <h1>Edit {pet?.name ?? "report"}</h1>
        <ReportEditForm
          report={report}
          phone={authData.user.user_metadata.phone}
        />
      </section>
      <BottomNav />
    </main>
  );
}
