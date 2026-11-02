import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { LocalizedDateTime } from "@/components/localized-date-time";
import { ReportLocationMap } from "@/components/report-location-map";
import { getSpotting } from "@/features/spottings/application";
import { formatStoredLocationLabel } from "@/lib/location-contract";
import { getPublicImageUrl } from "@/lib/supabase/storage";

export default async function SpottingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const [{ id }, { created }] = await Promise.all([params, searchParams]);
  const spotting = await getSpotting(id);
  if (!spotting) notFound();

  const locationLabel = formatStoredLocationLabel(spotting.locationLabel);
  const imageUrl = getPublicImageUrl("spotting-images", spotting.imagePath);

  return (
    <AppShell active="Spottings">
      <main className="app-main">
        <div className="detail-layout">
          <article className="detail-card">
            {created && (
              <div className="notice">
                Spotting published. Thank you for helping the community.
              </div>
            )}
            <span className="status-pill found">Spotting</span>
            <h1>Spotted {spotting.species}</h1>
            <p>{spotting.description ?? "No description was provided."}</p>
            <div className="detail-image">
              {imageUrl ? (
                <Image
                  src={imageUrl}
                  width={1280}
                  height={640}
                  unoptimized
                  alt="Pet spotting"
                />
              ) : (
                "Spotting image"
              )}
            </div>
            <ReportLocationMap
              latitude={spotting.latitude}
              longitude={spotting.longitude}
              label={locationLabel}
            />
            <div className="detail-meta">
              <div>
                <strong>Spotted</strong>
                <LocalizedDateTime value={spotting.spottedAt} />
              </div>
              <div>
                <strong>Breed</strong>
                <span>{spotting.breed ?? "Unknown"}</span>
              </div>
              <div>
                <strong>Weight</strong>
                <span>{spotting.weightRange ?? "Unknown"}</span>
              </div>
            </div>
            <h2>Distinguishing characteristics</h2>
            <p>{spotting.distinguishingCharacteristics ?? "None provided."}</p>
          </article>
          <aside className="detail-card detail-actions">
            <Link className="secondary-button" href="/">
              Return to map
            </Link>
          </aside>
        </div>
      </main>
    </AppShell>
  );
}
