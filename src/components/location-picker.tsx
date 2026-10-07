"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

import styles from "./location-picker.module.css";

type Coordinates = { latitude: number; longitude: number };

const LocationMap = dynamic(
  () => import("./location-map").then((module) => module.LocationMap),
  {
    ssr: false,
    loading: () => <div className={styles.mapLoading}>Loading map...</div>,
  },
);

export function LocationPicker({
  initialCoordinates,
  initialAddress = "",
}: {
  initialCoordinates?: Coordinates;
  initialAddress?: string;
}) {
  const [coordinates, setCoordinates] = useState<Coordinates | undefined>(
    initialCoordinates,
  );
  const [address, setAddress] = useState(initialAddress);
  const [isLookingUp, setIsLookingUp] = useState(false);

  async function selectLocation(nextCoordinates: Coordinates) {
    setCoordinates(nextCoordinates);
    setIsLookingUp(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${nextCoordinates.latitude}&lon=${nextCoordinates.longitude}`,
        { headers: { Accept: "application/json" } },
      );
      if (response.ok) {
        const result = (await response.json()) as { display_name?: string };
        setAddress(result.display_name ?? "");
      }
    } finally {
      setIsLookingUp(false);
    }
  }

  return (
    <>
      <p className={styles.helpText}>Tap the map to select where the pet was last seen.</p>
      <div className={styles.map}>
        <LocationMap
          center={
            initialCoordinates
              ? [initialCoordinates.latitude, initialCoordinates.longitude]
                : [33.749, -84.388]
          }
          zoom={initialCoordinates ? 15 : 11}
          coordinates={coordinates}
          onSelect={selectLocation}
          centerOnCurrentLocation={!initialCoordinates}
        />
      </div>
      {isLookingUp && <p className={styles.helpText}>Finding address...</p>}
      <input type="hidden" name="latitude" value={coordinates?.latitude ?? ""} />
      <input type="hidden" name="longitude" value={coordinates?.longitude ?? ""} />
      <label htmlFor="lastSeenLocation">Last seen location</label>
      <input
        id="lastSeenLocation"
        name="lastSeenLocation"
        value={address}
        onChange={(event) => setAddress(event.target.value)}
        placeholder="Select a point or enter an address"
        required
      />
    </>
  );
}
