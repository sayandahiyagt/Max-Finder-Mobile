"use client";

import { useEffect } from "react";
import { Circle, CircleMarker, MapContainer, TileLayer, useMapEvents } from "react-leaflet";
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

function MapViewport({ coordinates }: { coordinates?: Coordinates }) {
  const map = useMap();

  useEffect(() => {
    if (coordinates) {
      map.setView([coordinates.latitude, coordinates.longitude], 11);
      return;
    }

    if (!navigator.geolocation) {
      map.setView([33.749, -84.388], 11);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        map.setView([position.coords.latitude, position.coords.longitude], 11);
      },
      () => {
        map.setView([33.749, -84.388], 11);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    );
  }, [coordinates, map]);

  return null;
}

export function SearchLocationMap({
  coordinates,
  radiusMiles,
  onSelect,
}: {
  coordinates?: Coordinates;
  radiusMiles: number;
  onSelect: (coordinates: Coordinates) => void;
}) {
  const center: [number, number] = coordinates
    ? [coordinates.latitude, coordinates.longitude]
    : [33.749, -84.388];

  return (
    <MapContainer center={center} zoom={11} scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapViewport coordinates={coordinates} />
      <MapClickHandler onSelect={onSelect} />
      {coordinates && (
        <>
          <Circle
            center={center}
            radius={radiusMiles * 1609.344}
            pathOptions={{ color: "#1f7a4d", fillColor: "#1f7a4d", fillOpacity: 0.12 }}
          />
          <CircleMarker
            center={center}
            radius={9}
            pathOptions={{ color: "#1f7a4d", fillColor: "#1f7a4d", fillOpacity: 0.9 }}
          />
        </>
      )}
    </MapContainer>
  );
}
