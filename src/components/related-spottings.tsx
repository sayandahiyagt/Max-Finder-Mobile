import Link from "next/link";

import type { RelatedSpotting } from "@/lib/matching";

export type RelatedSpottingView = RelatedSpotting & { imageUrl: string | null };

export function RelatedSpottings({ matches }: { matches: RelatedSpottingView[] }) {
  return (
    <section className="detail-card related-spottings" aria-labelledby="related-spottings-heading">
      <h2 id="related-spottings-heading">Possible related spottings</h2>
      <p className="muted">
        These are possible matches based on report details, distance, and time. They are not confirmed matches. Compare the photos and details carefully.
      </p>
      {matches.length === 0 ? (
        <p className="related-spottings-empty">No likely spottings have been found yet.</p>
      ) : (
        <div className="related-spottings-grid">
          {matches.map(({ spotting, distanceMiles, factors, imageUrl }) => (
            <article className="related-spotting-card" key={spotting.id}>
              {imageUrl ? (
                <img src={imageUrl} alt="Pet shown in a possible related spotting" />
              ) : (
                <div className="related-spotting-placeholder">No spotting image</div>
              )}
              <div>
                <span className="status-pill found">Possible match</span>
                <h3>{spotting.breed ?? spotting.species ?? "Pet spotting"}</h3>
                <p>{spotting.locationLabel ?? "Address unavailable"}</p>
                <p>{new Date(spotting.spottedAt).toLocaleString()} · {distanceMiles.toFixed(1)} miles away</p>
                <p>{factors.join(" · ")}</p>
                <Link className="secondary-button" href={`/spottings/${spotting.id}`}>
                  Review spotting
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
