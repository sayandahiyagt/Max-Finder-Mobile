import Link from "next/link";
import { notFound } from "next/navigation";

import { createConversation } from "@/app/messages/actions";
import { AppShell } from "@/components/app-shell";
import { RelatedSpottings, type RelatedSpottingView } from "@/components/related-spottings";
import { ReportLocationMap } from "@/components/report-location-map";
import { reverseGeocode } from "@/lib/geocoding";
import {
  parseSpottingCandidates,
  rankRelatedSpottings,
} from "@/lib/matching";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function LostPetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: report } = await supabase
    .from("lost_pet_reports")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!report) notFound();

  const storedLocation = String(report.location_label ?? "").trim();
  const locationLabel = /^(?:your )?current location$|^selected map location$|^finding address…?$|^address unavailable$/i.test(
    storedLocation,
  )
    ? await reverseGeocode(Number(report.latitude), Number(report.longitude)) ??
      "Address unavailable"
    : storedLocation;
  const imageUrl = report.image_path
    ? supabase.storage
        .from("lost-pet-images")
        .getPublicUrl(report.image_path).data.publicUrl
    : null;

  let relatedSpottings: RelatedSpottingView[] = [];
  if (report.status === "LOST") {
    const { data: spottingRows } = await supabase
      .from("spottings")
      .select("*")
      .order("spotted_at", { ascending: false })
      .limit(100);
    const matches = rankRelatedSpottings(
      {
        species: report.species,
        breed: report.breed,
        weightRange: report.weight_range,
        description: report.description,
        latitude: Number(report.latitude),
        longitude: Number(report.longitude),
        lastSeenAt: report.last_seen_at,
      },
      parseSpottingCandidates(spottingRows ?? []),
    );
    relatedSpottings = matches.map((match) => ({
      ...match,
      imageUrl: match.spotting.imagePath
        ? supabase.storage
            .from("spotting-images")
            .getPublicUrl(match.spotting.imagePath).data.publicUrl
        : null,
    }));
  }

  return (
    <AppShell active="Lost pets">
      <main className="app-main">
        <div className="detail-layout">
          <article className="detail-card">
            <span className={`status-pill ${report.status === "FOUND" ? "found" : "lost"}`}>
              {report.status}
            </span>
            <h1>{report.pet_name}</h1>
            <p className="muted">{report.species} · {report.breed}</p>
            <h2>About {report.pet_name}</h2>
            <p>{report.description}</p>
            <div className="detail-image">
              {imageUrl ? <img src={imageUrl} alt={`${report.pet_name} profile`} /> : "Pet image"}
            </div>
            <ReportLocationMap
              latitude={Number(report.latitude)}
              longitude={Number(report.longitude)}
              label={locationLabel}
            />
            <div className="detail-meta">
              <div><strong>Last seen</strong><span>{new Date(report.last_seen_at).toLocaleString()}</span></div>
              <div><strong>Weight</strong><span>{report.weight_range}</span></div>
              <div><strong>Report created</strong><span>{new Date(report.created_at).toLocaleDateString()}</span></div>
            </div>
          </article>
          <aside className="detail-card detail-actions">
            {report.status === "LOST" && user?.id !== report.owner_id && (
              <form action={createConversation}>
                <input type="hidden" name="reportId" value={report.id} />
                <button className="primary-button" type="submit">Message owner</button>
              </form>
            )}
            {user?.id === report.owner_id && (
              <Link className="secondary-button" href={`/lost-pets/reports/${report.id}/edit`}>
                Edit report
              </Link>
            )}
            <Link className="secondary-button" href="/">Back to map</Link>
          </aside>
          {report.status === "LOST" && <RelatedSpottings matches={relatedSpottings} />}
        </div>
      </main>
    </AppShell>
  );
}
