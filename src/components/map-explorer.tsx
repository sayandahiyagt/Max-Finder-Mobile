"use client";

import {
  CircleMarker,
  Circle,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMapEvents,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

export type MapFilters = {
  activityType: "all" | "lost" | "spotted";
  species: string;
  breed: string;
  timeRange: string;
};

type MapExplorerProps = {
  locationRequest?: number;
  onCountsChange?: (counts: { reports: number; spottings: number }) => void;
  onReportsChange?: (reports: MapReport[]) => void;
  onLocationChange?: (position: [number, number]) => void;
  searchLocation?: [number, number] | null;
  radiusMiles?: number | null;
  filters?: MapFilters;
};

export type MapReport = {
  id: string;
  type: "lost" | "spotted";
  name: string;
  species?: string | null;
  breed?: string | null;
  locationLabel?: string | null;
  imageUrl?: string | null;
  timestamp: string;
  time: string;
  position: [number, number];
};

const searchIcon = L.divIcon({
  className: "search-location-marker",
  html: "",
  iconSize: [10, 10],
  iconAnchor: [5, 5],
});

function matchesMapFilters(
  report: MapReport,
  filters: MapFilters,
  searchLocation: [number, number] | null,
  radiusMiles: number | null,
) {
  if (filters.activityType !== "all" && report.type !== filters.activityType) return false;
  if (filters.species && (report.species ?? "").toLowerCase() !== filters.species.toLowerCase()) return false;
  if (filters.breed && !(report.breed ?? "").toLowerCase().includes(filters.breed.toLowerCase())) return false;
  if (filters.timeRange !== "any") {
    const days = Number(filters.timeRange);
    if (Number.isFinite(days) && Date.now() - new Date(report.timestamp).getTime() > days * 86400000) {
      return false;
    }
  }
  if (searchLocation && radiusMiles !== null && Number.isFinite(radiusMiles) && radiusMiles > 0) {
    const [lat, lng] = searchLocation;
    const [reportLat, reportLng] = report.position;
    const earthRadius = 3958.8;
    const dLat = ((reportLat - lat) * Math.PI) / 180;
    const dLng = ((reportLng - lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat * Math.PI) / 180) *
        Math.cos((reportLat * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    const miles = earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    if (miles > radiusMiles) return false;
  }
  return true;
}

function ResizeMap() {
  const map = useMap();
  useEffect(() => {
    const timer = window.setTimeout(() => map.invalidateSize(), 100);
    return () => window.clearTimeout(timer);
  }, [map]);
  return null;
}

function CenterOnUser({
  request,
  onLocationChange,
}: {
  request: number;
  onLocationChange?: (position: [number, number]) => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const position: [number, number] = [coords.latitude, coords.longitude];
        map.setView(position, 14, {
          animate: true,
        });
        onLocationChange?.(position);
      },
      () => {
        // The default map area remains available when location is denied.
      },
      { enableHighAccuracy: false, maximumAge: 300000, timeout: 10000 },
    );
  }, [map, request, onLocationChange]);

  return null;
}

function CenterOnSearch({
  position,
}: {
  position: [number, number] | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (position) map.setView(position, 14, { animate: true });
  }, [map, position]);

  return null;
}

function BoundsWatcher({ onChange }: { onChange: (bounds: string) => void }) {
  useMapEvents({
    moveend(event) {
      const bounds = event.target.getBounds();
      onChange(
        `minLat=${bounds.getSouth()}&maxLat=${bounds.getNorth()}&minLng=${bounds.getWest()}&maxLng=${bounds.getEast()}`,
      );
    },
  });
  return null;
}

export default function MapExplorer({
  locationRequest = 0,
  onCountsChange,
  onReportsChange,
  onLocationChange,
  searchLocation = null,
  radiusMiles = null,
  filters = { activityType: "all", species: "", breed: "", timeRange: "any" },
}: MapExplorerProps) {
  const [bounds, setBounds] = useState(
    "minLat=40.68&maxLat=40.76&minLng=-74.06&maxLng=-73.96",
  );
  const [reports, setReports] = useState<MapReport[]>([]);
  const [mapError, setMapError] = useState<string | null>(null);
  const previousCountsRef = useRef<{ reports: number; spottings: number } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/map?${bounds}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Map request failed");
        return response.json() as Promise<{
          reports: MapReport[];
          spottings: MapReport[];
        }>;
      })
      .then((data) => {
        const loadedReports = [...data.reports, ...data.spottings];
        setMapError(null);
        setReports(loadedReports);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setReports([]);
        onReportsChange?.([]);
        onCountsChange?.({ reports: 0, spottings: 0 });
        setMapError("Map activity could not be loaded. Try again shortly.");
      });
    return () => controller.abort();
  }, [bounds, onCountsChange, onReportsChange]);

  const filteredReports = reports.filter((report) =>
    matchesMapFilters(report, filters, searchLocation, radiusMiles),
  );

  useEffect(() => {
    const nextCounts = {
      reports: filteredReports.filter((report) => report.type === "lost").length,
      spottings: filteredReports.filter((report) => report.type === "spotted").length,
    };

    if (previousCountsRef.current?.reports !== nextCounts.reports ||
        previousCountsRef.current?.spottings !== nextCounts.spottings) {
      previousCountsRef.current = nextCounts;
      onCountsChange?.(nextCounts);
    }

    onReportsChange?.(filteredReports);
  }, [filteredReports, onCountsChange, onReportsChange]);

  return (
    <MapContainer
      center={[40.718, -74.009]}
      zoom={14}
      scrollWheelZoom
      zoomControl
      className="maxfinder-map"
      aria-label="Map showing nearby lost pets and community spottings"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ResizeMap />
      <CenterOnUser request={locationRequest} onLocationChange={onLocationChange} />
      <CenterOnSearch position={searchLocation} />
      <BoundsWatcher onChange={setBounds} />
      {searchLocation && (
        <Marker
          position={searchLocation}
          icon={searchIcon}
        />
      )}
      {searchLocation && radiusMiles && (
        <Circle
          center={searchLocation}
          radius={radiusMiles * 1609.344}
          pathOptions={{
            color: "#198d68",
            fillColor: "#198d68",
            fillOpacity: 0.08,
            weight: 2,
            dashArray: "6 6",
          }}
        />
      )}
      {mapError && (
        <div className="map-error" role="status">
          {mapError}
        </div>
      )}
      {filteredReports.map((report) => (
        <CircleMarker
          key={report.id}
          center={report.position}
          radius={report.type === "lost" ? 11 : 9}
          pathOptions={{
            color: report.type === "lost" ? "#fff" : "#fff",
            fillColor: report.type === "lost" ? "#ed725d" : "#4f94d0",
            fillOpacity: 1,
            weight: 3,
          }}
        >
          <Popup>
            <div className="map-popup">
              {report.imageUrl ? (
                <img
                  className="map-popup-image"
                  src={report.imageUrl}
                  alt={`${report.type === "lost" ? "Lost pet" : "Spotted pet"} photo`}
                />
              ) : (
                <div className="map-popup-image-placeholder">No image available</div>
              )}
              <span className={`popup-badge ${report.type}`}>
                {report.type === "lost" ? "Lost pet" : "Spotting"}
              </span>
              {report.name && <strong>{report.name}</strong>}
              <span>{report.locationLabel ?? "Address unavailable"}</span>
              <small>{report.time}</small>
              <Link
                href={
                  report.type === "spotted"
                    ? `/spottings/${report.id}`
                    : `/lost-pets/reports/${report.id}`
                }
              >
                View details →
              </Link>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
