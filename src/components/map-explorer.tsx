"use client";

import {
  Circle,
  MapContainer,
  Marker,
  TileLayer,
  useMapEvents,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { MapReportMarker } from "@/components/map-report-marker";
import { MapDensityClusters } from "@/components/map-density-clusters";
import { parseMapActivity } from "@/features/search/map-contract";
import { getCurrentDeviceLocation } from "@/lib/geolocation";
import {
  defaultMapUiFilters,
  type MapExplorerProps,
  type MapPinCounts,
  type MapReport,
} from "@/features/search/types";

import styles from "./map-explorer.module.css";

const searchIcon = L.divIcon({
  className: styles.searchLocationMarker,
  html: "",
  iconSize: [10, 10],
  iconAnchor: [5, 5],
});

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
  onLocationError,
}: {
  request: number;
  onLocationChange?: (position: [number, number]) => void;
  onLocationError?: (message: string) => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (request === 0) return;
    let cancelled = false;
    void getCurrentDeviceLocation()
      .then((position) => {
        if (cancelled) return;
        map.setView(position, 14, {
          animate: true,
        });
        onLocationChange?.(position);
        onLocationError?.("");
      })
      .catch(() => {
        if (!cancelled)
          onLocationError?.(
            "Location permission was denied or unavailable. Search for a neighborhood or address instead.",
          );
      });
    return () => {
      cancelled = true;
    };
  }, [map, request, onLocationChange, onLocationError]);

  return null;
}

function CenterOnSearch({ position }: { position: [number, number] | null }) {
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
  onLocationChange,
  onLocationError,
  searchLocation = null,
  radiusMiles = null,
  filters = defaultMapUiFilters,
  heatmapEnabled = true,
}: MapExplorerProps) {
  const searchLatitude = searchLocation?.[0];
  const searchLongitude = searchLocation?.[1];
  const [bounds, setBounds] = useState(
    "minLat=40.68&maxLat=40.76&minLng=-74.06&maxLng=-73.96",
  );
  const [reports, setReports] = useState<MapReport[]>([]);
  const [mapError, setMapError] = useState<string | null>(null);
  const previousCountsRef = useRef<MapPinCounts | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams(bounds);
    params.set("activityType", filters.activityType);
    if (filters.species) params.set("species", filters.species);
    if (filters.breed) params.set("breed", filters.breed);
    if (filters.timeRange !== "any")
      params.set("timeRangeDays", filters.timeRange);
    if (
      searchLatitude !== undefined &&
      searchLongitude !== undefined &&
      radiusMiles !== null &&
      radiusMiles > 0
    ) {
      params.set("centerLatitude", String(searchLatitude));
      params.set("centerLongitude", String(searchLongitude));
      params.set("radiusMiles", String(radiusMiles));
    }

    fetch(`/api/map?${params}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Map request failed");
        const payload: unknown = await response.json();
        const pins = parseMapActivity(payload);
        if (!pins) throw new Error("Map response is invalid");
        return pins;
      })
      .then((loadedReports) => {
        setMapError(null);
        setReports(loadedReports);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        setReports([]);
        setMapError("Map activity could not be loaded. Try again shortly.");
      });
    return () => controller.abort();
  }, [
    bounds,
    filters.activityType,
    filters.breed,
    filters.species,
    filters.timeRange,
    onCountsChange,
    radiusMiles,
    searchLatitude,
    searchLongitude,
  ]);

  useEffect(() => {
    const nextCounts: MapPinCounts = {
      reports: reports.filter((report) => report.type === "lost").length,
      spottings: reports.filter((report) => report.type === "spotted").length,
    };

    if (
      previousCountsRef.current?.reports !== nextCounts.reports ||
      previousCountsRef.current?.spottings !== nextCounts.spottings
    ) {
      previousCountsRef.current = nextCounts;
      onCountsChange?.(nextCounts);
    }

  }, [reports, onCountsChange]);

  return (
    <MapContainer
      center={[40.718, -74.009]}
      zoom={14}
      scrollWheelZoom
      zoomControl
      className="maxfinder-map dark-map"
      aria-label="Map showing nearby lost pets and community spottings"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ResizeMap />
      <CenterOnUser
        request={locationRequest}
        {...(onLocationChange ? { onLocationChange } : {})}
        {...(onLocationError ? { onLocationError } : {})}
      />
      <CenterOnSearch position={searchLocation} />
      <BoundsWatcher onChange={setBounds} />
      {searchLocation && <Marker position={searchLocation} icon={searchIcon} />}
      {searchLocation && radiusMiles && (
        <Circle
          center={searchLocation}
          radius={radiusMiles * 1609.344}
          pathOptions={{
            color: "#62e0b0",
            fillColor: "#35b487",
            fillOpacity: 0.18,
            weight: 3,
            dashArray: "6 6",
          }}
        />
      )}
      {mapError && (
        <div className="map-error" role="status">
          {mapError}
        </div>
      )}
      {reports.map((report) => (
        <MapReportMarker key={report.id} report={report} />
      ))}
      <MapDensityClusters
        reports={reports}
        enabled={heatmapEnabled}
        minClusterSize={5}
        clusterRadiusMiles={7.5}
      />
    </MapContainer>
  );
}
