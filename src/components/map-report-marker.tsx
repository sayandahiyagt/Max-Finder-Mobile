// One small, individual dot for one Lost Pet Report or Spotting.

import { CircleMarker, Popup } from "react-leaflet";
import Image from "next/image";
import Link from "next/link";

import { LocalizedDateTime } from "@/components/localized-date-time";
import type { MapReport } from "@/features/search/types";

// Keep these colours aligned with the Lost Pet Report and Spotting map legend.
const lostPinColor = "#ef4444";
const spottedPinColor = "#4f94d0";

/**
 * Shrink dots when the map shows a large area so dense activity reads as a
 * field of points instead of overlapping into oversized blobs.
 */
export function getMapPointRadius(zoom: number): number {
  if (zoom <= 3) return 1.1;
  if (zoom <= 4) return 1.5;
  if (zoom <= 6) return 2.2;
  if (zoom <= 8) return 2.8;
  if (zoom <= 10) return 3.5;
  if (zoom <= 12) return 4.25;
  return 5;
}

export function MapReportMarker({
  report,
  zoom,
}: {
  report: MapReport;
  zoom: number;
}) {
  // Lost-pet reports and spottings differ only by colour and dot size, so both
  // values are derived once here.
  const isLostReport = report.type === "lost";
  // The colour used by this type of activity point.
  const pinColor = isLostReport ? lostPinColor : spottedPinColor;
  // Scale the clickable point with the current zoom while preserving its true
  // position and existing individual report popup.
  const pinRadius = getMapPointRadius(zoom);

  return (
    <CircleMarker
      // Keep the pin at the exact coordinates returned by the public map API.
      center={report.position}
      // Draw a compact vector dot without a separate glow or count label.
      radius={pinRadius}
      // A subtle dark edge preserves the colour against both light and dark tiles.
      color="#17231f"
      weight={zoom <= 3 ? 0.45 : 0.7}
      opacity={zoom <= 3 ? 0.65 : 0.85}
      // Activity type is shown by the coral or blue fill.
      fillColor={pinColor}
      // Opaque dots stay crisp when several points are close together.
      fillOpacity={zoom <= 3 ? 0.72 : 0.95}
    >
      <Popup>
        <div className="map-popup">
          {report.imageUrl ? (
            <Image
              className="map-popup-image"
              src={report.imageUrl}
              width={190}
              height={120}
              unoptimized
              alt={`${isLostReport ? "Lost pet" : "Spotted pet"} photo`}
            />
          ) : (
            <div className="map-popup-image-placeholder">
              No image available
            </div>
          )}
          <span className={`popup-badge ${report.type}`}>
            {isLostReport ? "Lost pet" : "Spotting"}
          </span>
          {report.name && <strong>{report.name}</strong>}
          <span>{report.locationLabel ?? "Address unavailable"}</span>
          <small>
            <LocalizedDateTime value={report.timestamp} />
          </small>
          <Link
            href={
              isLostReport
                ? `/lost-pets/reports/${report.id}`
                : `/spottings/${report.id}`
            }
          >
            View details →
          </Link>
        </div>
      </Popup>
    </CircleMarker>
  );
}
