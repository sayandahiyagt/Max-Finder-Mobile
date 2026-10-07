"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";

import { PET_BREEDS } from "@/lib/pets";
import styles from "../app/protected-page.module.css";
import mapStyles from "./location-picker.module.css";

const SearchLocationMap = dynamic(
  () => import("./search-location-map").then((module) => module.SearchLocationMap),
  {
    ssr: false,
    loading: () => <div className={mapStyles.mapLoading}>Loading map...</div>,
  },
);

type SearchReport = {
  id: string;
  last_seen_at: string;
  last_seen_location: string;
  latitude: number | null;
  longitude: number | null;
  pet: {
    name: string;
    species: string;
    breed: string;
  } | null;
};

export function LostPetSearchResults({ reports }: { reports: SearchReport[] }) {
  const [species, setSpecies] = useState("");
  const [breed, setBreed] = useState("");
  const [time, setTime] = useState("");
  const [locationCoordinates, setLocationCoordinates] = useState<
    { latitude: number; longitude: number } | undefined
  >();
  const [radiusMiles, setRadiusMiles] = useState(10);

  const filteredReports = useMemo(() => {
    const normalizedBreed = breed.trim().toLowerCase();

    return reports.filter((report) => {
      const petBreed = report.pet?.breed.toLowerCase() ?? "";
      const isWithinRadius =
        !locationCoordinates ||
        (report.latitude !== null &&
          report.longitude !== null &&
          distanceInMiles(
            locationCoordinates.latitude,
            locationCoordinates.longitude,
            report.latitude,
            report.longitude,
          ) <= radiusMiles);

      return (
        (!species || report.pet?.species === species) &&
        (!normalizedBreed || petBreed.includes(normalizedBreed)) &&
        (!time || new Date(report.last_seen_at) >= new Date(time)) &&
        isWithinRadius
      );
    });
  }, [breed, locationCoordinates, radiusMiles, reports, species, time]);

  return (
    <>
      <div className={styles.searchFilters}>
        <label htmlFor="searchSpecies">Species</label>
        <select
          id="searchSpecies"
          value={species}
          onChange={(event) => {
            setSpecies(event.target.value);
            setBreed("");
          }}
        >
          <option value="">All species</option>
          <option value="dog">Dog</option>
          <option value="cat">Cat</option>
        </select>
        <label htmlFor="searchBreed">Breed</label>
        <select
          id="searchBreed"
          value={breed}
          onChange={(event) => setBreed(event.target.value)}
          disabled={!species}
        >
          <option value="">
            {species ? "All breeds" : "Select a species first"}
          </option>
          {species &&
            PET_BREEDS[species as "dog" | "cat"].map((petBreed) => (
              <option key={petBreed} value={petBreed}>
                {petBreed}
              </option>
            ))}
        </select>
        <label htmlFor="searchTime">Last seen since</label>
        <input
          id="searchTime"
          type="datetime-local"
          value={time}
          onChange={(event) => setTime(event.target.value)}
        />
        <label>Search near a map point</label>
        <p className={styles.filterHelp}>
          Tap the map to choose a center point, then select how far away to search.
        </p>
        <div className={mapStyles.map}>
          <SearchLocationMap
            coordinates={locationCoordinates}
            radiusMiles={radiusMiles}
            onSelect={setLocationCoordinates}
          />
        </div>
        <label htmlFor="searchRadius">Search radius</label>
        <select
          id="searchRadius"
          value={radiusMiles}
          onChange={(event) => setRadiusMiles(Number(event.target.value))}
        >
          {[1, 5, 10, 25, 50].map((miles) => (
            <option key={miles} value={miles}>
              Within {miles} miles
            </option>
          ))}
        </select>
        {locationCoordinates && (
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => setLocationCoordinates(undefined)}
          >
            Clear map location
          </button>
        )}
      </div>
      <div className={styles.searchSummary}>
        {filteredReports.length} {filteredReports.length === 1 ? "report" : "reports"} found
      </div>
      <div className={styles.reportList}>
        {filteredReports.length === 0 && (
          <div className={styles.emptyState}>
            <p>No lost pet reports match those filters.</p>
            <Link className={styles.helpLink} href="/faq">
              Need more help? View the FAQ and Atlanta shelter contacts.
            </Link>
          </div>
        )}
        {filteredReports.map((report) => (
          <Link
            className={styles.reportCard}
            href={`/lost-pets/reports/${report.id}`}
            key={report.id}
          >
            <img
              className={styles.reportPetImage}
              src={`/api/lost-pets/${report.id}/image`}
              alt="Lost pet"
            />
            <p>
              {report.pet?.species === "dog" ? "Dog" : "Cat"} ·{" "}
              {report.pet?.breed ?? "Breed unavailable"}
            </p>
            <p>Last seen: {report.last_seen_location}</p>
            <p>{new Date(report.last_seen_at).toLocaleString()}</p>
          </Link>
        ))}
      </div>
    </>
  );
}

function distanceInMiles(
  latitudeOne: number,
  longitudeOne: number,
  latitudeTwo: number,
  longitudeTwo: number,
) {
  const earthRadiusMiles = 3958.8;
  const latitudeDelta = toRadians(latitudeTwo - latitudeOne);
  const longitudeDelta = toRadians(longitudeTwo - longitudeOne);
  const latitudeOneRadians = toRadians(latitudeOne);
  const latitudeTwoRadians = toRadians(latitudeTwo);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(latitudeOneRadians) *
      Math.cos(latitudeTwoRadians) *
      Math.sin(longitudeDelta / 2) ** 2;

  return 2 * earthRadiusMiles * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}
