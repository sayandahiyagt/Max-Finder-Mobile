"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Eye, MapPin, PawPrint, Plus, Search, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { ReunionsCarousel } from "@/components/reunions-carousel";
import type { MapReport } from "@/components/map-explorer";
import styles from "./page.module.css";
import { breedOptions } from "@/lib/breeds";

const MapExplorer = dynamic(() => import("@/components/map-explorer"), {
  ssr: false,
  loading: () => <div className={styles.mapLoading}>Loading community map…</div>,
});

export default function Home() {
  const [activityCounts, setActivityCounts] = useState({
    reports: 0,
    spottings: 0,
  });
  const [communityStats, setCommunityStats] = useState<{
    lost: number;
    spottings: number;
    found: number;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    Array<{ latitude: number; longitude: number; label: string }>
  >([]);
  const [searchLocation, setSearchLocation] = useState<
    [number, number] | null
  >(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [activities, setActivities] = useState<MapReport[]>([]);
  const [activityType, setActivityType] = useState<"all" | "lost" | "spotted">("all");
  const [radius, setRadius] = useState("1");
  const [timeRange, setTimeRange] = useState("any");
  const [species, setSpecies] = useState("");
  const [breed, setBreed] = useState("");
  const [filterNow] = useState(() => Date.now());
  const availableBreeds = species === "Dog" || species === "Cat" ? breedOptions[species] : [];
  const updateActivityCounts = useCallback(
    (counts: { reports: number; spottings: number }) =>
      setActivityCounts(counts),
    [],
  );
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/stats", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Stats request failed");
        return response.json() as Promise<{
          lost: number;
          spottings: number;
          found: number;
        }>;
      })
      .then(setCommunityStats)
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setCommunityStats(null);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) {
      return undefined;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearchError(null);
      try {
        const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Search failed");
        const results = (await response.json()) as Array<{
          latitude: number;
          longitude: number;
          label: string;
        }>;
        setSearchResults(results);
        if (results[0]) {
          setSearchLocation([results[0].latitude, results[0].longitude]);
        }
        if (results.length === 0) setSearchError("No matching locations found.");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setSearchResults([]);
        setSearchError("Location search is temporarily unavailable.");
      } finally {
      }
    }, 300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery]);

  const filteredActivities = activities.filter((activity) => {
    if (activityType !== "all" && activity.type !== activityType) return false;
    if (species && (activity.species ?? "").toLowerCase() !== species.toLowerCase()) return false;
    if (breed && !(activity.breed ?? "").toLowerCase().includes(breed.toLowerCase())) return false;
    if (timeRange !== "any") {
      const days = Number(timeRange);
      if (filterNow - new Date(activity.timestamp).getTime() > days * 86400000) return false;
    }
    if (radius !== "any" && searchLocation) {
      const [lat, lng] = searchLocation;
      const [activityLat, activityLng] = activity.position;
      const earthRadius = 3959;
      const latDelta = ((activityLat - lat) * Math.PI) / 180;
      const lngDelta = ((activityLng - lng) * Math.PI) / 180;
      const a =
        Math.sin(latDelta / 2) ** 2 +
        Math.cos((lat * Math.PI) / 180) *
          Math.cos((activityLat * Math.PI) / 180) *
          Math.sin(lngDelta / 2) ** 2;
      const miles = earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      if (miles > Number(radius)) return false;
    }
    return true;
  });

  return (
    <AppShell active="Explore">
      <main className={styles.shell}>
      <section className={styles.hero} id="explore">
        <div>
          <p className={styles.eyebrow}>
            <ShieldCheck size={15} /> Community-powered pet recovery
          </p>
          <h1>Find lost pets in your area</h1>
          <p className={styles.heroCopy}>
            Explore nearby reports, share what you see, and help bring every
            pet home safely.
          </p>
        </div>
        <div className={styles.heroActions}>
          <Link className={styles.secondaryAction} href="/spottings/new">
            <Plus size={18} /> Report spotting
          </Link>
          <Link className={styles.primaryAction} href="/lost-pets/new">
            <PawPrint size={18} /> Report lost pet
          </Link>
        </div>
      </section>

      {communityStats && (
        <section className={styles.statsGrid} aria-label="Community recovery statistics">
          <div className={`${styles.statCard} ${styles.statCardLost}`}>
            <span className={styles.statIcon}><PawPrint size={17} /></span>
            <div><strong>{communityStats.lost}</strong><span>Active lost pets</span></div>
          </div>
          <div className={`${styles.statCard} ${styles.statCardSpotted}`}>
            <span className={styles.statIcon}><Eye size={17} /></span>
            <div><strong>{communityStats.spottings}</strong><span>Community spottings</span></div>
          </div>
          <div className={`${styles.statCard} ${styles.statCardFound}`}>
            <span className={styles.statIcon}><ShieldCheck size={17} /></span>
            <div><strong>{communityStats.found}</strong><span>Pets found</span></div>
          </div>
        </section>
      )}

      <section className={styles.explorer} aria-label="Lost pet map">
        <div className={styles.mapToolbar}>
          <div className={styles.searchForm}>
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
          </div>
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
            <select value={radius} onChange={(event) => setRadius(event.target.value)}>
              <option value="1">1 mile</option>
              <option value="5">5 miles</option>
              <option value="10">10 miles</option>
              <option value="25">25 miles</option>
            </select>
          </label>
        </div>
        <div className={styles.filterRow}>
          <p className={styles.mapStatus}>
            <span className={styles.activityCount}>
              <span className={styles.liveDot} /> {activityCounts.reports}{" "}
              {activityCounts.reports === 1 ? "active report" : "active reports"}
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
            onCountsChange={updateActivityCounts}
            onReportsChange={setActivities}
            onLocationChange={setSearchLocation}
            searchLocation={searchLocation}
            radiusMiles={Number(radius)}
          />
          <div className={styles.mapLegend}>
            <span><i className={styles.lostDot} /> Lost pet</span>
            <span><i className={styles.spottedDot} /> Spotting</span>
          </div>
        </div>
        <section className={styles.resultsSection} aria-label="Filter map activity">
          <div className={styles.resultsHeading}>
            <div>
              <p className={styles.eyebrow}>Nearby activity</p>
              <h2>Find the right match</h2>
            </div>
            <span className={styles.resultCount}>{filteredActivities.length} results</span>
          </div>
          <div className={styles.activityFilters}>
            <label>Type<select value={activityType} onChange={(event) => setActivityType(event.target.value as typeof activityType)}><option value="all">All activity</option><option value="lost">Lost pets</option><option value="spotted">Spottings</option></select></label>
            <label>Time<select value={timeRange} onChange={(event) => setTimeRange(event.target.value)}><option value="any">Any time</option><option value="1">Past 24 hours</option><option value="7">Past 7 days</option><option value="30">Past 30 days</option></select></label>
            <label>Species<select value={species} onChange={(event) => { setSpecies(event.target.value); setBreed(""); }}><option value="">Any species</option><option value="Dog">Dog</option><option value="Cat">Cat</option></select></label>
            <label>Breed<select value={breed} onChange={(event) => setBreed(event.target.value)} disabled={!species}><option value="">Any breed</option>{availableBreeds.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
          </div>
          {filteredActivities.length ? <div className={styles.activityCards}>{filteredActivities.map((activity) => <Link className={styles.activityCard} key={`${activity.type}-${activity.id}`} href={activity.type === "spotted" ? `/spottings/${activity.id}` : `/lost-pets/reports/${activity.id}`}>{activity.imageUrl ? <img className={styles.activityCardImage} src={activity.imageUrl} alt="" /> : <div className={styles.activityCardImagePlaceholder}>No image</div>}<div className={styles.activityCardBody}><span className={`${styles.cardBadge} ${activity.type === "lost" ? styles.cardBadgeLost : styles.cardBadgeSpotted}`}>{activity.type === "lost" ? "Lost pet" : "Spotting"}</span><small>{activity.locationLabel ?? "Address unavailable"}</small><small>{activity.time}</small><strong>View details →</strong></div></Link>)}</div> : <div className={styles.noResults}>No activity matches these filters.</div>}
        </section>
      </section>

      <ReunionsCarousel />

    </main>
    </AppShell>
  );
}
