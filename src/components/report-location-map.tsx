"use client";

import dynamic from "next/dynamic";

import styles from "./location-picker.module.css";

const LocationMap = dynamic(
  () => import("./location-map").then((module) => module.LocationMap),
  {
    ssr: false,
    loading: () => <div className={styles.mapLoading}>Loading map...</div>,
  },
);

export function ReportLocationMap({
  latitude,
  longitude,
}: {
  latitude: number;
  longitude: number;
}) {
  return (
    <div className={styles.reportMap}>
      <LocationMap
        center={[latitude, longitude]}
        zoom={15}
        coordinates={{ latitude, longitude }}
        onSelect={() => undefined}
      />
    </div>
  );
}
