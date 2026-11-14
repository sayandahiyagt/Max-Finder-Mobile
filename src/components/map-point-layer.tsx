import { useState } from "react";
import { useMap, useMapEvents } from "react-leaflet";
import { MapReportMarker } from "@/components/map-report-marker";
import type { MapReport } from "@/features/search/types";

// Render every activity record as its own dot at every zoom level.
export function MapPointLayer({ reports }: { reports: MapReport[] }) {
  const map = useMap();
  const [zoom, setZoom] = useState(() => map.getZoom());

  useMapEvents({
    zoomend: () => setZoom(map.getZoom()),
  });

  // Draw red reports after blue spottings so red remains visible where the
  // individual dots are close together at U.S. zoom.
  const drawOrder = [...reports].sort(
    (left, right) => Number(left.type === "lost") - Number(right.type === "lost"),
  );

  return drawOrder.map((report) => (
    <MapReportMarker key={report.id} report={report} zoom={zoom} />
  ));
}
