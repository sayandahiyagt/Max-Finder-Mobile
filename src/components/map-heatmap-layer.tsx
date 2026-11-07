"use client";

import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";

type HeatmapPoint = [number, number, number];

interface HeatLayerOptions {
  radius?: number;
  blur?: number;
  maxZoom?: number;
  max?: number;
  gradient?: Record<string, string>;
}

declare module "leaflet" {
  interface HeatLayer extends Layer {
    addTo(map: Map): this;
  }

  function heatLayer(
    points: HeatmapPoint[],
    options?: HeatLayerOptions,
  ): HeatLayer;
}

interface MapHeatmapLayerProps {
  lostPetPoints: [number, number][];
  spottingPoints: [number, number][];
  enabled: boolean;
}

export function MapHeatmapLayer({
  lostPetPoints,
  spottingPoints,
  enabled,
}: MapHeatmapLayerProps) {
  const map = useMap();

  useEffect(() => {
    if (!enabled) return;
    if (typeof map.addLayer !== "function") return;

    const lostPetHeatPoints: HeatmapPoint[] = lostPetPoints.map((point) => [
      point[0],
      point[1],
      1,
    ]);

    const spottingHeatPoints: HeatmapPoint[] = spottingPoints.map((point) => [
      point[0],
      point[1],
      1,
    ]);

    const lostPetLayer =
      lostPetHeatPoints.length > 0
        ? L.heatLayer(lostPetHeatPoints, {
            radius: 30,
            blur: 15,
            maxZoom: 17,
            max: 1.0,
            gradient: {
              0.0: "rgba(0, 0, 255, 0)",
              0.2: "rgba(255, 200, 0, 0.3)",
              0.4: "rgba(255, 150, 0, 0.5)",
              0.6: "rgba(255, 100, 50, 0.6)",
              0.8: "rgba(255, 50, 50, 0.7)",
              1.0: "rgba(237, 114, 93, 0.8)",
            },
          })
        : null;

    const spottingLayer =
      spottingHeatPoints.length > 0
        ? L.heatLayer(spottingHeatPoints, {
            radius: 30,
            blur: 15,
            maxZoom: 17,
            max: 1.0,
            gradient: {
              0.0: "rgba(0, 0, 255, 0)",
              0.2: "rgba(100, 180, 255, 0.3)",
              0.4: "rgba(80, 160, 230, 0.5)",
              0.6: "rgba(70, 140, 210, 0.6)",
              0.8: "rgba(60, 130, 200, 0.7)",
              1.0: "rgba(79, 148, 208, 0.8)",
            },
          })
        : null;

    if (lostPetLayer) {
      lostPetLayer.addTo(map);
    }

    if (spottingLayer) {
      spottingLayer.addTo(map);
    }

    return () => {
      if (lostPetLayer && typeof map.removeLayer === "function") {
        map.removeLayer(lostPetLayer);
      }
      if (spottingLayer && typeof map.removeLayer === "function") {
        map.removeLayer(spottingLayer);
      }
    };
  }, [map, lostPetPoints, spottingPoints, enabled]);

  return null;
}
