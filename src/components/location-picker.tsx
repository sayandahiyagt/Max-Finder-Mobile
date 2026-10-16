"use client";

import L from "leaflet";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { useEffect, useState } from "react";
import "leaflet/dist/leaflet.css";

const fallbackPosition: [number, number] = [40.7128, -74.006];
const locationIcon = L.divIcon({
  className: "location-marker",
  html: "<span></span>",
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

function MapInteraction({
  position,
  onChange,
}: {
  position: [number, number];
  onChange: (position: [number, number]) => void;
}) {
  const map = useMap();

  useMapEvents({
    click(event) {
      onChange([event.latlng.lat, event.latlng.lng]);
    },
  });

  useEffect(() => {
    map.setView(position, map.getZoom(), { animate: true });
  }, [map, position]);

  return null;
}

export function LocationPicker() {
  return <LocationPickerFields />;
}

export function LocationPickerFields({
  locationName = "locationLabel",
  latitudeName = "latitude",
  longitudeName = "longitude",
}: {
  locationName?: string;
  latitudeName?: string;
  longitudeName?: string;
}) {
  const [position, setPosition] = useState(fallbackPosition);
  const [label, setLabel] = useState("Finding address…");

  const updateAddress = async (nextPosition: [number, number]) => {
    setLabel("Finding address…");
    try {
      const response = await fetch(`/api/geocode?lat=${nextPosition[0]}&lon=${nextPosition[1]}`);
      if (!response.ok) throw new Error("Address lookup failed");
      const result = (await response.json()) as { label?: string };
      setLabel(result.label ?? "Address unavailable");
    } catch {
      setLabel("Address unavailable");
    }
  };

  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const nextPosition: [number, number] = [coords.latitude, coords.longitude];
        setPosition(nextPosition);
        void updateAddress(nextPosition);
      },
      () => undefined,
      { enableHighAccuracy: false, maximumAge: 300000, timeout: 10000 },
    );
  }, []);

  const updatePosition = (nextPosition: [number, number]) => {
    setPosition(nextPosition);
    void updateAddress(nextPosition);
  };

  return (
    <div className="location-picker">
      <div className="location-picker-heading">
        <div>
          <strong>Where did you see the pet?</strong>
          <span>Drag the marker or click the map to adjust the location.</span>
        </div>
        <span className="location-picker-status">{label}</span>
      </div>
      <div className="location-picker-map">
        <MapContainer
          center={position}
          zoom={14}
          scrollWheelZoom
          zoomControl
          className="maxfinder-map"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapInteraction position={position} onChange={updatePosition} />
          <Marker
            position={position}
            draggable
            icon={locationIcon}
            eventHandlers={{
              dragend(event) {
                const marker = event.target as { getLatLng: () => { lat: number; lng: number } };
                const next = marker.getLatLng();
                updatePosition([next.lat, next.lng]);
              },
            }}
          />
        </MapContainer>
      </div>
      <div className="location-picker-values">
        <label>
          Location address
          <input
            name={locationName}
            value={label}
            maxLength={255}
            required
            readOnly
          />
        </label>
        <input name={latitudeName} type="hidden" value={position[0]} readOnly />
        <input name={longitudeName} type="hidden" value={position[1]} readOnly />
      </div>
    </div>
  );
}

export function CurrentDateTimeInput({
  name = "spottedAt",
  label = "Date and time spotted",
}: {
  name?: string;
  label?: string;
}) {
  const [value, setValue] = useState(() => {
    const now = new Date();
    const timezoneOffset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - timezoneOffset).toISOString().slice(0, 16);
  });

  return (
    <label className="form-field">
      {label}
      <input name={name} type="datetime-local" value={value} onChange={(event) => setValue(event.target.value)} required />
    </label>
  );
}

export default function SpottingLocationFields() {
  return (
    <>
      <CurrentDateTimeInput />
      <div className="form-field full">
        <LocationPicker />
      </div>
    </>
  );
}
