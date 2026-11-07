"use client";

import { useEffect, useMemo } from "react";
import { Rectangle, useMap } from "react-leaflet";
import type { LatLngBoundsExpression } from "leaflet";

interface MapDensityGridProps {
  lostPetPoints: [number, number][];
  spottingPoints: [number, number][];
  enabled: boolean;
}

interface GridCell {
  bounds: LatLngBoundsExpression;
  lostCount: number;
  spottingCount: number;
}

function calculateGrid(
  points: [number, number][],
  cellSize: number,
): Map<string, { lat: number; lng: number; count: number }> {
  const grid = new Map<string, { lat: number; lng: number; count: number }>();

  for (const [lat, lng] of points) {
    const cellLat = Math.floor(lat / cellSize) * cellSize;
    const cellLng = Math.floor(lng / cellSize) * cellSize;
    const key = `${cellLat},${cellLng}`;

    const existing = grid.get(key);
    if (existing) {
      existing.count++;
    } else {
      grid.set(key, { lat: cellLat, lng: cellLng, count: 1 });
    }
  }

  return grid;
}

export function MapDensityGrid({
  lostPetPoints,
  spottingPoints,
  enabled,
}: MapDensityGridProps) {
  const map = useMap();

  console.log('MapDensityGrid - Lost pet points:', lostPetPoints.length);
  console.log('MapDensityGrid - Spotting points:', spottingPoints.length);
  console.log('MapDensityGrid - Enabled:', enabled);

  const cells = useMemo(() => {
    if (!enabled) return [];

    const cellSize = 2.0;
    const lostGrid = calculateGrid(lostPetPoints, cellSize);
    const spottingGrid = calculateGrid(spottingPoints, cellSize);

    console.log('MapDensityGrid - Lost grid cells:', lostGrid.size);
    console.log('MapDensityGrid - Spotting grid cells:', spottingGrid.size);

    const allKeys = new Set([...lostGrid.keys(), ...spottingGrid.keys()]);
    const result: GridCell[] = [];

    for (const key of allKeys) {
      const lostCell = lostGrid.get(key);
      const spottingCell = spottingGrid.get(key);

      if (lostCell || spottingCell) {
        const lat = lostCell?.lat ?? spottingCell!.lat;
        const lng = lostCell?.lng ?? spottingCell!.lng;
        const bounds: LatLngBoundsExpression = [
          [lat, lng],
          [lat + cellSize, lng + cellSize],
        ];

        result.push({
          bounds,
          lostCount: lostCell?.count ?? 0,
          spottingCount: spottingCell?.count ?? 0,
        });
      }
    }

    console.log('MapDensityGrid - Total cells to render:', result.length);
    console.log('MapDensityGrid - Sample cell counts:', result.map(c => c.lostCount + c.spottingCount).slice(0, 5));

    return result;
  }, [lostPetPoints, spottingPoints, enabled]);

  useEffect(() => {
    if (!enabled) return;
    if (typeof map.on !== "function") return;

    map.on("zoomend", () => {
      // Zoom handler removed - grid cells have static styling
    });

    return () => {
      if (typeof map.off === "function") {
        map.off("zoomend");
      }
    };
  }, [map, enabled]);

  if (!enabled) return null;

  return (
    <>
      {cells.map((cell, index) => {
        const totalCount = cell.lostCount + cell.spottingCount;
        const lostDominant = cell.lostCount > cell.spottingCount;

        let color: string;
        let fillOpacity: number;

        if (totalCount >= 8) {
          color = lostDominant ? "#d32f2f" : "#1976d2";
          fillOpacity = 0.75;
        } else if (totalCount >= 5) {
          color = lostDominant ? "#e57373" : "#42a5f5";
          fillOpacity = 0.7;
        } else if (totalCount >= 3) {
          color = lostDominant ? "#ef9a9a" : "#64b5f6";
          fillOpacity = 0.65;
        } else {
          color = lostDominant ? "#ffcdd2" : "#90caf9";
          fillOpacity = 0.6;
        }

        return (
          <Rectangle
            key={`${index}-${cell.bounds}`}
            bounds={cell.bounds}
            pathOptions={{
              color: color,
              fillColor: color,
              fillOpacity: fillOpacity,
              weight: 0,
              interactive: false,
            }}
            eventHandlers={{}}
          />
        );
      })}
    </>
  );
}
