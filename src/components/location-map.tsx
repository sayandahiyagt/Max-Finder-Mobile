"use client";

import { CircleMarker, MapContainer, TileLayer, useMapEvents } from "react-leaflet";
import { useEffect } from "react";
import { useMap } from "react-leaflet";

type Coordinates = { latitude: number; longitude: number };

function MapClickHandler({
  onSelect,
}: {
  onSelect: (coordinates: Coordinates) => void;
}) {
  useMapEvents({
    click(event) {
      onSelect({ latitude: event.latlng.lat, longitude: event.latlng.lng });
    },
  });
  return null;
}

function CurrentLocationViewport({
  enabled,
  coordinates,
}: {
  enabled: boolean;
  coordinates?: Coordinates;
}) {
  const map = useMap();

  useEffect(() => {
    if (!enabled || coordinates || !navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        map.setView([position.coords.latitude, position.coords.longitude], 11);
      },
      () => undefined,
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    );
  }, [coordinates, enabled, map]);

  return null;
}

export function LocationMap({
  center,
  zoom,
  coordinates,
  onSelect,
  centerOnCurrentLocation = false,
}: {
  center: [number, number];
  zoom: number;
  coordinates?: Coordinates;
  onSelect: (coordinates: Coordinates) => void;
  centerOnCurrentLocation?: boolean;
}) {
  return (
    <MapContainer center={center} zoom={zoom} scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <CurrentLocationViewport
        enabled={centerOnCurrentLocation}
        coordinates={coordinates}
      />
      <MapClickHandler onSelect={onSelect} />
      {coordinates && (
        <CircleMarker
          center={[coordinates.latitude, coordinates.longitude]}
          radius={9}
          pathOptions={{ color: "#c62828", fillColor: "#c62828", fillOpacity: 0.85 }}
        />
      )}
    </MapContainer>
  );
}
