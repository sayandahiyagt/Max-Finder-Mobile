"use client";

import L from "leaflet";
import { MapContainer, Marker, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const reportLocationIcon = L.divIcon({
  className: "report-location-marker",
  html: "",
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

export function ReportLocationMapClient({
  latitude,
  longitude,
  label,
}: {
  latitude: number;
  longitude: number;
  label: string;
}) {
  const position: [number, number] = [latitude, longitude];

  return (
    <section className="report-location-map" aria-label="Report location">
      <div className="report-location-map-heading">
        <strong>Approximate location</strong>
        <span>{label}</span>
      </div>
      <div className="report-location-map-canvas">
        <MapContainer
          center={position}
          zoom={14}
          scrollWheelZoom={false}
          zoomControl
          dragging={false}
          doubleClickZoom={false}
          touchZoom={false}
          className="maxfinder-map dark-map"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={position} icon={reportLocationIcon} />
        </MapContainer>
      </div>
    </section>
  );
}
