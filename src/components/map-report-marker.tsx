import { CircleMarker, Popup } from "react-leaflet";
import Image from "next/image";
import Link from "next/link";

import { LocalizedDateTime } from "@/components/localized-date-time";
import type { MapReport } from "@/features/search/types";

export function MapReportMarker({ report }: { report: MapReport }) {
  const isLostReport = report.type === "lost";
  return (
    <CircleMarker
      center={report.position}
      radius={isLostReport ? 11 : 9}
      pathOptions={{
        color: "#fff",
        fillColor: isLostReport ? "#ed725d" : "#4f94d0",
        fillOpacity: 1,
        weight: 3,
      }}
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
