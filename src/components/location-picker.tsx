"use client";

import L from "leaflet";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { getCurrentDeviceLocation } from "@/lib/geolocation";
import { parseReverseGeocodeLabel } from "@/lib/location-contract";
import { parseCoordinates } from "@/lib/coordinates";

import styles from "./location-picker.module.css";

const fallbackPosition: [number, number] = [40.7128, -74.006];
const locationIcon = L.divIcon({
  className: styles.marker,
  html: "<span></span>",
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

function MapInteraction({
  position,
  onChange,
}: {
  position: [number, number] | null;
  onChange: (position: [number, number]) => void;
}) {
  const map = useMap();

  useMapEvents({
    click(event) {
      onChange([event.latlng.lat, event.latlng.lng]);
    },
  });

  useEffect(() => {
    if (position) map.setView(position, map.getZoom(), { animate: true });
  }, [map, position]);

  return null;
}

export function LocationPickerFields({
  locationName = "locationLabel",
  latitudeName = "latitude",
  longitudeName = "longitude",
  initialLocationLabel,
  initialLatitude,
  initialLongitude,
}: {
  locationName?: string;
  latitudeName?: string;
  longitudeName?: string;
  initialLocationLabel?: string;
  initialLatitude?: string;
  initialLongitude?: string;
}) {
  const [position, setPosition] = useState<[number, number] | null>(() => {
    const coordinates = parseCoordinates(initialLatitude, initialLongitude);
    return coordinates
      ? [coordinates.latitude, coordinates.longitude]
      : null;
  });
  const [label, setLabel] = useState(
    initialLocationLabel ?? "Choose a point on the map.",
  );
  const [locationError, setLocationError] = useState<string | null>(null);
  const addressRequest = useRef(0);

  const updateAddress = async (nextPosition: [number, number]) => {
    const requestId = ++addressRequest.current;
    setLabel("Finding address…");
    try {
      const response = await fetch(
        `/api/geocode?lat=${nextPosition[0]}&lon=${nextPosition[1]}`,
      );
      if (!response.ok) throw new Error("Address lookup failed");
      const payload: unknown = await response.json();
      const address = parseReverseGeocodeLabel(payload);
      if (addressRequest.current === requestId)
        setLabel(address ?? "Address unavailable");
    } catch {
      if (addressRequest.current === requestId) setLabel("Address unavailable");
    }
  };

  useEffect(() => {
    return () => {
      addressRequest.current += 1;
    };
  }, []);

  const updatePosition = (nextPosition: [number, number]) => {
    setPosition(nextPosition);
    setLocationError(null);
    void updateAddress(nextPosition);
  };

  const useCurrentLocation = async () => {
    const requestId = ++addressRequest.current;
    setLocationError(null);
    try {
      const position = await getCurrentDeviceLocation();
      if (addressRequest.current === requestId) updatePosition(position);
    } catch {
      if (addressRequest.current === requestId)
        setLocationError(
          "Could not get device location. Select a map point instead.",
        );
    }
  };

  return (
    <div className={styles.picker}>
      <div className={styles.heading}>
        <div>
          <strong>Where did you see the pet?</strong>
          <span>Click the map to choose a point, or use device location.</span>
        </div>
        <span className={styles.status}>{label}</span>
      </div>
      <button
        className="secondary-button"
        type="button"
        onClick={useCurrentLocation}
      >
        Use my current location
      </button>
      {locationError && (
        <p className={`${styles.error} form-error`} role="status">
          {locationError}
        </p>
      )}
      <div className={styles.map}>
        <MapContainer
          center={position ?? fallbackPosition}
          zoom={14}
          scrollWheelZoom
          zoomControl
          className="maxfinder-map dark-map"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapInteraction position={position} onChange={updatePosition} />
          {position && (
            <Marker
              position={position}
              draggable
              icon={locationIcon}
              eventHandlers={{
                dragend(event) {
                  if (event.target instanceof L.Marker) {
                    const next = event.target.getLatLng();
                    updatePosition([next.lat, next.lng]);
                  }
                },
              }}
            />
          )}
        </MapContainer>
      </div>
      <div className={styles.values}>
        <label>
          Location address
          <input name={locationName} value={label} maxLength={255} readOnly />
        </label>
        <input
          name={latitudeName}
          type="hidden"
          value={position?.[0] ?? ""}
          readOnly
        />
        <input
          name={longitudeName}
          type="hidden"
          value={position?.[1] ?? ""}
          readOnly
        />
      </div>
    </div>
  );
}
