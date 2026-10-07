import { notFound } from "next/navigation";

import { deleteLostPetReport, markLostPetFound } from "@/app/lost-pets/actions";
import { startConversation } from "@/app/messages/actions";
import { AppHeader } from "@/components/app-header";
import { BackButton } from "@/components/back-button";
import { BottomNav } from "@/components/bottom-nav";
import { ReportLocationMap } from "@/components/report-location-map";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import styles from "../../../protected-page.module.css";

export default async function LostPetReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();

  const { data: report } = await supabase
    .from("lost_pet_reports")
    .select("id, owner_id, pet_id, status, last_seen_at, last_seen_location, latitude, longitude, contact_method, contact_value")
    .eq("id", id)
    .single();

  if (!report || (report.status !== "LOST" &&
      report.owner_id !== authData.user?.id)) notFound();
  const { data: pet } = await supabase.from("pets")
    .select("name, species, breed, color, age, size")
    .eq("id", report.pet_id).single();

  return (
    <main className={styles.page}>
      <AppHeader />
      <section className={styles.content}>
        <BackButton />
        <p className={styles.eyebrow}>Lost pet report</p>
        <h1>{pet?.name ?? "Lost pet"}</h1>
        <p className={styles.status}>{report.status}</p>
        <div className={styles.reportCard}>
          {report.status === "LOST" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className={styles.reportPetImage} src={`/api/lost-pets/${report.id}/image`} alt="" />
          )}
          <p>{pet?.species === "dog" ? "Dog" : "Cat"} · {pet?.breed} · {pet?.color}</p>
          <p>Age: {pet?.age} {pet?.age === 1 ? "year" : "years"}</p>
          <p>Weight range: {pet?.size === "small" ? "Under 20 lb" : pet?.size === "medium" ? "20–50 lb" : "Over 50 lb"}</p>
          <p>Last seen: {report.last_seen_location}</p>
          <p>{new Date(report.last_seen_at).toLocaleString()}</p>
          {typeof report.latitude === "number" && typeof report.longitude === "number" && (
            <ReportLocationMap latitude={report.latitude} longitude={report.longitude} />
          )}
          <p className={styles.contactText}>
            Contact by {report.contact_method}: {report.contact_value}
          </p>
        </div>
        {report.status === "LOST" && report.owner_id === authData.user?.id && (
          <>
            <a className={styles.editPetButton} href={`/lost-pets/reports/${id}/edit`}>
              Edit report
            </a>
            <form action={markLostPetFound}>
              <input type="hidden" name="reportId" value={id} />
              <button className={styles.foundButton} type="submit">Report found</button>
            </form>
          </>
        )}
        {report.owner_id === authData.user?.id && (
          <form action={deleteLostPetReport}>
            <input type="hidden" name="reportId" value={id} />
            <button className={styles.deletePetButton} type="submit">Delete report</button>
          </form>
        )}
        {report.owner_id !== authData.user?.id && report.status === "LOST" && (
          <form action={startConversation}>
            <input type="hidden" name="reportId" value={id} />
            <button className={styles.contactOwnerButton} type="submit">
              Contact owner
            </button>
          </form>
        )}
      </section>
      <BottomNav />
    </main>
  );
}
