import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";

import { createConversation } from "@/app/messages/actions";
import { AppShell } from "@/components/app-shell";
import { LocalizedDateTime } from "@/components/localized-date-time";
import {
  RelatedSpottings,
  type RelatedSpottingView,
} from "@/components/related-spottings";
import { ReportLocationMap } from "@/components/report-location-map";
import { getReportForViewer } from "@/features/lost-pets/application";
import { findRelatedSpottings } from "@/features/search/application";
import { parseCoordinates } from "@/lib/coordinates";
import { formatStoredLocationLabel } from "@/lib/location-contract";
import {
  getPetImageUrl,
  getPublicImageUrl,
} from "@/lib/supabase/storage";
import { getOptionalUser } from "@/lib/auth";

export default async function LostPetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getOptionalUser();
  const isAuthenticated = user !== null;
  const actor = user?.actor ?? null;
  const report = await getReportForViewer(id, actor?.userId);
  if (!report) notFound();

  const coordinates = parseCoordinates(report.latitude, report.longitude);
  const locationLabel = formatStoredLocationLabel(report.locationLabel);
  const imageUrl = await getPetImageUrl(report.imagePath);

  let relatedSpottings: RelatedSpottingView[] = [];
  if (report.status === "LOST" && coordinates) {
    const matches = await findRelatedSpottings(
      {
        species: report.species,
        breed: report.breed,
        weightRange: report.weightRange,
        description: report.description,
        ...coordinates,
        lastSeenAt: report.lastSeenAt.toISOString(),
      },
    );
    relatedSpottings = matches.map((match) => ({
      ...match,
      imageUrl: getPublicImageUrl(
        "spotting-images",
        match.spotting.imagePath,
      ),
    }));
  }

  return (
    <AppShell active="Lost pets">
      <main className="app-main">
        <div className="detail-layout">
          <article className="detail-card">
            <span
              className={`status-pill ${report.status === "FOUND" ? "found" : "lost"}`}
            >
              {report.status}
            </span>
            <h1>{report.petName}</h1>
            <p className="muted">
              {report.species} · {report.breed}
            </p>
            <h2>About {report.petName}</h2>
            <p>{report.description}</p>
            <div className="detail-image">
              {imageUrl ? (
                <Image
                  src={imageUrl}
                  width={1280}
                  height={640}
                  unoptimized
                  alt={`${report.petName} profile`}
                />
              ) : (
                "Pet image"
              )}
            </div>
            {coordinates && (
              <ReportLocationMap
                latitude={coordinates.latitude}
                longitude={coordinates.longitude}
                label={locationLabel}
              />
            )}
            <div className="detail-meta">
              <div>
                <strong>Last seen</strong>
                <LocalizedDateTime value={report.lastSeenAt} />
              </div>
              <div>
                <strong>Weight</strong>
                <span>{report.weightRange}</span>
              </div>
              <div>
                <strong>Report created</strong>
                <LocalizedDateTime value={report.createdAt} dateOnly />
              </div>
            </div>
          </article>
          <aside className="detail-card detail-actions">
            {report.status === "LOST" &&
              isAuthenticated &&
              actor?.userId !== report.ownerId &&
              report.contactMethod === "in_app" && (
                <form action={createConversation}>
                  <input type="hidden" name="reportId" value={report.id} />
                  <button className="primary-button" type="submit">
                    Message owner
                  </button>
                </form>
              )}
            {report.status === "LOST" &&
              isAuthenticated &&
              actor?.userId !== report.ownerId &&
              report.contactMethod === "email" &&
              report.contactValue && (
                <a
                  className="primary-button"
                  href={`mailto:${report.contactValue}`}
                >
                  Email owner
                </a>
              )}
            {report.status === "LOST" &&
              isAuthenticated &&
              actor?.userId !== report.ownerId &&
              report.contactMethod === "phone" &&
              report.contactValue && (
                <a
                  className="primary-button"
                  href={`tel:${report.contactValue}`}
                >
                  Call owner
                </a>
              )}
            {report.contactInstructions && (
              <p className="muted">{report.contactInstructions}</p>
            )}
            {actor?.userId === report.ownerId && (
              <Link
                className="secondary-button"
                href={`/lost-pets/reports/${report.id}/edit`}
              >
                Edit report
              </Link>
            )}
            <Link className="secondary-button" href="/">
              Back to map
            </Link>
          </aside>
          {report.status === "LOST" && (
            <RelatedSpottings matches={relatedSpottings} />
          )}
        </div>
      </main>
    </AppShell>
  );
}
