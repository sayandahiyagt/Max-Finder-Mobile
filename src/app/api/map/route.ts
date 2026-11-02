import { NextRequest, NextResponse } from "next/server";

import { searchMapActivity } from "@/features/search/application";
import type {
  MapReport,
  MapSearchReport,
  MapSearchSpotting,
} from "@/features/search/types";
import { formatStoredLocationLabel } from "@/lib/location-contract";
import {
  getPetImageUrls,
  getPublicImageUrl,
} from "@/lib/supabase/storage";
import { parseMapRequest } from "./request";

function mapLostReport(
  report: MapSearchReport,
  imageUrl: string | null,
): MapReport {
  return {
    id: report.id,
    type: "lost",
    name: report.petName,
    species: report.species,
    breed: report.breed,
    locationLabel: formatStoredLocationLabel(report.locationLabel),
    imageUrl,
    timestamp: report.lastSeenAt.toISOString(),
    position: [report.latitude, report.longitude],
  };
}

function mapSpotting(spotting: MapSearchSpotting): MapReport {
  return {
    id: spotting.id,
    type: "spotted",
    name: "",
    species: spotting.species,
    breed: spotting.breed,
    locationLabel: formatStoredLocationLabel(spotting.locationLabel),
    imageUrl: getPublicImageUrl("spotting-images", spotting.imagePath),
    timestamp: spotting.spottedAt.toISOString(),
    position: [spotting.latitude, spotting.longitude],
  };
}

export async function GET(request: NextRequest) {
  const parsed = parseMapRequest(request.nextUrl.searchParams);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const activity = await searchMapActivity(
      parsed.value.bounds,
      parsed.value.filters,
    );
    const reportImageUrls = await getPetImageUrls(
      activity.reports.map((report) => report.imagePath),
    );
    return NextResponse.json({
      reports: activity.reports.map((report, index) =>
        mapLostReport(report, reportImageUrls[index] ?? null),
      ),
      spottings: activity.spottings.map(mapSpotting),
    });
  } catch {
    return NextResponse.json(
      { error: "Map activity is temporarily unavailable." },
      { status: 503 },
    );
  }
}
