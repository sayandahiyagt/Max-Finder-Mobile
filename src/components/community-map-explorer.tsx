"use client";

import dynamic from "next/dynamic";
import { MapPin, Search } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { AdvancedMapFilters } from "@/components/advanced-map-filters";
import styles from "@/app/page.module.css";
import {
  isMapRadiusMiles,
  mapRadiusMiles,
  defaultMapUiFilters,
  type MapPinCounts,
  type MapRadiusMiles,
  type MapUiFilters,
} from "@/features/search/types";
import {
  parseLocationSearchResults,
  type LocationSearchResult,
} from "@/lib/location-contract";

const MapExplorer = dynamic(() => import("@/components/map-explorer"), {
  ssr: false,
  loading: () => (
    <div className={styles.mapLoading}>Loading community map…</div>
  ),
});

export function CommunityMapExplorer() {
  const [activityCounts, setActivityCounts] = useState<MapPinCounts>({
    reports: 0,
    spottings: 0,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<LocationSearchResult[]>([]);
  const [searchLocation, setSearchLocation] = useState<[number, number] | null>(
    null,
  );
  const [locationRequest, setLocationRequest] = useState(0);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const searchController = useRef<AbortController | null>(null);
  const [filters, setFilters] = useState<MapUiFilters>(defaultMapUiFilters);
  const [radius, setRadius] = useState<MapRadiusMiles>(1);
  const [heatmapEnabled, setHeatmapEnabled] = useState(true);
  useEffect(() => {
    return () => searchController.current?.abort();
  }, []);
  const updateActivityCounts = useCallback(
    (counts: MapPinCounts) =>
      setActivityCounts((previous) =>
        previous.reports === counts.reports &&
        previous.spottings === counts.spottings
          ? previous
          : counts,
      ),
    [],
  );
  const searchForLocation = async () => {
    searchController.current?.abort();
    searchController.current = null;
    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchResults([]);
      setSearchError("Enter at least two characters.");
      setIsSearching(false);
      return;
    }

    const controller = new AbortController();
    searchController.current = controller;
    setIsSearching(true);
    setSearchError(null);
    try {
      const response = await fetch(
        `/api/geocode?q=${encodeURIComponent(query)}`,
        {
          signal: controller.signal,
        },
      );
      if (!response.ok) throw new Error("Search failed");
      const value: unknown = await response.json();
      const results = parseLocationSearchResults(value);
      setSearchResults(results);
      if (results.length === 0) setSearchError("No matching locations found.");
    } catch {
      if (controller.signal.aborted) return;
      setSearchResults([]);
      setSearchError("Location search is temporarily unavailable.");
    } finally {
      if (searchController.current === controller) {
        searchController.current = null;
        setIsSearching(false);
      }
    }
  };
  return (
    <section className={styles.explorer} aria-label="Lost pet map">
      <div className={styles.mapToolbar}>
        <form
          className={styles.searchForm}
          onSubmit={(event) => {
            event.preventDefault();
            void searchForLocation();
          }}
        >
          <label className={styles.searchBox}>
            <Search size={18} />
            <input
              value={searchQuery}
              onChange={(event) => {
                const value = event.target.value;
                setSearchQuery(value);
                if (value.trim().length < 2) {
                  setSearchResults([]);
                  setSearchError(null);
                }
              }}
              placeholder="Search a neighborhood or address"
              aria-label="Search a neighborhood or address"
            />
          </label>
          <button
            className={styles.locationButton}
            type="submit"
            disabled={isSearching}
          >
            {isSearching ? "Searching…" : "Search"}
          </button>
        </form>
        {(searchResults.length > 0 || searchError) && (
          <div className={styles.searchResults}>
            {searchResults.map((result) => (
              <button
                type="button"
                key={`${result.latitude}-${result.longitude}-${result.label}`}
                onClick={() => {
                  setSearchLocation([result.latitude, result.longitude]);
                  setSearchQuery(result.label);
                  setSearchResults([]);
                  setSearchError(null);
                }}
              >
                <MapPin size={15} />
                <span>{result.label}</span>
              </button>
            ))}
            {searchError && <p role="status">{searchError}</p>}
          </div>
        )}
        <label className={styles.radiusControl}>
          Radius
          <select
            value={radius}
            onChange={(event) => {
              const miles = Number(event.target.value);
              if (isMapRadiusMiles(miles)) setRadius(miles);
            }}
          >
            {mapRadiusMiles.map((miles) => (
              <option key={miles} value={miles}>
                {miles} {miles === 1 ? "mile" : "miles"}
              </option>
            ))}
          </select>
        </label>
        <button
          className={styles.locationButton}
          type="button"
          onClick={() => {
            setSearchError(null);
            setLocationRequest((request) => request + 1);
          }}
        >
          <MapPin size={16} /> Use my location
        </button>
      </div>
      <div className={styles.filterRow}>
        <p className={styles.mapStatus}>
          <span className={styles.activityCount}>
            <span className={styles.liveDot} /> {activityCounts.reports}{" "}
            {activityCounts.reports === 1
              ? "active report"
              : "active reports"}
          </span>
          <span className={styles.activityDivider}>·</span>
          <span className={styles.activityCount}>
            <span className={styles.spottingStatusDot} />{" "}
            {activityCounts.spottings}{" "}
            {activityCounts.spottings === 1 ? "spotting" : "spottings"}
          </span>
        </p>
      </div>
      <div className={styles.mapFrame}>
        <MapExplorer
          locationRequest={locationRequest}
          onCountsChange={updateActivityCounts}
          onLocationChange={setSearchLocation}
          onLocationError={setSearchError}
          searchLocation={searchLocation}
          radiusMiles={searchLocation ? radius : null}
          filters={filters}
          heatmapEnabled={heatmapEnabled}
        />
        <div className={styles.mapLegend}>
          <span>
            <i className={styles.lostDot} /> Lost pet
          </span>
          <span>
            <i className={styles.spottedDot} /> Spotting
          </span>
          <label className={styles.heatmapToggle}>
            <input
              type="checkbox"
              checked={heatmapEnabled}
              onChange={(e) => setHeatmapEnabled(e.target.checked)}
              aria-label="Toggle density overlay"
            />
            <span>Density overlay</span>
          </label>
        </div>
      </div>
      <AdvancedMapFilters filters={filters} onChange={setFilters} />
    </section>
  );
}
