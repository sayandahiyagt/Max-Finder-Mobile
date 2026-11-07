"use client";

import { useEffect, useMemo, useState } from "react";
import { Polygon, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import type { LatLngExpression, LatLngBoundsExpression } from "leaflet";
import Link from "next/link";
import { LocalizedDateTime } from "@/components/localized-date-time";
import type { MapReport } from "@/features/search/types";
import { distanceInMiles } from "@/lib/coordinates";
import styles from "./map-explorer.module.css";

interface ClusterPoint {
  lat: number;
  lng: number;
  type: "lost" | "spotted";
  report: MapReport;
}

interface Cluster {
  points: ClusterPoint[];
  center: [number, number];
  bounds: LatLngBoundsExpression;
  lostCount: number;
  spottingCount: number;
  radiusMiles: number;
}

interface MapDensityClustersProps {
  reports: MapReport[];
  enabled: boolean;
  onClusterClick?: (cluster: Cluster) => void;
  minClusterSize?: number;
  clusterRadiusMiles?: number;
}

const DEFAULT_MIN_CLUSTER_SIZE = 5;
const DEFAULT_CLUSTER_RADIUS_MILES = 7.5;
const EARTH_RADIUS_MILES = 3958.8;

/**
 * Simple DBSCAN-like clustering for geographic points
 * Groups points that are within clusterRadiusMiles of each other
 */
function clusterPoints(
  points: ClusterPoint[],
  radiusMiles: number,
  minPoints: number,
): Cluster[] {
  if (points.length < minPoints) return [];

  const visited = new Set<number>();
  const clusters: Cluster[] = [];

  function getNeighbors(index: number): number[] {
    const neighbors: number[] = [];
    const point = points[index];
    if (!point) return neighbors;
    for (let i = 0; i < points.length; i++) {
      if (i === index) continue;
      const other = points[i];
      if (!other) continue;
      const dist = distanceInMiles(
        { latitude: point.lat, longitude: point.lng },
        { latitude: other.lat, longitude: other.lng },
        EARTH_RADIUS_MILES,
      );
      if (dist <= radiusMiles) {
        neighbors.push(i);
      }
    }
    return neighbors;
  }

  function expandCluster(index: number, neighbors: number[]): ClusterPoint[] {
    const initialPoint = points[index];
    if (!initialPoint) return [];
    const clusterPoints: ClusterPoint[] = [initialPoint];
    const seeds = [...neighbors];

    for (const seedIndex of seeds) {
      if (visited.has(seedIndex)) continue;
      visited.add(seedIndex);
      const seedNeighbors = getNeighbors(seedIndex);
      if (seedNeighbors.length >= minPoints - 1) {
        seeds.push(...seedNeighbors);
      }
      const seedPoint = points[seedIndex];
      if (seedPoint) clusterPoints.push(seedPoint);
    }

    return clusterPoints;
  }

  for (let i = 0; i < points.length; i++) {
    if (visited.has(i)) continue;
    visited.add(i);

    const neighbors = getNeighbors(i);
    if (neighbors.length >= minPoints - 1) {
      const clusterPoints = expandCluster(i, neighbors);
      if (clusterPoints.length >= minPoints) {
        clusters.push(createCluster(clusterPoints));
      }
    }
  }

  return clusters;
}

function createCluster(points: ClusterPoint[]): Cluster {
  const lostCount = points.filter((p) => p.type === "lost").length;
  const spottingCount = points.filter((p) => p.type === "spotted").length;

  // Calculate center as average of all points
  const centerLat = points.reduce((sum, p) => sum + p.lat, 0) / points.length;
  const centerLng = points.reduce((sum, p) => sum + p.lng, 0) / points.length;
  const center: [number, number] = [centerLat, centerLng];

  // Calculate radius as max distance from center
  let maxDist = 0;
  for (const point of points) {
    const dist = distanceInMiles(
      { latitude: centerLat, longitude: centerLng },
      { latitude: point.lat, longitude: point.lng },
      EARTH_RADIUS_MILES,
    );
    maxDist = Math.max(maxDist, dist);
  }

  // Add a small buffer for visual padding
  const radiusMiles = maxDist + 0.5;

  // Calculate bounds for the cluster
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  // Create organic polygon bounds (slightly expanded)
  const latBuffer = (maxLat - minLat) * 0.15 + 0.01;
  const lngBuffer = (maxLng - minLng) * 0.15 + 0.01;
  const bounds: LatLngBoundsExpression = [
    [minLat - latBuffer, minLng - lngBuffer],
    [maxLat + latBuffer, maxLng + lngBuffer],
  ];

  return {
    points,
    center,
    bounds,
    lostCount,
    spottingCount,
    radiusMiles,
  };
}

/**
 * Generate organic polygon points around cluster center using concave hull approximation
 */
function generateClusterPolygon(
  cluster: Cluster,
): LatLngExpression[] {
  const { points, center, radiusMiles } = cluster;

  // Convert radius from miles to degrees (approximate)
  const radiusDeg = radiusMiles / 69.0;

  // Create points in a circle around the center, perturbed by actual point positions
  const numSegments = Math.max(12, Math.min(32, points.length * 3));
  const polygonPoints: LatLngExpression[] = [];

  for (let i = 0; i < numSegments; i++) {
    const angle = (i / numSegments) * Math.PI * 2;

    // Find points in this direction
    const directionPoints = points.filter((p) => {
      const pointAngle = Math.atan2(p.lat - center[0], p.lng - center[1]);
      const diff = Math.abs(pointAngle - angle);
      return diff < Math.PI / numSegments * 1.5 || diff > Math.PI * 2 - Math.PI / numSegments * 1.5;
    });

    let radius = radiusDeg;
    if (directionPoints.length > 0) {
      // Use actual furthest point in this direction
      const maxDist = Math.max(...directionPoints.map((p) =>
        Math.sqrt(Math.pow(p.lat - center[0], 2) + Math.pow(p.lng - center[1], 2))
      ));
      radius = Math.max(radius, maxDist * 1.2);
    }

    const lat = center[0] + radius * Math.cos(angle);
    const lng = center[1] + radius * Math.sin(angle);
    polygonPoints.push([lat, lng]);
  }

  // Close the polygon
  if (polygonPoints.length > 0) {
    const firstPoint = polygonPoints[0];
    if (firstPoint) polygonPoints.push(firstPoint);
  }

  return polygonPoints;
}

// CSS class names for popup styling
export function MapDensityClusters({
  reports,
  enabled,
  onClusterClick,
  minClusterSize = DEFAULT_MIN_CLUSTER_SIZE,
  clusterRadiusMiles = DEFAULT_CLUSTER_RADIUS_MILES,
}: MapDensityClustersProps) {
  const map = useMap();
  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null);
  const [selectedReportType, setSelectedReportType] = useState<
    "lost" | "spotted" | "all" | null
  >(null);

  const allPoints = useMemo((): ClusterPoint[] => {
    return reports.map((report) => ({
      lat: report.position[0],
      lng: report.position[1],
      type: report.type,
      report,
    }));
  }, [reports]);

  const clusters = useMemo((): Cluster[] => {
    if (!enabled || allPoints.length < minClusterSize) {
      return [];
    }
    return clusterPoints(allPoints, clusterRadiusMiles, minClusterSize);
  }, [allPoints, enabled, minClusterSize, clusterRadiusMiles]);

  // Handle map click to close popup
  useEffect(() => {
    if (typeof map.on !== "function" || typeof map.off !== "function") return;
    const handleClick = () => setSelectedCluster(null);
    map.on("click", handleClick);
    return () => {
      map.off("click", handleClick);
    };
  }, [map]);

  const getClusterColor = (cluster: Cluster) => {
    const totalCount = cluster.lostCount + cluster.spottingCount;
    const lostDominant = cluster.lostCount >= cluster.spottingCount;

    if (totalCount >= 15) {
      return lostDominant ? "#b71c1c" : "#0d47a1";
    } else if (totalCount >= 10) {
      return lostDominant ? "#c62828" : "#1565c0";
    } else if (totalCount >= 5) {
      return lostDominant ? "#d32f2f" : "#1976d2";
    }
    return lostDominant ? "#e57373" : "#42a5f5";
  };

  const getClusterFillOpacity = (cluster: Cluster) => {
    const totalCount = cluster.lostCount + cluster.spottingCount;
    if (totalCount >= 15) return 0.45;
    if (totalCount >= 10) return 0.4;
    if (totalCount >= 5) return 0.35;
    return 0.3;
  };

  const getClusterLabel = (cluster: Cluster) => {
    const { lostCount, spottingCount } = cluster;
    const total = lostCount + spottingCount;

    if (lostCount >= 5 && spottingCount >= 5) {
      return `High activity area: ${lostCount} lost reports & ${spottingCount} spottings`;
    } else if (lostCount >= spottingCount * 2 && lostCount >= 5) {
      return `${lostCount} lost pet reports in this area`;
    } else if (spottingCount >= lostCount * 2 && spottingCount >= 5) {
      return `${spottingCount} spottings in this area`;
    } else if (lostCount > spottingCount) {
      return `${lostCount} lost report${lostCount !== 1 ? "s" : ""} & ${spottingCount} spotting${spottingCount !== 1 ? "s" : ""}`;
    } else if (spottingCount > lostCount) {
      return `${spottingCount} spotting${spottingCount !== 1 ? "s" : ""} & ${lostCount} lost report${lostCount !== 1 ? "s" : ""}`;
    } else {
      return `${total} reports & spottings`;
    }
  };

  const handlePolygonClick = (cluster: Cluster, event: L.LeafletMouseEvent) => {
    event.originalEvent.stopPropagation();
    setSelectedCluster(cluster);
    setSelectedReportType(null);
    onClusterClick?.(cluster);
  };

  if (!enabled || clusters.length === 0) return null;

  return (
    <>
      {clusters.map((cluster, index) => {
        const color = getClusterColor(cluster);
        const fillOpacity = getClusterFillOpacity(cluster);
        const polygonPoints = generateClusterPolygon(cluster);
        const isSelected = selectedCluster?.center[0] === cluster.center[0] &&
                          selectedCluster?.center[1] === cluster.center[1];

        return (
          <Polygon
            key={`cluster-${index}-${cluster.center[0]}-${cluster.center[1]}`}
            positions={polygonPoints}
            pathOptions={{
              color: isSelected ? "#fff" : color,
              fillColor: color,
              fillOpacity: isSelected ? fillOpacity + 0.1 : fillOpacity,
              weight: isSelected ? 3 : 1.5,
              dashArray: isSelected ? "6 3" : undefined,
              interactive: true,
              bubblingMouseEvents: false, // Don't bubble to map
            }}
            eventHandlers={{
              click: (e) => handlePolygonClick(cluster, e as L.LeafletMouseEvent),
              mouseover: () => {
                // Could add hover effect here
              },
            }}
          >
            {isSelected && (
              <Popup
                position={cluster.center}
                autoClose={false}
                closeOnClick={false}
                className={styles.densityClusterPopup}
              >
                <div className={styles.clusterPopupContent}>
                  <div className={styles.clusterPopupHeader}>
                    <span className={styles.clusterPopupType}>
                      {cluster.lostCount >= cluster.spottingCount ? "🔴 Lost Reports" : "🔵 Spottings"}
                    </span>
                  </div>
                  <div className={styles.clusterPopupStats}>
                    <button
                      className={styles.clusterStatButton}
                      type="button"
                      disabled={cluster.lostCount === 0}
                      aria-label={`Show ${cluster.lostCount} lost pet reports`}
                      aria-pressed={selectedReportType === "lost"}
                      onClick={() => setSelectedReportType("lost")}
                    >
                      <span className={styles.clusterStat}>
                        <span className={styles.clusterStatValue}>{cluster.lostCount}</span>
                        <span className={styles.clusterStatLabel}>Lost Reports</span>
                      </span>
                    </button>
                    <button
                      className={styles.clusterStatButton}
                      type="button"
                      disabled={cluster.spottingCount === 0}
                      aria-label={`Show ${cluster.spottingCount} spottings`}
                      aria-pressed={selectedReportType === "spotted"}
                      onClick={() => setSelectedReportType("spotted")}
                    >
                      <span className={styles.clusterStat}>
                        <span className={styles.clusterStatValue}>{cluster.spottingCount}</span>
                        <span className={styles.clusterStatLabel}>Spottings</span>
                      </span>
                    </button>
                    <button
                      className={styles.clusterStatButton}
                      type="button"
                      aria-label={`Show all ${cluster.lostCount + cluster.spottingCount} reports and spottings`}
                      aria-pressed={selectedReportType === "all"}
                      onClick={() => setSelectedReportType("all")}
                    >
                      <span className={`${styles.clusterStat} ${styles.clusterStatTotal}`}>
                        <span className={styles.clusterStatValue}>{cluster.lostCount + cluster.spottingCount}</span>
                        <span className={styles.clusterStatLabel}>Total Activity</span>
                      </span>
                    </button>
                  </div>
                  <div className={styles.clusterPopupDescription}>
                    {getClusterLabel(cluster)}
                  </div>
                  <div className={styles.clusterPopupRadius}>
                    ~{cluster.radiusMiles.toFixed(1)} mi radius
                  </div>
                  {selectedReportType && (
                    <div className={styles.clusterReportSection}>
                      <h3 className={styles.clusterReportHeading}>
                        {selectedReportType === "lost"
                          ? "Lost pet reports"
                          : selectedReportType === "spotted"
                            ? "Spottings"
                            : "All activity"}
                      </h3>
                      <ul className={styles.clusterReportList}>
                        {cluster.points
                          .filter(
                            ({ type }) =>
                              selectedReportType === "all" ||
                              selectedReportType === type,
                          )
                          .map(({ report }) => (
                            <li key={`${report.type}-${report.id}`}>
                              <Link
                                className={styles.clusterReportLink}
                                href={
                                  report.type === "lost"
                                    ? `/lost-pets/reports/${report.id}`
                                    : `/spottings/${report.id}`
                                }
                              >
                                <strong>
                                  {report.name || `${report.species ?? "Pet"} spotting`}
                                </strong>
                                <span>
                                  {report.type === "lost" ? "Lost pet report" : "Spotting"}
                                  {report.species ? ` · ${report.species}` : ""}
                                  {report.breed ? ` · ${report.breed}` : ""}
                                </span>
                                <span>{report.locationLabel ?? "Address unavailable"}</span>
                                <small>
                                  <LocalizedDateTime value={report.timestamp} />
                                </small>
                              </Link>
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}
                </div>
              </Popup>
            )}
          </Polygon>
        );
      })}
    </>
  );
}
