import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { LostPetSearchResults } from "@/components/lost-pet-search-results";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import styles from "../../protected-page.module.css";

export default async function SearchLostPetsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();

  const { data: reports } = await supabase
    .from("lost_pet_reports")
    .select("id, pet_id, owner_id, last_seen_at, last_seen_location, latitude, longitude")
    .eq("status", "LOST")
    .order("created_at", { ascending: false });
  const visibleReports = (reports ?? []).filter(
    (report) => report.owner_id !== authData.user?.id,
  );
  const reportCards = await Promise.all(visibleReports.map(async (report) => {
    const { data: pet } = await supabase.from("pets")
      .select("name, species, breed").eq("id", report.pet_id).single();
    return {
      id: report.id,
      last_seen_at: report.last_seen_at,
      last_seen_location: report.last_seen_location,
      latitude: report.latitude,
      longitude: report.longitude,
      pet,
    };
  }));

  return (
    <main className={styles.page}>
      <AppHeader />
      <section className={styles.content}>
        <p className={styles.eyebrow}>Find a pet</p>
        <h1>Lost pets</h1>
        <LostPetSearchResults reports={reportCards} />
      </section>
      <BottomNav />
    </main>
  );
}
