import { redirect } from "next/navigation";
import Link from "next/link";

import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import styles from "../../protected-page.module.css";

export default async function MyLostPetReportsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/sign-in");

  const { data: reports } = await supabase
    .from("lost_pet_reports")
    .select("id, pet_id, status, last_seen_at, last_seen_location, contact_method, contact_value")
    .eq("owner_id", authData.user.id)
    .order("created_at", { ascending: false });
  const reportCards = await Promise.all((reports ?? []).map(async (report) => {
    const { data: pet } = await supabase.from("pets")
      .select("species, breed").eq("id", report.pet_id).single();
    return { report, pet, imageUrl: `/api/lost-pets/${report.id}/image` };
  }));

  return (
    <main className={styles.page}>
      <AppHeader />
      <section className={styles.content}>
        <p className={styles.eyebrow}>Your reports</p>
        <h1>My lost pet reports</h1>
        <div className={styles.reportList}>
          {reportCards.length === 0 && <p className={styles.emptyState}>You have not created any reports.</p>}
          {reportCards.map(({ report, pet, imageUrl }) => {
            return (
              <Link className={styles.reportCard} href={`/lost-pets/reports/${report.id}`} key={report.id}>
                {imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className={styles.reportPetImage} src={imageUrl} alt="Lost pet" />
                )}
                <p>{pet?.species === "dog" ? "Dog" : "Cat"} · {pet?.breed ?? "Breed unavailable"}</p>
                <p>Last seen: {report.last_seen_location}</p>
                <p>{new Date(report.last_seen_at).toLocaleString()}</p>
              </Link>
            );
          })}
        </div>
      </section>
      <BottomNav />
    </main>
  );
}
